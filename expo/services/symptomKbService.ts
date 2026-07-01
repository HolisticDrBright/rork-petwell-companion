/**
 * Symptom KB service — offline-first, like toxinService. The bundled seed
 * (lib/symptomKb/data.ts) always works; when a backend is configured we also load
 * vet-curated entries from `symptom_kb_entries` and merge them (remote overrides a
 * local entry with the same area+title). Never throws — falls back to local.
 */
import { getUserId } from "@/lib/backend";
import { matchSymptomKb, type KbMatchInput } from "@/lib/symptomKb/match";
import { SYMPTOM_KB } from "@/lib/symptomKb/data";
import type { KbArea, KbReviewStatus, KbSpecies, KbUrgency, SymptomKbEntry } from "@/lib/symptomKb/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/** A KB entry as stored in Supabase, with its row id (for admin review). */
export interface SymptomKbAdminRow extends SymptomKbEntry {
  dbId: string;
}

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

  // ── Admin / vet review (RLS: only admins can write; reads are public) ────────

  /** All remote entries with their row id + review status, for the admin screen. */
  async listAll(): Promise<SymptomKbAdminRow[]> {
    const { data, error } = await supabase
      .from("symptom_kb_entries")
      .select(
        "id, species, area, feature, match_tokens, title, may_indicate, urgency, watch_for, related_concern, source_name, source_url, review_status",
      )
      .order("area", { ascending: true })
      .order("title", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...mapRow(r as KbRow), dbId: (r as { id: string }).id }));
  },

  /** Push the bundled seed into the review queue (idempotent; never overwrites a
   *  reviewed entry — skips rows that already exist by area+title). Admin-only. */
  async importSeed(): Promise<{ ok: boolean; count: number; error?: string }> {
    const rows = SYMPTOM_KB.map((e) => ({
      species: e.species,
      area: e.area,
      feature: e.feature,
      match_tokens: e.matchTokens,
      title: e.title,
      may_indicate: e.mayIndicate,
      urgency: e.urgency,
      watch_for: e.watchFor,
      related_concern: e.relatedConcern,
      source_name: e.source.name,
      source_url: e.source.url ?? null,
    }));
    const { error } = await supabase
      .from("symptom_kb_entries")
      .upsert(rows, { onConflict: "area,title", ignoreDuplicates: true });
    cache = null;
    if (error) return { ok: false, count: 0, error: error.message };
    return { ok: true, count: rows.length };
  },

  /** Fetch a single remote entry for the edit form. */
  async getById(id: string): Promise<SymptomKbAdminRow | null> {
    const { data, error } = await supabase
      .from("symptom_kb_entries")
      .select(
        "id, species, area, feature, match_tokens, title, may_indicate, urgency, watch_for, related_concern, source_name, source_url, review_status",
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return { ...mapRow(data as KbRow), dbId: (data as { id: string }).id };
  },

  /** Create or update an entry (admin-only via RLS). New entries are always
   *  `needs_vet_review`; edits preserve the existing status (the vet re-toggles). */
  async upsertEntry(input: {
    id?: string;
    species: KbSpecies;
    area: KbArea;
    feature: string;
    matchTokens: string[];
    title: string;
    mayIndicate: string;
    urgency: KbUrgency;
    watchFor: string[];
    relatedConcern: string;
    sourceName: string;
    sourceUrl?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const row = {
      species: input.species,
      area: input.area,
      feature: input.feature || input.area,
      match_tokens: input.matchTokens,
      title: input.title,
      may_indicate: input.mayIndicate,
      urgency: input.urgency,
      watch_for: input.watchFor,
      related_concern: input.relatedConcern || null,
      source_name: input.sourceName || null,
      source_url: input.sourceUrl || null,
    };
    const { error } = input.id
      ? await supabase.from("symptom_kb_entries").update(row).eq("id", input.id)
      : await supabase.from("symptom_kb_entries").insert({ ...row, review_status: "needs_vet_review" });
    cache = null;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  /** Promote/demote an entry's review status (admin-only via RLS). */
  async setReviewStatus(id: string, status: KbReviewStatus): Promise<{ ok: boolean; error?: string }> {
    const patch =
      status === "vet_reviewed"
        ? { review_status: "vet_reviewed", reviewed_by: getUserId(), last_reviewed_at: new Date().toISOString() }
        : { review_status: "needs_vet_review", reviewed_by: null, last_reviewed_at: null };
    const { error } = await supabase.from("symptom_kb_entries").update(patch).eq("id", id);
    cache = null;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
};
