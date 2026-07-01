// ai-vision-symptom — describe OBSERVABLE features in a pet symptom photo (stool,
// skin, ear, eye, teeth). It never diagnoses, scores, or judges urgency: the model
// only observes, and this function's DETERMINISTIC rules (assessInput on the notes
// + a fixed observed-red-flag map) decide routing. Output is always needs_review
// and hands off to the rule-based guided triage. A photo reads surface appearance
// only — it can't detect infection, parasites, or anything internal.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { SYMPTOM_VISION_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { symptomObservationSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { assessInput, reviewOutput } from "../_shared/safety.ts";
import { docContentPart, fetchAsDataUrl, guessMime } from "../_shared/files.ts";
import type { ContentPart } from "../_shared/provider.ts";

const AREAS = ["poop", "skin", "ear", "eye", "teeth"] as const;
const AREA_LABEL: Record<string, string> = {
  poop: "stool / poop",
  skin: "skin or coat",
  ear: "ear",
  eye: "eye",
  teeth: "teeth or gums",
};

// Any clearly-observed red flag routes to a vet NOW. The model observes; this
// deterministic map — not the model — decides urgency. Over-routing is the safe
// failure mode; a photo can never rule an emergency out.
const VISUAL_EMERGENCY_BANNER =
  "The photo may show a sign that needs prompt veterinary attention. Contact your veterinarian or an emergency clinic now — a photo can't rule this out.";

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const imagePath = typeof body.imagePath === "string" ? body.imagePath : "";
    const petId = typeof body.petId === "string" ? body.petId : null;
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";
    const rawArea = typeof body.area === "string" ? body.area : "";
    const area = (AREAS as readonly string[]).includes(rawArea) ? rawArea : "";
    if (!imagePath) return { ok: false, error: "Missing image." };
    if (!area) return { ok: false, error: "Unsupported scan area." };
    if (!imagePath.startsWith(`${ctx.caller.userId}/`)) {
      return { ok: false, error: "You can only read your own photos." };
    }

    const { mime, kind } = guessMime(imagePath);
    if (kind !== "image") return { ok: false, error: "Please use a photo (JPG/PNG)." };
    const signed = await ctx.svc.storage.from("documents").createSignedUrl(imagePath, 120);
    if (signed.error || !signed.data?.signedUrl) return { ok: false, error: "Couldn't open the photo." };
    const dataUrl = await fetchAsDataUrl(signed.data.signedUrl, mime);
    if (!dataUrl) return { ok: false, error: "The photo is too large or unreadable." };
    const part = docContentPart(dataUrl, "image", "symptom");
    if (!part) return { ok: false, error: "Unsupported image." };

    // Deterministic FIRST — the model can never lower this routing.
    const textAssess = assessInput(notes);

    const userContent: ContentPart[] = [
      {
        type: "input_text",
        text:
          `This is a photo of the pet's ${AREA_LABEL[area]}. Describe only what is visible; do not diagnose, score, or judge urgency.` +
          (notes ? ` Owner notes (context only, do not repeat as fact): ${notes}` : ""),
      },
      part,
    ];

    const result = await ctx.provider.generate({
      model: MODELS.vision(),
      input: [
        { role: "system", content: [{ type: "input_text", text: SYMPTOM_VISION_PROMPT }] },
        { role: "user", content: userContent },
      ],
      jsonSchema: symptomObservationSchema,
      maxOutputTokens: 900,
      temperature: 0,
    });

    const parsed = (result.parsed ?? {}) as Record<string, unknown>;
    parsed.area = area; // trust the caller's area, not the model
    const observations = Array.isArray(parsed.observations) ? (parsed.observations as { feature?: string; value?: string }[]) : [];
    const observed = (Array.isArray(parsed.observedRedFlags) ? (parsed.observedRedFlags as string[]) : []).filter(
      (f) => f && f !== "none",
    );

    // Defensive: the schema forbids diagnosis/score fields, but the free-text
    // summary could still slip a forbidden claim. Scan it and neutralize.
    const obsText = observations.map((o) => `${o.feature ?? ""} ${o.value ?? ""}`).join(" ");
    const review = reviewOutput(`${parsed.summary ?? ""} ${obsText}`);
    const flags = [...textAssess.flags];
    if (!review.ok) {
      parsed.summary =
        "Photo observations recorded for review. Continue the guided check and share the photo with your vet.";
      flags.push(...review.flags, "output_neutralized");
    }

    // Observed red flags → deterministic emergency routing (server rule, not model).
    const hasVisualRedFlag = observed.length > 0;
    if (hasVisualRedFlag) flags.push("observed_red_flag");
    const routing = textAssess.routing ?? (hasVisualRedFlag ? "emergency_vet" : null);
    const banner = textAssess.banner ?? (hasVisualRedFlag ? VISUAL_EMERGENCY_BANNER : null);

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      petId,
      feature: "symptom_vision",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.symptomVision,
      inputRefs: { imagePath, area, notes },
      output: parsed,
      userVisibleText: String(parsed.summary ?? ""),
      safetyFlags: ["symptom_photo_unverified", ...flags],
      reviewStatus: "needs_review",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    return {
      ok: true,
      data: parsed,
      safety: { routing, flags, banner },
      generationId,
    };
  })
);
