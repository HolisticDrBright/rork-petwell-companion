import { TOXINS } from "./data";
import type { ToxinEntry } from "./types";

/**
 * Pure, offline toxin lookup. No network, no Supabase.
 *
 * SAFETY: a no-match result NEVER means "safe" — callers must surface
 * NOT_FOUND_NOT_SAFE (see contacts.ts) on an empty result. This module only
 * answers "is this in our curated list and what is it"; it never says "safe".
 */

const norm = (s: string) => s.toLowerCase().trim();

export function allToxins(): ToxinEntry[] {
  return TOXINS;
}

export function toxinsForSpecies(species: "dog" | "cat"): ToxinEntry[] {
  return TOXINS.filter((entry) => entry.species === "both" || entry.species === species);
}

export function getToxin(slug: string): ToxinEntry | undefined {
  return TOXINS.find((entry) => entry.slug === slug);
}

/** Search by name / alias / category. Empty query returns the species-scoped list. */
export function searchToxins(query: string, species?: "dog" | "cat"): ToxinEntry[] {
  const pool = species ? toxinsForSpecies(species) : TOXINS;
  const q = norm(query);
  if (q.length === 0) return pool;
  return pool.filter((entry) => {
    if (norm(entry.name).includes(q)) return true;
    if (entry.category.includes(q)) return true;
    return entry.aliases.some((a) => a.includes(q) || q.includes(a));
  });
}

/**
 * Scan free text (an ingredient list, or a note about what a pet ate) for any
 * known toxin for the given species. Used by treat audit / meal planner / triage.
 */
export function findToxinsInText(text: string, species: "dog" | "cat"): ToxinEntry[] {
  const t = norm(text);
  if (!t) return [];
  return toxinsForSpecies(species).filter(
    (entry) => entry.aliases.some((a) => a.length >= 3 && t.includes(a)) || t.includes(norm(entry.name)),
  );
}

/** Entries still awaiting veterinary review (curated from public sources only). */
export function pendingVetReview(): ToxinEntry[] {
  return TOXINS.filter((entry) => entry.reviewStatus !== "vet_reviewed");
}
