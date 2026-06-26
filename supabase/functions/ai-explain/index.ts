// ai-explain — turn a deterministic Petwell result into a friendly explanation.
// Adds NO new conclusions: it explains the supplied result and preserves its
// urgency, disclaimers, and evidence status. Output is safety-reviewed.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { EXPLAIN_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { explainSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { refusalFor, reviewOutput } from "../_shared/safety.ts";

const FEATURES = ["food_score", "triage_result", "toxin_result", "health_score", "integrative_plan"];

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const feature = String(body.feature ?? "");
    if (!FEATURES.includes(feature)) return { ok: false, error: "Unknown result type." };
    if (!body.result || typeof body.result !== "object") return { ok: false, error: "Missing result." };
    const resultJson = JSON.stringify(body.result).slice(0, 8000);

    const result = await ctx.provider.generate({
      model: MODELS.chat(),
      input: [
        { role: "system", content: [{ type: "input_text", text: EXPLAIN_PROMPT }] },
        {
          role: "user",
          content: [
            { type: "input_text", text: `Explain this ${feature.replace(/_/g, " ")} for the owner. Explain only what's here; add nothing.\n\n${resultJson}` },
          ],
        },
      ],
      jsonSchema: explainSchema,
      maxOutputTokens: 700,
      temperature: 0.3,
    });

    let explanation = String((result.parsed as { explanation?: string } | undefined)?.explanation ?? "").trim();
    const review = reviewOutput(explanation);
    if (!review.ok) explanation = refusalFor(review.flags);

    // Preserve urgency: if the deterministic result reads as emergency, surface it.
    const urgent = /"urgency(Key)?"\s*:\s*"(red|orange)"|emergency|emergencyOverride"\s*:\s*true/i.test(resultJson);
    const banner = urgent ? "This result is time-sensitive — please contact your veterinarian." : null;

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      feature: "explanation",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.explain,
      inputRefs: { explained: feature },
      output: { explanation },
      userVisibleText: explanation,
      safetyFlags: review.flags,
      reviewStatus: "generated",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    return {
      ok: true,
      data: { explanation },
      safety: { routing: urgent ? "emergency_vet" : null, flags: review.flags, banner, refused: !review.ok },
      generationId,
    };
  })
);
