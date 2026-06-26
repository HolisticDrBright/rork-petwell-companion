// ai-vet-report-rewrite — turn the compiled vet report into a concise vet-facing
// summary + a plain-language owner summary. No new facts; red flags preserved;
// output is safety-reviewed before return.
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { PROMPT_VERSIONS, VET_REPORT_REWRITE_PROMPT } from "../_shared/prompts.ts";
import { vetReportRewriteSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { refusalFor, reviewOutput, withDisclaimer } from "../_shared/safety.ts";

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const report = body.report;
    if (!report || typeof report !== "object") return { ok: false, error: "Missing report data." };
    const reportJson = JSON.stringify(report).slice(0, 12000);
    const generatedAt = (report as { generatedAt?: string }).generatedAt ?? null;

    const result = await ctx.provider.generate({
      model: MODELS.summary(),
      input: [
        { role: "system", content: [{ type: "input_text", text: VET_REPORT_REWRITE_PROMPT }] },
        {
          role: "user",
          content: [{ type: "input_text", text: `Rewrite this compiled report. Use only these facts.\n\n${reportJson}` }],
        },
      ],
      jsonSchema: vetReportRewriteSchema,
      maxOutputTokens: 1400,
      temperature: 0.2,
    });

    const parsed = (result.parsed ?? {}) as { vetSummary?: string; ownerSummary?: string };
    let vetSummary = (parsed.vetSummary ?? "").trim();
    let ownerSummary = (parsed.ownerSummary ?? "").trim();

    // Authoritative output review — refuse any forbidden claim the model slipped in.
    const review = reviewOutput(`${vetSummary}\n${ownerSummary}`);
    if (!review.ok) {
      const r = refusalFor(review.flags);
      vetSummary = r;
      ownerSummary = r;
    }
    ownerSummary = withDisclaimer(ownerSummary);
    const data = { vetSummary, ownerSummary };

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      feature: "vet_report_rewrite",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.vetReportRewrite,
      inputRefs: { reportGeneratedAt: generatedAt },
      output: data,
      userVisibleText: ownerSummary,
      safetyFlags: review.flags,
      reviewStatus: "generated",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    return {
      ok: true,
      data,
      safety: { routing: null, flags: review.flags, banner: null, refused: !review.ok },
      generationId,
    };
  })
);
