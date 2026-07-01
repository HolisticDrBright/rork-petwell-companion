/**
 * Symptom KB service — offline-first, like toxinService. The bundled seed
 * (lib/symptomKb/data.ts) always works; when a backend is configured we also load
 * vet-curated entries from `symptom_kb_entries` and merge them (remote overrides a
 * local entry with the same area+title). Never throws — falls back to local.
 */
import { matchSymptomKb, type KbMatchInput } from "@/lib/symptomKb/match";
import { SYMPTOM_KB } from "@/lib/symptomKb/data";
import type { KbUrgency, SymptomKbEntry } from "@/lib/symptomKb/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface KbRow {
  species: string;
  area: string;
  feature: string;
  match_tokens: string[] | null;
  title: string;
  may_indicate: string;
  urgency: string;
  watch_for: string[] | null;
  related_concern: string | null;
  source_name: string | null;
  source_url: string | null;
  review_status: string;
}

function mapRow(r: KbRow): SymptomKbEntry {
  return {
    id: `${r.area}:${r.title}`,
    species: (r.species as SymptomKbEntry["species"]) ?? "both",
    area: r.area as SymptomKbEntry["area"],
    feature: r.feature,
    matchTokens: r.match_tokens ?? [],
    title: r.title,
    mayIndicate: r.may_indicate,
    urgency: (r.urgency as KbUrgency) ?? "watch",
    watchFor: r.watch_for ?? [],
    relatedConcern: r.related_concern ?? "other",
    source: { name: r.source_name ?? "Reference", url: r.source_url ?? undefined },
    reviewStatus: r.review_status === "vet_reviewed" ? "vet_reviewed" : "needs_vet_review",
  };
}

function merge(local: SymptomKbEntry[], remote: SymptomKbEntry[]): SymptomKbEntry[] {
  const byKey = new Map<string, SymptomKbEntry>();
  for (const e of local) byKey.set(`${e.area}|${e.title.toLowerCase()}`, e);
  for (const e of remote) byKey.set(`${e.area}|${e.title.toLowerCase()}`, e); // remote wins
  return [...byKey.values()];
}

let cache: SymptomKbEntry[] | null = null;

export const symptomKbService = {
  /** Bundled seed + any vet-curated remote entries. Offline-first; never throws. */
  async getEntries(): Promise<SymptomKbEntry[]> {
    if (cache) return cache;
    if (!isSupabaseConfigured) {
      cache = SYMPTOM_KB;
      return cache;
    }
    try {
      const { data, error } = await supabase
        .from("symptom_kb_entries")
        .select(
          "species, area, feature, match_tokens, title, may_indicate, urgency, watch_for, related_concern, source_name, source_url, review_status",
        );
      if (error) throw error;
      cache = merge(SYMPTOM_KB, (data ?? []).map((r) => mapRow(r as KbRow)));
    } catch (e) {
      console.warn("[petwell] symptom KB hydrate failed, using local seed:", e);
      cache = SYMPTOM_KB;
    }
    return cache;
  },

  /** Match observed features against the KB (remote + local). */
  async match(input: KbMatchInput): Promise<SymptomKbEntry[]> {
    return matchSymptomKb(input, await this.getEntries());
  },
};
