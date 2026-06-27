# Petwell — Food Evidence Model

How Petwell talks about pet food **without overclaiming**. The product is built on
one principle: **separate recognizing a product from making health/purity claims
about it**, and never present brand- or study-level information — or demo data — as
if a specific product was tested.

> Petwell never says a food is "clean", "cleanest", "purest", "safest",
> "contaminant-free", or "lab-verified" unless real, current, public, product-level
> lab/COA evidence exists. When it doesn't, we say so plainly.

## Two separate questions

1. **What is this product?** — barcode/label/name recognition. Powered by the local
   catalog and Open Pet Food Facts, and the scalable matcher
   (`match_food_products` RPC, migration `0020`, with a client fallback). Recognition
   is *identity only* — matching a label to a catalog row makes **no** health claim.
2. **What do we actually know about it?** — the evidence layer below. Purity,
   recalls, and transparency are graded by provenance and never inflated by a match.

## Evidence status (provenance grade)

Every food/lab/recall row carries an `evidence_status` (enum, migration `0016`):

| Status | Meaning | Can raise product-level purity? |
|---|---|---|
| `verified_official` | official regulator data (e.g. FDA recall) | recalls only — never "purity" |
| `verified_lab` | a real, current, **product-level** COA | ✅ (the only thing that can) |
| `admin_reviewed` | a human admin reviewed/approved it | ✅ if also product-level + passing |
| `brand_claim` | brand-published / brand-level values | ❌ brand-level, capped |
| `open_database` | open/crowdsourced import (OPFF) | ❌ identity/pending review |
| `crowdsourced_unverified` | user submission, pending review | ❌ |
| `demo_seed` | illustrative/fictional sample data | ❌ — hidden in production |
| `stale` | expired evidence (past `expires_at`) | ❌ downgraded automatically |
| `rejected` | reviewed and rejected | ❌ |

The hard rule lives in `expo/lib/food/provenance.ts` →
`countsAsProductLevelPurity()`: a row counts toward product-level purity **only if**
it is not demo, has a `pass` result, is `level = 'product'`, and its status is in the
trusted set. Demo, brand-level, and study-level rows can never reach "supported"
purity — proven by `expo/tests/dataMode.test.ts` and
`expo/tests/petEmptyState.test.ts`.

## The fields a result uses

A food result (`expo/lib/food/*`, surfaced in `app/food-result.tsx`) is built from
conservative, separated sub-scores — never a single "is it clean" verdict:

- **`ingredient_quality`** — from the ingredient deck + flags (allergens, fillers,
  by-products, preservatives). Transparent, not a purity claim.
- **`nutrition_fit`** — fit to *this pet* (species, life stage, conditions). Personal,
  not a product grade.
- **`recall_risk`** — brand/product recall history. A brand-level recall reads
  "Brand-level recall match", **not** "Official FDA recall" for the exact product.
- **`evidence_confidence`** — how much real evidence backs the result. Low by default.
- **`verified_lab`** — true only when a current product-level COA exists.
- **`no_public_coa_found`** — the honest default for most products: "No public
  product-level COA found as of <date>." A photo/scan can never set this to verified.
- **`needs_review`** — imported/crowdsourced/AI-extracted data awaiting an admin.

Supporting sub-scores (`contaminant_confidence`, `brand_transparency`,
`personal_outcome`) follow the same conservative caps. A scan/photo **never** raises
contaminant confidence — heavy metals/PFAS/mycotoxins aren't visible in a picture,
and the UI says so.

## Production vs. demo data

- The early seed catalog (`0006`, `0010`) is **fictional** ("(sample)" brands). It is
  marked `evidence_status = 'demo_seed'` (migration `0019`) and **hidden from every
  production user-facing surface** — search, label/barcode match, bundles,
  alternatives — by `excludeDemoProducts()` (`expo/lib/food/productVisibility.ts`).
  The filter is null-safe: it drops only `demo_seed`, keeping real `null` /
  `open_database` rows. Dev/admin builds still see demo rows.
- **Admin → Data Source Status** shows demo/seed vs. real counts so the team can
  audit and clean up seed data.

## Where data lives

- **Source manifests / import files live in the repo** (versioned, reviewable):
  `data/food-evidence/` (COA collection reports, the trust-scoring model, import
  SQL) and the importers in `expo/scripts/import-*.ts` +
  `expo/services/*Importer.ts`.
- **Live app records live in Supabase** (never committed): products, lab rows,
  recalls, evidence sources, submissions.
- Any **seeded evidence dataset that ships is labeled and source-backed** — a row
  either cites a real public source or is graded `demo_seed` and excluded from
  production. Petwell never invents a COA.

## How real evidence enters (provenance by importer)

| Source | Importer | Status it writes | Becomes user-trusted when |
|---|---|---|---|
| Open Pet Food Facts | `import-opff.ts` | `open_database` | an admin reviews → `admin_reviewed` |
| FDA recalls (openFDA) | `import-recalls.ts` | `verified_official` | immediately (safety-critical; brand-matched at most) |
| User submissions | in-app submit | `crowdsourced_unverified` | an admin reviews |
| COA / lab research | manual + AI extract | `needs_review` (never auto `verified_lab`) | an admin attaches a current product-level COA |

Nothing imported is auto-published. See `docs/DATA_REFRESH.md` for cadence and the
admin review flow, and `data/food-evidence/food_trust_scoring_model.md` for the
scoring ladder + caps.

## AI and food

AI label/COA extraction (`supabase/functions/ai-vision-label`, `ai-coa-extract`) only
ever produces **editable text** or a **`needs_review`** queue item — never a
`verified_lab` row and never a purity claim. The model assists recognition and
data-entry; humans and provenance rules decide trust.
