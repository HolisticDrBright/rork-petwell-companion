/**
 * Pure matcher: observed features → source-backed KB context. No side effects, no
 * network — trivially testable. Matching is intentionally conservative (token
 * presence in the observed values/summary) and returns descriptive CONTEXT only,
 * never a decision. The deterministic triage remains the source of truth.
 */
import { SYMPTOM_KB } from "./data";
import { URGENCY_RANK, type KbArea, type KbSpecies, type SymptomKbEntry } from "./types";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface KbMatchInput {
  area: KbArea;
  species: KbSpecies;
  observations: { feature: string; value: string }[];
  summary?: string;
}

/**
 * Return the KB entries whose match tokens appear in the observed values/summary,
 * for the given area + species, most-urgent first. Capped so the UI stays calm.
 */
export function matchSymptomKb(input: KbMatchInput, entries: SymptomKbEntry[] = SYMPTOM_KB, limit = 4): SymptomKbEntry[] {
  const text = [...input.observations.map((o) => `${o.feature} ${o.value}`), input.summary ?? ""]
    .join(" ")
    .toLowerCase();

  const matched = entries.filter((e) => {
    if (e.area !== input.area) return false;
    if (e.species !== "both" && e.species !== input.species) return false;
    return e.matchTokens.some((tok) => new RegExp(`\\b${escapeRe(tok.toLowerCase())}`).test(text));
  });

  return matched.sort((a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]).slice(0, limit);
}

/** Highest urgency among matches (for a summary nudge), or null when none match. */
export function topUrgency(entries: SymptomKbEntry[]): SymptomKbEntry["urgency"] | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, e) => (URGENCY_RANK[e.urgency] > URGENCY_RANK[best] ? e.urgency : best), entries[0].urgency);
}
