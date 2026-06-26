import { TOXINS } from "./data";
import type { ToxinCategory, ToxinEntry } from "./types";

/**
 * Pure, offline toxin search (spec: lib/toxins/search.ts).
 *
 * SAFETY: a no-match result NEVER means "safe" — callers must surface the
 * not-found-not-safe copy (contacts.ts) on an empty result.
 *
 * Species scoping uses `speciesScope` only (which entries are *relevant*); it
 * never hides a hazard. The per-species *severity* (search → safety.ts) is what
 * varies, so a dog-scoped lily still appears, labelled with its dog severity.
 */

const norm = (s: string) => s.toLowerCase().trim();

export function toxinsForSpecies(species: "dog" | "cat"): ToxinEntry[] {
  return TOXINS.filter((e) => e.speciesScope === "both" || e.speciesScope === species);
}

export function getToxinBySlug(slug: string): ToxinEntry | undefined {
  return TOXINS.find((e) => e.slug === slug);
}

/** Search by name / alias / category, optionally scoped to a species + category. */
export function searchToxins(query: string, species?: "dog" | "cat", category?: ToxinCategory | null): ToxinEntry[] {
  let pool = species ? toxinsForSpecies(species) : TOXINS;
  if (category) pool = pool.filter((e) => e.category === category);
  const q = norm(query);
  if (q.length === 0) return pool;
  return pool.filter(
    (e) =>
      norm(e.name).includes(q) ||
      e.category.includes(q) ||
      // a.includes(q) lets a short query prefix-match an alias; the reverse
      // (q.includes(a)) needs a length guard so a 2-char alias can't match anything.
      e.aliases.some((a) => a.includes(q) || (a.length >= 3 && q.includes(a))),
  );
}

/**
 * Scan free text (an ingredient list, or a note about what a pet ate) for any
 * known toxin for the given species. Used by treat audit / meal planner / triage.
 */
export function matchToxinsInText(text: string, species: "dog" | "cat"): ToxinEntry[] {
  const t = norm(text);
  if (!t) return [];
  return toxinsForSpecies(species).filter(
    (e) => e.aliases.some((a) => a.length >= 3 && t.includes(a)) || t.includes(norm(e.name)),
  );
}

/** Entries still awaiting veterinary review. */
export function pendingVetReview(): ToxinEntry[] {
  return TOXINS.filter((e) => e.evidenceStatus !== "vet_reviewed");
}
