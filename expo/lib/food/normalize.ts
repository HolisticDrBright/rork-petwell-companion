/**
 * Ingredient normalization. Raw label/OCR tokens are messy ("Deboned Chicken",
 * "ground brown rice", "Brewer's Rice"); this maps them onto canonical catalog
 * ingredients using an alias table + conservative cleaning. Cleaning is kept
 * light on purpose so identity-bearing words (e.g. "meal") are preserved and
 * we don't collide "chicken" with "chicken meal".
 */

export interface AliasEntry {
  alias: string;
  canonical: string;
}

export interface NormalizeResult {
  raw: string;
  canonical: string | null;
}

const STOP = /\b(min|max|minimum|maximum|crude)\b/g;

export function cleanToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // drop parentheticals e.g. (preservative)
    .replace(/[0-9.%]+/g, " ") // drop numbers / percentages
    .replace(STOP, " ")
    .replace(/[^a-z'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAliasMap(entries: AliasEntry[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const e of entries) {
    const key = cleanToken(e.alias);
    if (key) m[key] = e.canonical;
  }
  return m;
}

export function normalizeIngredient(
  raw: string,
  canonicalNames: string[],
  aliasMap: Record<string, string>
): NormalizeResult {
  const cleaned = cleanToken(raw);
  if (!cleaned) return { raw, canonical: null };
  if (aliasMap[cleaned]) return { raw, canonical: aliasMap[cleaned] };

  const lowerCanon = canonicalNames.map((n) => ({ n, l: cleanToken(n) }));
  const exact = lowerCanon.find((c) => c.l === cleaned);
  if (exact) return { raw, canonical: exact.n };

  // Containment (e.g. "chicken broth" → Chicken). Exact already handled above,
  // so plain "chicken" resolves to "Chicken", not "Chicken meal".
  const contains = lowerCanon.find((c) => cleaned.includes(c.l) || c.l.includes(cleaned));
  if (contains) return { raw, canonical: contains.n };

  for (const [alias, canon] of Object.entries(aliasMap)) {
    if (cleaned.includes(alias) || alias.includes(cleaned)) return { raw, canonical: canon };
  }
  return { raw, canonical: null };
}

export function normalizeList(
  rawList: string[],
  canonicalNames: string[],
  aliasMap: Record<string, string>
): { matched: string[]; unknown: string[]; results: NormalizeResult[] } {
  const results = rawList.map((r) => normalizeIngredient(r, canonicalNames, aliasMap));
  const matched = [...new Set(results.map((r) => r.canonical).filter(Boolean) as string[])];
  const unknown = results.filter((r) => !r.canonical && cleanToken(r.raw)).map((r) => r.raw.trim());
  return { matched, unknown, results };
}
