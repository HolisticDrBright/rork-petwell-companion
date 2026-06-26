// ai-care-plan — phrase an ALREADY-GATED deterministic plan as a "draft to discuss
// with your vet". The client passes the plan after the safety engine has applied
// its gates (supplements/herbs suppressed on red flags, cat-stricter, pancreatitis).
// This function never adds treatments and enforces red-flag suppression server-side.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { CARE_PLAN_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { carePlanSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { refusalFor, reviewOutput } from "../_shared/safety.ts";

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const petId = typeof body.petId === "string" ? body.petId : null;
    const issue = typeof body.issue === "string" ? body.issue : "";
    const plan = body.plan;
    if (!plan || typeof plan !== "object") return { ok: false, error: "Missing plan." };
    const planJson = JSON.stringify(plan).slice(0, 8000);

    // Did the deterministic engine flag an emergency or a vet-first plan? The
    // IntegrativePlan sets emergencyOverride only for the emergency tier; the
    // vet_first tier (urgency orange/red, fired by a red flag) sets it false, so
    // we must ALSO treat orange/red urgency as red-flagged to suppress at-home
    // options server-side regardless of what the model returns.
    const redFlagged = /"emergencyOverride"\s*:\s*true|"urgency(Key)?"\s*:\s*"(orange|red)"/i.test(planJson);

    const result = await ctx.provider.generate({
      model: MODELS.chat(),
      input: [
        { role: "system", content: [{ type: "input_text", text: CARE_PLAN_PROMPT }] },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Draft a care plan for "${issue}". Use ONLY this gated plan; add no treatments.${redFlagged ? " RED FLAGS PRESENT: output no gentle options and lead with veterinary care." : ""}\n\n${planJson}`,
            },
          ],
        },
      ],
      jsonSchema: carePlanSchema,
      maxOutputTokens: 1000,
      temperature: 0.3,
    });

    const parsed = (result.parsed ?? {}) as Record<string, unknown>;
    // Enforce the gate server-side regardless of what the model returned.
    if (redFlagged) {
      parsed.gentleOptions = [];
      parsed.redFlagsSuppressed = true;
    }
    const review = reviewOutput(`${parsed.summary ?? ""} ${(Array.isArray(parsed.gentleOptions) ? parsed.gentleOptions.join(" ") : "")}`);
    if (!review.ok) {
      parsed.summary = refusalFor(review.flags);
      parsed.gentleOptions = [];
    }
    if (!parsed.disclaimer) parsed.disclaimer = "This is a draft to discuss with your veterinarian — not a prescription or diagnosis.";

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      petId,
      feature: "care_plan",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.carePlan,
      inputRefs: { issue, redFlagged },
      output: parsed,
      userVisibleText: String(parsed.summary ?? ""),
      safetyFlags: redFlagged ? ["red_flags_suppressed", ...review.flags] : review.flags,
      reviewStatus: "generated",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    return {
      ok: true,
      data: parsed,
      safety: { routing: redFlagged ? "emergency_vet" : null, flags: review.flags, banner: redFlagged ? "Some signs need a vet's attention — please contact your veterinarian." : null, refused: !review.ok },
      generationId,
    };
  })
);
