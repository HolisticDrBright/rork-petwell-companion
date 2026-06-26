// ai-vision-label — OCR fallback: read a pet-food label from a photo into
// structured fields for the existing label-review flow. The image reads the label
// ONLY; it can never establish contaminant confidence. Output is always
// needsReview / crowdsourced_unverified.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { FOOD_LABEL_VISION_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { labelExtractionSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { reviewOutput } from "../_shared/safety.ts";
import { docContentPart, fetchAsDataUrl, guessMime } from "../_shared/files.ts";
import type { ContentPart } from "../_shared/provider.ts";

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const imagePath = typeof body.imagePath === "string" ? body.imagePath : "";
    const petId = typeof body.petId === "string" ? body.petId : null;
    const productHint = typeof body.productHint === "string" ? body.productHint : "";
    if (!imagePath) return { ok: false, error: "Missing image." };
    if (!imagePath.startsWith(`${ctx.caller.userId}/`)) {
      return { ok: false, error: "You can only read your own photos." };
    }

    const { mime, kind } = guessMime(imagePath);
    if (kind !== "image") return { ok: false, error: "Please use a photo (JPG/PNG)." };
    const signed = await ctx.svc.storage.from("documents").createSignedUrl(imagePath, 120);
    if (signed.error || !signed.data?.signedUrl) return { ok: false, error: "Couldn't open the photo." };
    const dataUrl = await fetchAsDataUrl(signed.data.signedUrl, mime);
    if (!dataUrl) return { ok: false, error: "The photo is too large or unreadable." };
    const part = docContentPart(dataUrl, "image", "label");
    if (!part) return { ok: false, error: "Unsupported image." };

    const userContent: ContentPart[] = [
      { type: "input_text", text: `Transcribe this pet-food label.${productHint ? ` Product hint: ${productHint}.` : ""}` },
      part,
    ];

    const result = await ctx.provider.generate({
      model: MODELS.vision(),
      input: [
        { role: "system", content: [{ type: "input_text", text: FOOD_LABEL_VISION_PROMPT }] },
        { role: "user", content: userContent },
      ],
      jsonSchema: labelExtractionSchema,
      maxOutputTokens: 1200,
      temperature: 0,
    });

    const parsed = (result.parsed ?? {}) as Record<string, unknown>;
    parsed.needsReview = true; // never auto-trust label OCR

    // Defensive: a label transcription must never carry a contaminant/purity claim.
    const review = reviewOutput(
      `${parsed.ingredientsText ?? ""} ${(Array.isArray(parsed.warnings) ? parsed.warnings.join(" ") : "")}`,
    );
    const flags = review.flags;
    if (flags.includes("purity_claim") || flags.includes("photo_contaminant_claim")) {
      parsed.warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    }

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      petId,
      feature: "food_label_vision",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.foodLabelVision,
      inputRefs: { imagePath, productHint },
      output: parsed,
      userVisibleText: String(parsed.ingredientsText ?? ""),
      safetyFlags: ["label_ocr_unverified", ...flags],
      reviewStatus: "needs_review",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    return {
      ok: true,
      data: parsed,
      safety: { routing: null, flags, banner: null },
      generationId,
    };
  })
);
