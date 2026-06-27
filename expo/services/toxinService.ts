import { TOXINS } from "@/lib/toxins/data";
import { getToxinBySlug, matchToxinsInText, searchToxins, toxinsForSpecies } from "@/lib/toxins/search";
import type { ToxinCategory, ToxinEntry } from "@/lib/toxins/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
   * Check the Supabase reference table (toxin_references, migration 0016) and
   * report whether remote data is available. The bundled, vet-curated set stays
   * the OFFLINE-FIRST source the UI reads (so lookup + emergency routing always
   * work with no network); remote hydration of newer entries layers on top once
   * they carry vet_reviewed status. Never throws — always falls back to local.
   */
  async hydrate(): Promise<{ ok: boolean; source: "local" | "remote"; count: number }> {
    if (!isSupabaseConfigured) return { ok: true, source: "local", count: TOXINS.length };
    try {
      const { count, error } = await supabase.from("toxin_references").select("id", { count: "exact", head: true });
      if (error || !count) return { ok: true, source: "local", count: TOXINS.length };
      return { ok: true, source: "remote", count };
    } catch {
      return { ok: true, source: "local", count: TOXINS.length };
    }
  },
};
