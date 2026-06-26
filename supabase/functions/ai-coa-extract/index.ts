// ai-coa-extract — extract structured lab/COA evidence from a PDF/image (uploaded
// or a pdf/image URL). Admin-only. NEVER marks verified_lab and NEVER creates
// lab_tests rows; the extraction is stored needs_review and queued for a human to
// verify before any evidence is trusted.
import { handleAi } from "../_shared/runtime.ts";
import { isAdmin } from "../_shared/auth.ts";
import { MODELS } from "../_shared/provider.ts";
import { COA_EXTRACTION_PROMPT, PROMPT_VERSIONS } from "../_shared/prompts.ts";
import { coaExtractionSchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { docContentPart, fetchAsDataUrl, guessMime } from "../_shared/files.ts";
import type { ContentPart } from "../_shared/provider.ts";

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    // Writing to the shared evidence/review queue is admin-only.
    if (!(await isAdmin(ctx.svc, ctx.caller.userId))) {
      return { ok: false, error: "COA extraction is an admin tool." };
    }

    const documentPath = typeof body.documentPath === "string" ? body.documentPath : "";
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl : "";
    const brandHint = typeof body.brandHint === "string" ? body.brandHint : "";
    const productHint = typeof body.productHint === "string" ? body.productHint : "";

    // Resolve the document bytes as a model content part.
    let part: ContentPart | null = null;
    let sourceRef = sourceUrl || documentPath;
    if (documentPath) {
      const { mime, kind } = guessMime(documentPath);
      const signed = await ctx.svc.storage.from("documents").createSignedUrl(documentPath, 120);
      if (signed.error || !signed.data?.signedUrl) return { ok: false, error: "Couldn't open the document." };
      const dataUrl = await fetchAsDataUrl(signed.data.signedUrl, mime);
      if (dataUrl) part = docContentPart(dataUrl, kind, documentPath.split("/").pop() ?? "coa");
    } else if (sourceUrl) {
      const { mime, kind } = guessMime(sourceUrl);
      if (kind === "other") {
        return { ok: false, error: "Provide a PDF or image COA (a web page can't be read directly)." };
      }
      const dataUrl = await fetchAsDataUrl(sourceUrl, mime);
      if (dataUrl) part = docContentPart(dataUrl, kind, "coa");
    }
    if (!part) return { ok: false, error: "Couldn't read the COA. Upload a PDF or image." };

    const hints = [brandHint && `Brand hint: ${brandHint}`, productHint && `Product hint: ${productHint}`, sourceUrl && `Source URL: ${sourceUrl}`]
      .filter(Boolean)
      .join("\n");
    const userContent: ContentPart[] = [
      { type: "input_text", text: `Extract the lab/COA evidence. ${hints}`.trim() },
      part,
    ];

    const result = await ctx.provider.generate({
      model: MODELS.summary(),
      input: [
        { role: "system", content: [{ type: "input_text", text: COA_EXTRACTION_PROMPT }] },
        { role: "user", content: userContent },
      ],
      jsonSchema: coaExtractionSchema,
      maxOutputTokens: 1800,
      temperature: 0.1,
    });

    const parsed = (result.parsed ?? {}) as Record<string, unknown>;
    // Hard guarantee: extraction is NEVER verified. Only needs_review or brand_claim.
    if (parsed.evidenceStatus !== "brand_claim") parsed.evidenceStatus = "needs_review";
    if (!parsed.sourceUrl && sourceUrl) parsed.sourceUrl = sourceUrl;

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      feature: "coa_extraction",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.coaExtraction,
      inputRefs: { source: sourceRef, brandHint, productHint },
      output: parsed,
      userVisibleText: null,
      safetyFlags: ["coa_unverified"],
      reviewStatus: "needs_review",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    // Store the extraction and queue it for human verification. We deliberately do
    // NOT write lab_tests — an admin promotes verified evidence manually.
    const inserted = await ctx.svc
      .from("ai_extracted_records")
      .insert({
        owner_id: ctx.caller.userId,
        generation_id: generationId,
        record_type: "coa",
        extracted: parsed as never,
        review_status: "needs_review",
      })
      .select("id")
      .maybeSingle();

    const extractedId = inserted.data?.id ?? null;
    const analyteCount = Array.isArray(parsed.analytes) ? (parsed.analytes as unknown[]).length : 0;
    await ctx.svc.from("admin_review_queue").insert({
      entity_type: "ai_extracted_record",
      entity_id: extractedId,
      priority: 2,
      status: "open",
      note: `AI COA extraction (${parsed.evidenceLevel ?? "?"}, ${analyteCount} analytes) — verify source & values before creating any lab_tests row. Never mark verified without an independent product-level COA.`,
    });

    return {
      ok: true,
      data: parsed,
      safety: { routing: null, flags: ["coa_unverified"], banner: null },
      generationId,
    };
  })
);
