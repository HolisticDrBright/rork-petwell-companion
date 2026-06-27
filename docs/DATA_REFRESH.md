# Petwell — Data Refresh Policy

How often each evidence source is refreshed, who runs it, and the trust guardrails
that apply. The governing rule: **no refreshed data is shown to users until an admin
reviews it.** Every importer writes provenance-graded rows and enqueues them into
`admin_review_queue`; nothing is auto-published.

## Cadence

| Source | Cadence | Trigger | Auto? | Notes |
|---|---|---|---|---|
| **FDA recalls** (openFDA food enforcement) | **Weekly** (Mon 07:00 UTC) | `.github/workflows/data-refresh.yml` → `recalls` | ✅ automated | Recall data is live and safety-critical. Brand-matched at most (brand-level ≠ exact-product recall). Marked `verified_official`. |
| **Open Pet Food Facts** catalog | **Monthly** (1st, 08:00 UTC) | same workflow → `opff` | ✅ automated | Re-imports the barcodes we already track. Open/crowdsourced → `open_database`, `review_status=pending`. New products come from the in-app submission queue. |
| **COA / lab-evidence search** | **Quarterly** | manual research pass (Claude coworker + human) | ❌ manual | Web research can't be safely automated. See `data/food-evidence/COA_COLLECTION_REPORT.md`. Findings graded `brand_claim` / `verified_lab` / `needs_review` / `no_public_coa_found`; **no COA is ever invented.** |
| **Marketplace candidates** | **Quarterly** | manual review | ❌ manual | Stays research-preview. An entry only moves `needs_review → candidate → published` on real, reviewed, product-level evidence. |
| **Breed food-fit profiles** | **Vet-reviewed before release** | manual + licensed vet sign-off | ❌ manual | All rows stay `needs_vet_review` until a vet signs off. Breed is always secondary to the pet profile. |
| **Toxin / integrative protocols** | On change, **vet-reviewed before release** | manual + licensed vet sign-off | ❌ manual | Stay "pending vet review" until a licensed vet signs off (`reviewedBy`, `evidence_status` upgraded). |

## Why recalls use the openFDA *food* endpoint

Pet/animal recalls are filed in openFDA's **food** enforcement API. The FDA
"Animal & Veterinary → Recalls & Withdrawals" pages
(<https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals>) are the
human-readable view of the same enforcement reports — there is no separate animal
enforcement API. The importer therefore queries the food endpoint with a **pet-biased
search** (to surface more genuine pet recalls within the fetch limit) and applies the
conservative `isPetFoodRecall` filter, which hard-excludes human-food false positives
(hot dog buns, corn dogs, animal crackers, hush puppies, catfish, …). If the biased
query ever fails or returns nothing, it falls back to the broad date-sorted fetch, so
behavior degrades gracefully and never breaks.

## Running a refresh manually

The scheduled jobs are also available via **workflow_dispatch** (Actions → "Data
refresh" → Run workflow → pick `recalls`, `opff`, or `both`). Locally:

```bash
cd expo
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  bun scripts/import-recalls.ts 300
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  bun scripts/import-opff.ts <barcode> [barcode...]
```

Both are idempotent (upsert on `dedup_key` / barcode) and log a `data_import_runs`
row. **Requires a service-role key** (RLS blocks the anon key from writing reference
tables). The GitHub jobs no-op if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
secrets are absent.

## Demo / seed data in production

`demo_seed` rows (illustrative lab/contaminant/recall seeds) are **hidden from
production user-facing views** by the data-mode filter in `foodService.getBundles`
(see `expo/lib/dataMode.ts`). They never raise purity and never read as verified.
They remain visible in **dev/demo mode and the Admin → Data Source Status** panel
(which shows demo/seed counts) so the team can clean them up. Production builds
also never auto-seed demo pets — see `docs/PRODUCTION_SETUP.md` §1i.

## After every refresh

1. Open the in-app **Admin review** screen (or query `admin_review_queue`).
2. Approve / reject / merge each queued item. Only reviewed data becomes user-facing.
3. Lab evidence stays brand/study-level (and never reads as product-level purity)
   until a real, current, **product-level** COA is attached and verified — see
   `data/food-evidence/food_trust_scoring_model.md` and the in-app
   "How Petwell scores food" page.
