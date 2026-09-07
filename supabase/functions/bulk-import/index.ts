/**
 * bulk-import — server-side data jobs (admin/ops only, NOT a user endpoint).
 *
 *   ?job=recalls  openFDA food-enforcement → recall_events (pet-filtered,
 *                 dedup_key upsert; mirrors services/recallImporter.ts +
 *                 lib/food/recallNormalize.ts).
 *   ?job=opff     Full Open Pet Food Facts CSV → food_brands/food_products
 *                 (named pet products only; species/type from category tags;
 *                 open_database + exact_barcode, deduped by barcode; mirrors
 *                 services/openPetFoodFactsImporter.ts conventions).
 *
 * Auth: requires header `x-import-secret` equal to the IMPORT_SECRET function
 * secret. With no secret set the function refuses everything, so it is inert
 * until an operator sets one (supabase secrets set IMPORT_SECRET=…).
 * Deployed with verify_jwt=false because callers are ops tooling (pg_net /
 * curl), not app users; the shared secret is the gate.
 *
 * Jobs run in the background (EdgeRuntime.waitUntil) and report progress into
 * data_import_runs — poll that table for status/counts.
 */

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SECRET = Deno.env.get("IMPORT_SECRET") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const OPENFDA_URL = "https://api.fda.gov/food/enforcement.json";
const OPFF_CSV_URL = "https://static.openpetfoodfacts.org/data/en.openpetfoodfacts.org.products.csv.gz";

function restHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...extra };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SB_URL}/rest/v1${path}`, { ...init, headers: restHeaders((init.headers ?? {}) as Record<string, string>) });
}

async function startRun(source: string): Promise<string | null> {
  const res = await rest("/data_import_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ source, status: "running" }),
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { id: string }[];
  return rows[0]?.id ?? null;
}

async function finishRun(
  runId: string | null,
  patch: { status: string; records_seen?: number; records_created?: number; records_skipped?: number; errors?: unknown },
): Promise<void> {
  if (!runId) return;
  await rest(`/data_import_runs?id=eq.${runId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() }),
  });
}

async function exactCount(pathWithFilter: string): Promise<number> {
  const res = await rest(`${pathWithFilter}&limit=1`, { method: "GET", headers: { Prefer: "count=exact" } });
  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1] ?? "0");
  await res.body?.cancel();
  return Number.isFinite(total) ? total : 0;
}

// ── openFDA recall normalization (ported from lib/food/recallNormalize.ts) ────

interface OpenFdaRecall {
  recall_number?: string;
  event_id?: string;
  status?: string;
  classification?: string;
  product_description?: string;
  reason_for_recall?: string;
  recall_initiation_date?: string;
  recalling_firm?: string;
  distribution_pattern?: string;
  product_type?: string;
}

const HUMAN_FOOD_FALSE_POSITIVE =
  /\b(hot ?dogs?|corn ?dogs?|chili ?dogs?|dog ?buns?|hush ?pupp(?:y|ies)|puppy ?chow|animal ?crackers?|cat ?fish|dog ?fish|cat ?tongue)\b/i;
const HUMAN_ONLY_HINT = /\b(infant formula|baby food|human consumption|for human)\b/i;
const STRONG_PET_SIGNAL =
  /\b(dog food|cat food|pet food|puppy food|kitten food|dog treats?|cat treats?|pet treats?|dog chews?|rawhide|kibble|canine|feline|dog biscuits?|dog cookies?|pet supplement|companion animal|dog snacks?|cat snacks?|dog diet|cat diet)\b/i;
const ANIMAL_FEED = /\banimal (?:feed|food)\b/i;
const COMPANION_HINT = /\b(dogs?|cats?|pupp(?:y|ies)|kittens?|pets?|companion)\b/i;
const WEAK_PET_TOKEN = /\b(dogs?|cats?|pupp(?:y|ies)|kittens?|pets?)\b/i;
const FOOD_CONTEXT =
  /\b(food|treats?|chews?|kibble|diet|feed|snacks?|biscuits?|cookies?|jerky|nuggets?|formula|supplement|pate|meal|gravy|broth)\b/i;

function isPetFoodRecall(r: OpenFdaRecall): boolean {
  const hay = `${r.product_description ?? ""} ${r.product_type ?? ""} ${r.reason_for_recall ?? ""}`;
  if (HUMAN_FOOD_FALSE_POSITIVE.test(hay)) return false;
  if (HUMAN_ONLY_HINT.test(hay)) return false;
  if (STRONG_PET_SIGNAL.test(hay)) return true;
  if (ANIMAL_FEED.test(hay)) return COMPANION_HINT.test(hay);
  if (WEAK_PET_TOKEN.test(hay)) return FOOD_CONTEXT.test(hay);
  return false;
}

function isoDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function severityFromClassification(classification: string | undefined): string {
  const c = (classification ?? "").toLowerCase();
  if (c.includes("class i") && !c.includes("class ii")) return "bad";
  return "watch";
}

function recallDedupKey(r: OpenFdaRecall): string {
  if (r.recall_number) return `rn:${r.recall_number.trim()}`;
  const parts = [
    r.event_id ?? "",
    (r.product_description ?? "").slice(0, 60),
    (r.reason_for_recall ?? "").slice(0, 40),
    r.recall_initiation_date ?? "",
  ];
  return `cx:${parts.join("|").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

async function runRecalls(): Promise<void> {
  const runId = await startRun("openfda_recalls");
  const errors: string[] = [];
  try {
    // One field per query: openFDA silently misparses a top-level OR that spans
    // two fields (verified live: the combined query matches 20 records, the
    // per-field ones 136+). Terms use `+` separators, parens percent-encoded.
    const searches = [
      "product_description%3A%28dog+OR+cat+OR+pet+OR+puppy+OR+kitten+OR+canine+OR+feline+OR+kibble%29",
      "reason_for_recall%3A%28dog+OR+cat+OR+pet+OR+animal%29",
    ];
    let raw: OpenFdaRecall[] = [];
    for (const s of searches) {
      try {
        const res = await fetch(`${OPENFDA_URL}?search=${s}&limit=1000`);
        if (res.ok) raw = raw.concat(((await res.json()) as { results?: OpenFdaRecall[] }).results ?? []);
      } catch {
        // best-effort per field
      }
    }
    if (raw.length === 0) {
      const res = await fetch(`${OPENFDA_URL}?sort=recall_initiation_date:desc&limit=1000`);
      if (!res.ok) throw new Error(`openFDA HTTP ${res.status}`);
      raw = ((await res.json()) as { results?: OpenFdaRecall[] }).results ?? [];
    }

    const seenKeys = new Set<string>();
    const brandsRes = await rest("/food_brands?select=id,name&limit=2000");
    const brands = (await brandsRes.json()) as { id: string; name: string }[];
    const matchBrand = (firm: string | null): string | null => {
      if (!firm) return null;
      const token = firm.split(/\s+/)[0]?.toLowerCase() ?? "";
      if (token.length < 3) return null;
      return brands.find((b) => b.name.toLowerCase().includes(token))?.id ?? null;
    };

    const rows: Record<string, unknown>[] = [];
    for (const r of raw) {
      if (!isPetFoodRecall(r)) continue;
      const dedupKey = recallDedupKey(r);
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      const recallNumber = r.recall_number?.trim() || null;
      const brandId = matchBrand(r.recalling_firm?.trim() || null);
      rows.push({
        fda_recall_number: recallNumber,
        event_id: r.event_id ?? null,
        recall_date: isoDate(r.recall_initiation_date),
        reason: (r.reason_for_recall ?? "Reason not stated").trim(),
        severity: severityFromClassification(r.classification),
        classification: r.classification ?? null,
        status: r.status ?? null,
        distribution: r.distribution_pattern ?? null,
        source_url: recallNumber
          ? `https://api.fda.gov/food/enforcement.json?search=recall_number:%22${encodeURIComponent(recallNumber)}%22`
          : "https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals",
        dedup_key: dedupKey,
        brand_id: brandId,
        brand_match_level: brandId ? "brand" : "unmatched",
        evidence_status: "verified_official",
        last_reviewed_at: new Date().toISOString(),
        raw_payload: r,
      });
    }

    const before = await exactCount("/recall_events?select=id&evidence_status=eq.verified_official");
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const res = await rest("/recall_events?on_conflict=dedup_key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) errors.push(`recalls chunk ${i}: HTTP ${res.status} ${await res.text()}`);
    }
    const after = await exactCount("/recall_events?select=id&evidence_status=eq.verified_official");

    await finishRun(runId, {
      status: errors.length ? "error" : "success",
      records_seen: raw.length,
      records_created: after - before,
      records_skipped: rows.length - (after - before),
      errors: errors.length ? errors.slice(0, 10) : null,
    });
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    await finishRun(runId, { status: "error", errors: errors.slice(0, 10) });
  }
}

// ── Open Pet Food Facts bulk import ──────────────────────────────────────────

const TAG_DOG = /(^|[-:])dogs?([-:]|$)|puppy|puppies/;
const TAG_CAT = /(^|[-:])cats?([-:]|$)|kitten/;
const TAG_OTHER_SPECIES = /bird|fish-food|rabbit|rodent|reptile|horse|ferret|hamster|guinea-pig|turtle|poultry/;

interface OpffRow {
  barcode: string;
  name: string;
  brand: string | null;
  species: string;
  product_type: string;
  ingredient_text: string | null;
  image_url: string | null;
  source_url: string;
}

function mapOpffLine(cols: string[], idx: Record<string, number>): OpffRow | null {
  const get = (k: string) => (idx[k] >= 0 ? (cols[idx[k]] ?? "").trim() : "");
  const code = get("code");
  if (!/^\d{6,14}$/.test(code)) return null;
  const name = get("product_name").slice(0, 300);
  if (!name) return null;
  const cats = get("categories_tags").toLowerCase();
  if (cats.includes("en:non-food-products")) return null;
  const tags = cats.split(",");
  const isDog = tags.some((t) => TAG_DOG.test(t));
  const isCat = tags.some((t) => TAG_CAT.test(t));
  if (!isDog && !isCat && tags.some((t) => TAG_OTHER_SPECIES.test(t))) return null;
  const species = isDog && isCat ? "both" : isDog ? "dog" : isCat ? "cat" : "both";
  const product_type = tags.some((t) => t.includes("treat") || t.includes("snack"))
    ? "treat"
    : tags.some((t) => t.includes("supplement"))
      ? "supplement"
      : "food";
  const brandRaw = get("brands").split(",")[0]?.trim().slice(0, 80) ?? "";
  const ingredients = get("ingredients_text").slice(0, 8000);
  const image = get("image_url");
  const url = get("url");
  return {
    barcode: code,
    name,
    brand: brandRaw || null,
    species,
    product_type,
    ingredient_text: ingredients || null,
    image_url: /^https?:\/\//.test(image) ? image : null,
    source_url: /^https?:\/\//.test(url) ? url : `https://world.openpetfoodfacts.org/product/${code}`,
  };
}

async function runOpff(): Promise<void> {
  const runId = await startRun("opff_bulk");
  const errors: string[] = [];
  try {
    const res = await fetch(OPFF_CSV_URL);
    if (!res.ok || !res.body) throw new Error(`OPFF download HTTP ${res.status}`);
    const lines = res.body.pipeThrough(new DecompressionStream("gzip")).pipeThrough(new TextDecoderStream());

    let header: string[] | null = null;
    let idx: Record<string, number> = {};
    const products = new Map<string, OpffRow>();
    let seen = 0;
    let buf = "";
    const handleLine = (line: string) => {
      if (!line) return;
      const cols = line.split("\t");
      if (!header) {
        header = cols.map((c) => c.trim());
        idx = {
          code: header.indexOf("code"),
          url: header.indexOf("url"),
          product_name: header.indexOf("product_name"),
          brands: header.indexOf("brands"),
          categories_tags: header.indexOf("categories_tags"),
          ingredients_text: header.indexOf("ingredients_text"),
          image_url: header.indexOf("image_url"),
        };
        if (idx.code < 0 || idx.product_name < 0) throw new Error("OPFF header missing expected columns");
        return;
      }
      seen++;
      const row = mapOpffLine(cols, idx);
      if (row && !products.has(row.barcode)) products.set(row.barcode, row);
    };
    for await (const chunk of lines) {
      buf += chunk;
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        handleLine(buf.slice(0, nl).replace(/\r$/, ""));
        buf = buf.slice(nl + 1);
      }
    }
    if (buf.trim()) handleLine(buf.replace(/\r$/, ""));

    // Brands first (unique names), then map name → id for the product rows.
    const brandNames = [...new Set([...products.values()].map((p) => p.brand).filter((b): b is string => !!b))];
    for (let i = 0; i < brandNames.length; i += 500) {
      const chunk = brandNames.slice(i, i + 500).map((name) => ({ name }));
      const r = await rest("/food_brands?on_conflict=name", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!r.ok) errors.push(`brands chunk ${i}: HTTP ${r.status} ${await r.text()}`);
    }
    const brandIds = new Map<string, string>();
    for (let offset = 0; ; offset += 1000) {
      const r = await rest(`/food_brands?select=id,name&order=name.asc&limit=1000&offset=${offset}`);
      const page = (await r.json()) as { id: string; name: string }[];
      for (const b of page) brandIds.set(b.name, b.id);
      if (page.length < 1000) break;
    }

    const before = await exactCount("/food_products?select=id&evidence_status=eq.open_database");
    const now = new Date().toISOString();
    const rows = [...products.values()].map((p) => ({
      brand_id: p.brand ? (brandIds.get(p.brand) ?? null) : null,
      name: p.name,
      product_type: p.product_type,
      species: p.species,
      barcode: p.barcode,
      ingredient_text: p.ingredient_text,
      image_url: p.image_url,
      source_url: p.source_url,
      evidence_status: "open_database",
      match_confidence: "exact_barcode",
      last_reviewed_at: now,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const r = await rest("/food_products?on_conflict=barcode", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!r.ok) errors.push(`products chunk ${i}: HTTP ${r.status} ${await r.text()}`);
    }
    const after = await exactCount("/food_products?select=id&evidence_status=eq.open_database");

    await finishRun(runId, {
      status: errors.length ? "error" : "success",
      records_seen: seen,
      records_created: after - before,
      records_skipped: rows.length - (after - before),
      errors: errors.length ? errors.slice(0, 10) : null,
    });
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    await finishRun(runId, { status: "error", errors: errors.slice(0, 10) });
  }
}

Deno.serve((req) => {
  if (!SECRET || req.headers.get("x-import-secret") !== SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  const job = new URL(req.url).searchParams.get("job");
  if (job === "recalls" || job === "opff") {
    EdgeRuntime.waitUntil(job === "recalls" ? runRecalls() : runOpff());
    return new Response(JSON.stringify({ started: job }), { status: 202, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ error: "unknown job" }), { status: 400, headers: { "Content-Type": "application/json" } });
});
