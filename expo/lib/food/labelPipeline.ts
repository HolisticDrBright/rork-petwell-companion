import { foodService, type BarcodeLookupResult } from "@/services/foodService";
import { ocrService } from "@/services/ocrService";

import { normalizeOcrText, parseLabelText, type ParsedLabel } from "./ocr";

export { normalizeOcrText };

/**
 * Food-label pipeline: photo → OCR text → cleaned text → parsed ingredients &
 * guaranteed analysis → catalog match. Pure + testable (the camera capture
 * itself lives in the screen). The label only IDENTIFIES the product; it never
 * establishes purity — contaminant confidence comes from lab/recall evidence.
 */

export type MatchConfidence = "high" | "medium" | "low";

export interface LabelPipelineResult {
  rawText: string;
  cleanedText: string;
  parsed: ParsedLabel;
  match: BarcodeLookupResult;
  confidence: MatchConfidence;
  warnings: string[];
  ocrAvailable: boolean;
}

/** Read text from a captured label image (empty when no OCR backend is installed). */
export async function extractLabelText(imageUri: string): Promise<{ text: string; available: boolean }> {
  return ocrService.extractTextFromImage(imageUri);
}

/** Normalize + parse + match a label's text against the catalog. */
export async function runLabelPipeline(text: string, productNameHint?: string): Promise<LabelPipelineResult> {
  const cleanedText = normalizeOcrText(text);
  const parsed = parseLabelText(cleanedText);
  const match = await foodService.matchLabel(cleanedText, productNameHint?.trim() || undefined);

  const warnings: string[] = [];
  if (parsed.ingredients.length < 3) {
    warnings.push("Only a few ingredients were read — make sure the photo captured the full panel.");
  }
  if (parsed.guaranteed.proteinPct == null && parsed.guaranteed.fatPct == null) {
    warnings.push("No guaranteed analysis found — protein/fat values weren't detected.");
  }

  const confidence: MatchConfidence = match.productId
    ? "high"
    : match.suggestions.length > 0
      ? "medium"
      : "low";
  if (confidence === "low") {
    warnings.push("No close catalog match — confirm the product yourself or try Search.");
  }

  return {
    rawText: text,
    cleanedText,
    parsed,
    match,
    confidence,
    warnings,
    ocrAvailable: ocrService.isAvailable(),
  };
}
