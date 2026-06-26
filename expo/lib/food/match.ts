/**
 * Product matching. Three strategies, most reliable first:
 *  1. exact barcode → catalog product
 *  2. text: normalized-ingredient overlap (Jaccard) + product-name token hints
 * Returns the best match plus ranked suggestions for the manual-pick fallback.
 */

import { cleanToken, normalizeList } from "./normalize";
import type { ParsedLabel } from "./ocr";

export interface CatalogItem {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  species: "dog" | "cat" | "both";
  productType: string;
  ingredientNames: string[];
}

export interface MatchResult {
  best: CatalogItem | null;
  score: number; // 0–1 confidence
  suggestions: CatalogItem[];
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter++;
  });
  return inter / (a.size + b.size - inter);
}

export function matchByText(
  parsed: ParsedLabel,
  catalog: CatalogItem[],
  opts: { nameHint?: string; canonicalNames: string[]; aliasMap: Record<string, string> }
): MatchResult {
  const norm = normalizeList(parsed.ingredients, opts.canonicalNames, opts.aliasMap);
  const labelSet = new Set(norm.matched.map((n) => n.toLowerCase()));
  const hintTokens = cleanToken(opts.nameHint ?? "")
    .split(" ")
    .filter((t) => t.length > 2);

  const scored = catalog
    .map((item) => {
      const itemSet = new Set(item.ingredientNames.map((n) => n.toLowerCase()));
      let score = jaccard(labelSet, itemSet) * 0.7;
      if (hintTokens.length) {
        const iname = item.name.toLowerCase();
        const hits = hintTokens.filter((t) => iname.includes(t)).length;
        score += (hits / hintTokens.length) * 0.3;
      }
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return {
    best: best && best.score >= 0.34 ? best.item : null,
    score: best?.score ?? 0,
    suggestions: scored.filter((s) => s.score > 0.05).slice(0, 5).map((s) => s.item),
  };
}
