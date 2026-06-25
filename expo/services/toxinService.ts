import { TOXINS } from "@/lib/toxins/data";
import { getToxinBySlug, matchToxinsInText, searchToxins, toxinsForSpecies } from "@/lib/toxins/search";
import type { ToxinCategory, ToxinEntry } from "@/lib/toxins/types";

/**
 * Toxin data access (spec: services/toxinService.ts).
 *
 * Today this serves the bundled OFFLINE dataset. A future version can hydrate
 * newer/updated entries from Supabase reference tables (design-spec Phase 2),
 * always falling back to the local data so lookup keeps working with no network.
 */
export const toxinService = {
  /** Whether entries are currently served from a remote source. */
  isRemote: false as boolean,

  list(): ToxinEntry[] {
    return TOXINS;
  },
  search(query: string, species?: "dog" | "cat", category?: ToxinCategory | null): ToxinEntry[] {
    return searchToxins(query, species, category);
  },
  matchInText(text: string, species: "dog" | "cat"): ToxinEntry[] {
    return matchToxinsInText(text, species);
  },
  bySlug(slug: string): ToxinEntry | undefined {
    return getToxinBySlug(slug);
  },
  forSpecies(species: "dog" | "cat"): ToxinEntry[] {
    return toxinsForSpecies(species);
  },

  /**
   * Phase 2 hook: hydrate newer entries from Supabase. Currently a no-op that
   * keeps the local dataset (offline-first). Never throws.
   */
  async hydrate(): Promise<{ ok: boolean; source: "local" | "remote"; count: number }> {
    return { ok: true, source: "local", count: TOXINS.length };
  },
};
