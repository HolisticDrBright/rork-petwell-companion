import { detectPatterns, type DetectedPattern } from "@/lib/integrative/patterns";
import type { Pet, TimelineEntry } from "@/types/pet";

import { integrativeService } from "./integrativeService";
import { storage } from "./storage";

/**
 * Root-cause pattern service. Wraps the deterministic detector engine with
 * local caching (offline-safe) and best-effort remote persistence, so the rest
 * of the app has one place to read "patterns to watch" for a pet.
 */

const cacheKey = (petId: string) => `petwell.patterns.${petId}`;

export const patternsService = {
  /** Pure detection from the pet's current logs (no I/O). */
  detect(pet: Pet, timeline: TimelineEntry[]): DetectedPattern[] {
    return detectPatterns(pet, timeline);
  },

  /** Detect, cache locally, and best-effort persist remotely. */
  async refresh(pet: Pet, timeline: TimelineEntry[]): Promise<DetectedPattern[]> {
    const patterns = detectPatterns(pet, timeline);
    await storage.setJSON(cacheKey(pet.id), patterns);
    integrativeService.savePatterns(pet.id, patterns).catch(() => {});
    return patterns;
  },

  /** Last cached patterns for a pet (e.g. for an instant first paint). */
  async getCached(petId: string): Promise<DetectedPattern[]> {
    return storage.getJSON<DetectedPattern[]>(cacheKey(petId), []);
  },
};
