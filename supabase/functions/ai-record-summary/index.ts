// ai-record-summary — summarize an uploaded vet record/PDF/image into structured
// fields + owner/vet summaries. Never invents values; urgent findings route to a
// vet; result is stored as ai_extracted_records (needs_review).
import { handleAi } from "../_shared/runtime.ts";
import { MODELS } from "../_shared/provider.ts";
import { PROMPT_VERSIONS, RECORD_SUMMARY_PROMPT } from "../_shared/prompts.ts";
import { recordSummarySchema } from "../_shared/schemas.ts";
import { logGeneration } from "../_shared/log.ts";
import { refusalFor, reviewOutput } from "../_shared/safety.ts";
import { docContentPart, fetchAsDataUrl, guessMime } from "../_shared/files.ts";
import type { ContentPart } from "../_shared/provider.ts";

const VALID_TYPES = ["vet_record", "lab_result", "coa", "invoice", "discharge", "prescription"];

Deno.serve((req) =>
  handleAi(req, async (ctx, body) => {
    const documentPath = typeof body.documentPath === "string" ? body.documentPath : "";
    const petId = typeof body.petId === "string" ? body.petId : null;
    const recordType = VALID_TYPES.includes(String(body.recordType)) ? String(body.recordType) : "vet_record";
    if (!documentPath) return { ok: false, error: "Missing document." };

    // Defense in depth: a user can only summarize their own files. Storage paths
    // are "<owner_id>/...". (RLS + signed URL via service role also apply.)
    if (!documentPath.startsWith(`${ctx.caller.userId}/`)) {
      return { ok: false, error: "You can only summarize your own documents." };
    }

    const { mime, kind } = guessMime(documentPath);
    if (kind === "other") return { ok: false, error: "Unsupported file type. Upload a PDF or image." };

    const signed = await ctx.svc.storage.from("documents").createSignedUrl(documentPath, 120);
    if (signed.error || !signed.data?.signedUrl) return { ok: false, error: "Couldn't open the document." };
    const dataUrl = await fetchAsDataUrl(signed.data.signedUrl, mime);
    if (!dataUrl) return { ok: false, error: "The document is too large or unreadable." };
    const part = docContentPart(dataUrl, kind, documentPath.split("/").pop() ?? "document");
    if (!part) return { ok: false, error: "Unsupported file type." };

    const userContent: ContentPart[] = [
      { type: "input_text", text: `Summarize this ${recordType.replace(/_/g, " ")}. Use only what is written; unknown fields are null.` },
      part,
    ];

    const result = await ctx.provider.generate({
      model: MODELS.summary(),
      input: [
        { role: "system", content: [{ type: "input_text", text: RECORD_SUMMARY_PROMPT }] },
        { role: "user", content: userContent },
      ],
      jsonSchema: recordSummarySchema,
      maxOutputTokens: 1800,
      temperature: 0.1,
    });

    const parsed = (result.parsed ?? {}) as Record<string, unknown>;
    // Output review on the prose fields — refuse diagnosis/treatment phrasing.
    const ownerText = String(parsed.summaryForOwner ?? "");
    const vetText = String(parsed.summaryForVet ?? "");
    const review = reviewOutput(`${ownerText}\n${vetText}`);
    if (!review.ok) {
      const r = refusalFor(review.flags);
      parsed.summaryForOwner = r;
      parsed.summaryForVet = r;
    }
    parsed.needsReview = true; // never trust extraction as final

    const redFlags = Array.isArray(parsed.redFlags) ? (parsed.redFlags as string[]) : [];
    const banner =
      redFlags.length > 0
        ? "This document mentions findings that may need attention. Please follow up with your veterinarian."
        : null;

    const generationId = await logGeneration(ctx.svc, {
      ownerId: ctx.caller.userId,
      petId,
      feature: "record_summary",
      model: result.model,
      provider: ctx.provider.name,
      promptVersion: PROMPT_VERSIONS.recordSummary,
      inputRefs: { documentPath, recordType },
      output: parsed,
      userVisibleText: String(parsed.summaryForOwner ?? ""),
      safetyFlags: [...review.flags, ...(redFlags.length ? ["document_red_flag"] : [])],
      reviewStatus: "needs_review",
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
    });

    // Persist the extraction for later admin/vet review.
    await ctx.svc.from("ai_extracted_records").insert({
      owner_id: ctx.caller.userId,
      pet_id: petId,
      generation_id: generationId,
      record_type: recordType,
      extracted: parsed as never,
      review_status: "needs_review",
    });

    return {
      ok: true,
      data: parsed,
      safety: { routing: redFlags.length ? "emergency_vet" : null, flags: review.flags, banner, refused: !review.ok },
      generationId,
    };
  })
);
