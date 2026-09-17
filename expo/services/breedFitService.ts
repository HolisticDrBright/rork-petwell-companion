// Breed nutrition context (breed_food_fit reference table, migration 0034).
// World-readable WSAVA-sourced general guidance; remote mode only (local mode
// simply shows nothing — the feature is additive context, never load-bearing).
import { findBreedFit, type BreedFitRow } from "@/lib/food/breedFit";
import { getMode } from "@/lib/backend";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

let cache: BreedFitRow[] | null = null;

type DbRow = {
  breed: string;
  species: string;
  size_class: string | null;
  nutrition_considerations: string | null;
  nutrients_to_discuss: string | null;
  avoid_monitor_notes: string | null;
  preferred_food_traits: string | null;
  caution_flags: string | null;
  source_url: string | null;
  notes: string | null;
};

async function loadRows(): Promise<BreedFitRow[]> {
  if (cache) return cache;
  const { data, error } = await supabase
    .from("breed_food_fit")
    .select(
      "breed, species, size_class, nutrition_considerations, nutrients_to_discuss, avoid_monitor_notes, preferred_food_traits, caution_flags, source_url, notes",
    )
    .limit(200);
  if (error) throw new Error(error.message);
  cache = ((data ?? []) as DbRow[])
    .filter((r) => r.species === "dog" || r.species === "cat")
    .map((r) => ({
      breed: r.breed,
      species: r.species as "dog" | "cat",
      sizeClass: r.size_class,
      nutritionConsiderations: r.nutrition_considerations,
      nutrientsToDiscuss: r.nutrients_to_discuss,
      avoidMonitorNotes: r.avoid_monitor_notes,
      preferredFoodTraits: r.preferred_food_traits,
      cautionFlags: r.caution_flags,
      sourceUrl: r.source_url,
      notes: r.notes,
    }));
  return cache;
}

export const breedFitService = {
  /** Best-match guidance row for a typed breed, or null (never throws). */
  async getBreedFit(breed: string | null | undefined, species: "dog" | "cat"): Promise<BreedFitRow | null> {
    if (!breed?.trim()) return null;
    if (!(isSupabaseConfigured && getMode() === "remote")) return null;
    try {
      const rows = await loadRows();
      return findBreedFit(rows, breed, species);
    } catch {
      return null;
    }
  },
};
