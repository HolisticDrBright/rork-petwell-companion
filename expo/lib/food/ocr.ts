/**
 * OCR adapter + label parser. On-device OCR isn't available in this runtime, so
 * the default adapter is "manual": the user pastes/edits the ingredient panel or
 * guaranteed-analysis text (which is realistic — OCR output is always
 * user-correctable). A real adapter (native OCR or a vision model) can be
 * dropped in behind the same interface without touching the parser or engine.
 *
 * Crucially, OCR only reads the LABEL — it identifies the product and its
 * printed ingredients/analysis. It never establishes purity.
 */

export interface OcrAdapter {
  extract(imageUri: string): Promise<string>;
}

export const manualOcr: OcrAdapter = {
  async extract() {
    return "";
  },
};

export interface ParsedLabel {
  ingredients: string[];
  guaranteed: {
    proteinPct?: number;
    fatPct?: number;
    fiberPct?: number;
    moisturePct?: number;
  };
  raw: string;
}

export function parseLabelText(raw: string): ParsedLabel {
  const text = (raw ?? "").replace(/\r/g, "");
  const lower = text.toLowerCase();

  let ingredients: string[] = [];
  const ingIdx = lower.indexOf("ingredient");
  if (ingIdx >= 0) {
    let segment = text.slice(ingIdx).replace(/^[^:]*:/, ""); // drop the "Ingredients:" label
    const stop = segment.toLowerCase().search(/guaranteed analysis|crude protein|calorie|kcal|\n\s*\n/);
    if (stop > 0) segment = segment.slice(0, stop);
    ingredients = segment
      .split(/[,;\n]/)
      .map((s) => s.replace(/\.$/, "").trim())
      .filter((s) => s.length > 1 && s.length < 60);
  } else {
    // No explicit header — treat comma-separated lines as the ingredient list.
    ingredients = text
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 60 && /[a-z]/i.test(s));
  }

  const num = (re: RegExp): number | undefined => {
    const m = lower.match(re);
    return m ? parseFloat(m[1]) : undefined;
  };

  return {
    ingredients,
    guaranteed: {
      proteinPct: num(/crude protein[^0-9]*([0-9.]+)\s*%/),
      fatPct: num(/crude fat[^0-9]*([0-9.]+)\s*%/),
      fiberPct: num(/crude fib(?:er|re)[^0-9]*([0-9.]+)\s*%/),
      moisturePct: num(/moisture[^0-9]*([0-9.]+)\s*%/),
    },
    raw: text,
  };
}
