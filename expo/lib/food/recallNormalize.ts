/**
 * openFDA Food Enforcement → normalized recall records. Pure + testable; the
 * network fetch + DB upsert live in services/recallImporter.ts.
 *
 * A brand-level match (we recognized the firm/brand) is NOT the same as an exact
 * product recall — the importer/UI must keep that distinction.
 */

export type Severity = "good" | "watch" | "bad";

/** The openFDA enforcement fields we use (others ignored). */
export interface OpenFdaRecall {
  recall_number?: string;
  event_id?: string;
  status?: string; // Ongoing | Completed | Terminated
  classification?: string; // Class I | Class II | Class III
  product_description?: string;
  reason_for_recall?: string;
  recall_initiation_date?: string; // YYYYMMDD
  recalling_firm?: string;
  distribution_pattern?: string;
  product_type?: string;
  more_code_info?: string;
}

export interface NormalizedRecall {
  fdaRecallNumber: string | null;
  eventId: string | null;
  brandName: string | null;
  productName: string;
  reason: string;
  recallDate: string | null; // ISO YYYY-MM-DD
  classification: string | null;
  status: string | null;
  distribution: string | null;
  severity: Severity;
  sourceUrl: string;
  dedupKey: string;
  raw: OpenFdaRecall;
}

const PET_TERMS =
  /\b(pet|pets|dog|dogs|puppy|puppies|cat|cats|kitten|kittens|canine|feline|animal|animals|kibble|pet food|petfood|dog food|cat food|pet treat|chew|rawhide)\b/i;

const HUMAN_ONLY_HINT = /\b(infant formula|baby food|human consumption only)\b/i;

/** Heuristic: does this FDA food recall concern pet/animal food? */
export function isPetFoodRecall(r: OpenFdaRecall): boolean {
  const hay = `${r.product_description ?? ""} ${r.reason_for_recall ?? ""} ${r.recalling_firm ?? ""} ${r.product_type ?? ""}`;
  if (HUMAN_ONLY_HINT.test(hay)) return false;
  return PET_TERMS.test(hay);
}

function isoDate(yyyymmdd: string | undefined): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function severityFromClassification(classification: string | undefined): Severity {
  const c = (classification ?? "").toLowerCase();
  if (c.includes("class i") && !c.includes("class ii")) return "bad"; // Class I = most serious
  if (c.includes("class ii")) return "watch";
  return "watch";
}

/** Stable key for deduping: prefer the FDA recall number, else a composite. */
export function recallDedupKey(r: OpenFdaRecall): string {
  if (r.recall_number) return `rn:${r.recall_number.trim()}`;
  const parts = [
    r.event_id ?? "",
    (r.product_description ?? "").slice(0, 60),
    (r.reason_for_recall ?? "").slice(0, 40),
    r.recall_initiation_date ?? "",
  ];
  return `cx:${parts.join("|").toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export function normalizeRecall(r: OpenFdaRecall): NormalizedRecall {
  const recallNumber = r.recall_number?.trim() ?? null;
  return {
    fdaRecallNumber: recallNumber,
    eventId: r.event_id ?? null,
    brandName: r.recalling_firm?.trim() || null,
    productName: (r.product_description ?? "Recalled product").trim().slice(0, 300),
    reason: (r.reason_for_recall ?? "Reason not stated").trim(),
    recallDate: isoDate(r.recall_initiation_date),
    classification: r.classification ?? null,
    status: r.status ?? null,
    distribution: r.distribution_pattern ?? null,
    severity: severityFromClassification(r.classification),
    sourceUrl: recallNumber
      ? `https://api.fda.gov/food/enforcement.json?search=recall_number:%22${encodeURIComponent(recallNumber)}%22`
      : "https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals",
    dedupKey: recallDedupKey(r),
    raw: r,
  };
}

/** Filter to pet-food recalls, normalize, and drop duplicates by dedup key. */
export function normalizePetFoodRecalls(results: OpenFdaRecall[]): NormalizedRecall[] {
  const seen = new Set<string>();
  const out: NormalizedRecall[] = [];
  for (const r of results) {
    if (!isPetFoodRecall(r)) continue;
    const n = normalizeRecall(r);
    if (seen.has(n.dedupKey)) continue;
    seen.add(n.dedupKey);
    out.push(n);
  }
  return out;
}
