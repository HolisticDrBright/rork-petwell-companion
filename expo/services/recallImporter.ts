import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePetFoodRecalls, type OpenFdaRecall } from "@/lib/food/recallNormalize";
import type { Database, Json } from "@/types/db";

/**
 * openFDA Food Enforcement → recall_events importer. Fetches recent FDA food
 * recalls, filters to pet/animal food (pure logic in recallNormalize), dedupes
 * by FDA recall number, brand-matches where possible (brand-level, NOT an exact
 * product recall), and logs the run. Marked `verified_official`.
 *
 * The Supabase client is INJECTED so this runs in two contexts:
 *  - server-side (scripts/import-recalls.ts) with a SERVICE-ROLE key — RLS limits
 *    recall_events writes to admin/service-role, so writes need that key;
 *  - in-app from a protected admin screen (passing the app's authed client).
 * It imports no React Native modules, so it's safe to run under Bun/Node.
 */

type Db = SupabaseClient<Database>;

const OPENFDA_URL = "https://api.fda.gov/food/enforcement.json";
const asJson = (v: unknown): Json => v as unknown as Json;

export interface ImportResult {
  seen: number;
  created: number;
  skipped: number;
  errors: string[];
}

async function fetchRecentFoodRecalls(limit: number): Promise<OpenFdaRecall[]> {
  const url = `${OPENFDA_URL}?sort=recall_initiation_date:desc&limit=${Math.min(1000, limit)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`openFDA HTTP ${res.status}`);
  const json = (await res.json()) as { results?: OpenFdaRecall[] };
  return json.results ?? [];
}

/** Brand-level match only — we never claim an exact product recall from a name. */
async function matchBrand(db: Db, brandName: string | null): Promise<string | null> {
  if (!brandName) return null;
  const token = brandName.split(/\s+/)[0];
  if (!token || token.length < 3) return null;
  const { data } = await db.from("food_brands").select("id").ilike("name", `%${token}%`).limit(1);
  return data?.[0]?.id ?? null;
}

export const recallImporter = {
  /** Pull recent pet-food recalls and upsert them. Best-effort + logged. */
  async run(db: Db, opts: { limit?: number } = {}): Promise<ImportResult> {
    const result: ImportResult = { seen: 0, created: 0, skipped: 0, errors: [] };
    const { data: run } = await db
      .from("data_import_runs")
      .insert({ source: "openfda_recalls", status: "running" })
      .select("id")
      .maybeSingle();
    const runId = run?.id ?? null;

    try {
      const raw = await fetchRecentFoodRecalls(opts.limit ?? 200);
      result.seen = raw.length;
      const recalls = normalizePetFoodRecalls(raw);

      for (const n of recalls) {
        try {
          const brandId = await matchBrand(db, n.brandName);
          const { error } = await db.from("recall_events").upsert(
            {
              fda_recall_number: n.fdaRecallNumber,
              event_id: n.eventId,
              recall_date: n.recallDate,
              reason: n.reason,
              severity: n.severity,
              classification: n.classification,
              status: n.status,
              distribution: n.distribution,
              source_url: n.sourceUrl,
              dedup_key: n.dedupKey,
              brand_id: brandId,
              brand_match_level: brandId ? "brand" : "unmatched",
              evidence_status: "verified_official",
              last_reviewed_at: new Date().toISOString(),
              raw_payload: asJson(n.raw),
            },
            { onConflict: "dedup_key" }
          );
          if (error) {
            result.skipped++;
            result.errors.push(error.message);
          } else {
            result.created++;
          }
        } catch (e) {
          result.skipped++;
          result.errors.push(e instanceof Error ? e.message : String(e));
        }
      }

      if (runId) {
        await db
          .from("data_import_runs")
          .update({
            status: "success",
            finished_at: new Date().toISOString(),
            records_seen: result.seen,
            records_created: result.created,
            records_skipped: result.skipped,
            errors: result.errors.length ? asJson(result.errors) : null,
          })
          .eq("id", runId);
      }
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
      if (runId) {
        await db
          .from("data_import_runs")
          .update({ status: "error", finished_at: new Date().toISOString(), errors: asJson(result.errors) })
          .eq("id", runId);
      }
    }
    return result;
  },
};
