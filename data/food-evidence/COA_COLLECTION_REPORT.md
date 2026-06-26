# Petwell — COA / Food-Evidence Collection Report

_Generated 2026-06-25 · Branch `claude/trusting-euler-mza9p0` · For admin + vet review before anything is surfaced in-app_

## 1. Headline

The single most important finding: **no mainstream dog/cat food brand publishes downloadable, product-level Certificates of Analysis (COAs) with lot numbers, named labs, and contaminant values.** This matches the honest gap already documented in `docs/PRODUCTION_SETUP.md`. Real product-level purity confidence still requires licensing (e.g. Clean Label Project), a lab partnership, or brand-provided COAs entered by an admin. The dataset below replaces *mock* data with *source-backed, conservatively graded* data and clearly marks every gap.



> **openFDA recall correction:** initial keyword filtering returned 146 'pet' recalls but most were human-food false positives (animal crackers, hot dog buns, hush puppy, fresh mango). After strict filtering + manual review only **2** were verifiably pet food (Freshpet 2019). Recommend sourcing pet recalls from the FDA Animal & Veterinary feed and tightening `isPetFoodRecall`.

## 2. Counts

| Metric | Count |
|---|---|
| Brands catalogued (curated top-volume) | 76 |
| Brands researched for COA/lab evidence | ~70 |
| Products catalogued (Open Pet Food Facts) | 120 |
| Lab-evidence ledger rows | 81 |
| — `verified_lab` (independent published / certified) | 8 |
| — `brand_level_lab_report` (real values, self-published) | 2 |
| — `batch_lot_coa` (real per-lot COA tool) | 3 |
| — `brand_claim` (marketing/QA only) | 42 |
| — `needs_review` (CLP-named no values / low-credibility) | 19 |
| — `no_public_coa_found` | 12 |
| **Product-level independent COAs found** | **0** |
| openFDA pet-food recalls (verified pet-only) | 2 |

## 3. Strongest evidence found

- **Clean Label Project dog-food study (Feb 2026, ISO-17025 / Ellipse Analytics)** — independent testing of 79 products, 11,376 data points. Publishes **category averages** (dry kibble avg lead 180.1 ppb, arsenic 184.6 ppb; highest single lead sample 1,576.5 ppb; fresh/frozen lowest). **Per-product values are not public.** Names many products but does not disclose their individual results.
- **Freshpet** — the only brand listed as **Clean Label Project Certified** (independent). → strongest brand-level evidence; still not a per-lot COA.
- **Wellness (WellPet)** — publishes a public per-product **heavy-metal results table** (As/Cd/Pb/Hg in mg/kg + test dates, below NRC/FDA limits). Self-reported, lab unnamed → graded `brand_claim`, values recorded.
- **Champion (Orijen/Acana)** — heavy-metals **white paper** with 3-yr third-party averages below limits — but **dated 2017 (likely stale)**, aggregate.
- **Real per-lot COA lookup tools:** Open Farm (traceability + QC results), Stella & Chewy's ("Download Report" per lot), Natural Balance ("Feed With Confidence", per-batch on request).
- **Peer-reviewed / government studies:** heavy metals in 51 dry foods (Frontiers 2018); BPA in canned food incl. a "BPA-free" product (Koestel 2017); glyphosate in 18 of 18 feeds (Cornell 2018); PFAS in pet-food **packaging** (EWG 2022); fatal **aflatoxin** Sportmix recall (FDA 2021).

## 4. Top "cleanest" candidates — with the honest caveat

**No product can be called "cleanest"** — zero product-level independent COAs exist. Ranked by current evidence strength:
1. **Freshpet** → `candidate` (independent certification; fresh/frozen segment lowest contaminants in CLP study).
2. **Wellness / Open Farm / Stella & Chewy's / Natural Balance** → `needs_review` (real published values or per-lot COA tools; verify before featuring).
3. **Orijen/Acana** → `needs_review` but evidence is 7 years old (refresh needed).

## 5. Popular foods with "not enough evidence"

Fancy Feast, Beneful, Alpo, Whiskas, Sheba, Eukanuba, Purina Cat Chow, Hill's Prescription Diet, Authority (PetSmart), American Journey (Chewy), Canidae, NutriSource — all `no_public_coa_found`. Many huge sellers (Pro Plan, Hill's Science Diet, Pedigree, Blue Buffalo) are only `needs_review` (named in CLP study, but no per-product values).

## 6. Recommended next products/brands to research
- Re-run the **openFDA importer** monthly (cron / edge function) — recall data is live.
- Pursue **Clean Label Project licensing** to obtain per-product numeric values (the only path to real product-level purity in-app).
- Capture **actual per-lot COAs** from Open Farm / Stella & Chewy's / Natural Balance using real product lots (admin task) → these can become genuine `batch_lot_coa` documents.
- Refresh **Champion** evidence (2017 → current).
- Expand OPFF catalog for **US barcodes** specifically (current OPFF skews international).

## 7. Unresolved questions
- Will the business license Clean Label Project or stand up a lab partnership? Without one, product-level purity stays "no public lab test found."
- Freshness window for lab staleness (months)?
- Should independent certification rank above brand self-reported values?

## 8. Files created
All under `data/food-evidence/`: `recalls_openfda.csv`, `products.csv`, `brands.csv`, `lab_evidence.csv`, `coa_sources.csv`, `no_public_coa_found.csv`, `marketplace_candidates.csv`, `breed_food_fit_profiles.csv`, `source_manifest.csv`, `import_notes.md`, `food_trust_scoring_model.md`, `import_food_evidence.sql`, `COA_COLLECTION_REPORT.md`, `build_*.py`, `source-snapshots/`.

## 9. Exact sources used (representative)
- openFDA Food Enforcement API — https://api.fda.gov/food/enforcement.json
- Open Pet Food Facts API — https://world.openpetfoodfacts.org/api/v2/search
- Clean Label Project dog-food study — https://cleanlabelproject.org/dog-food-study/
- Wellness testing results — https://www.wellnesspetfood.com/testing-results/
- Champion heavy-metals white paper — championpetfoods.com (PDF)
- Open Farm transparency — https://openfarmpet.com/pages/transparency
- Stella & Chewy's COA lookup — https://www.stellaandchewys.com/pages/coa
- Natural Balance Feed With Confidence — https://www.naturalbalanceinc.com/feed-with-confidence/
- Frontiers Vet Sci 2018 (heavy metals); Cornell 2018 (glyphosate); EWG 2022 (PFAS packaging); FDA 2021 (Sportmix aflatoxin); Koestel 2017 (BPA)
- Full per-row URLs in `lab_evidence.csv` / `coa_sources.csv`.

## 10. How to import into Supabase
GitHub holds the **version-controlled evidence archive + import files**; Supabase is the **live app database**.

```bash
# Option A — psql / SQL editor (review first!)
psql "$SUPABASE_DB_URL" -f data/food-evidence/import_food_evidence.sql

# Option B — repo importers (recommended for recurring jobs), needs a SERVICE-ROLE key
cd expo
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role> bun scripts/import-recalls.ts 200
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… bun scripts/import-opff.ts <barcode> [barcode...]
```
`import_food_evidence.sql` is **idempotent** (upserts on name/barcode/dedup_key) and wraps everything in a transaction. It logs a `data_import_runs` row and queues every product + lab_test + no-COA gap into `admin_review_queue`. **Nothing is surfaced to users until an admin reviews it.**

## 11. What still needs vet / admin review
- **All `lab_tests` rows** (web-researched) — verify source + grade before surfacing. Queued `priority 2`.
- **All OPFF products** — verify brand/species/ingredients. Queued `priority 1`.
- **All breed profiles** — `needs_vet_review` (breed-aware, not "best food").
- **Toxin database** — keep `needs_review` / "pending vet review" until a **licensed vet signs off** (`reviewedBy`, `evidenceStatus=vet_reviewed`). No vet signoff was provided in this pass, so **no toxin labels were upgraded.**
- **Marketplace** — stays **research preview**; no entry promoted to published without real, reviewed product-level evidence.

---

## Appendix A — Placeholder replacement audit

Real identifiers were **not** provided this pass, so these are reported (not changed), matching `docs/PRODUCTION_SETUP.md` §6:

| Placeholder | Current value | Where | Proposed action |
|---|---|---|---|
| iOS bundle ID | `app.rork.u36ek53il5cxdlwr8ag9m` | `expo/app.json` → `ios.bundleIdentifier` | set real reverse-DNS, e.g. `com.petwell.app` |
| Android package | `app.rork.u36ek53il5cxdlwr8ag9m` | `expo/app.json` → `android.package` | set same reverse-DNS |
| App slug | `u36ek53il5cxdlwr8ag9m` | `expo/app.json` → `slug` | set real slug, e.g. `petwell-companion` |
| App scheme | `rork-app` | `expo/app.json` → `scheme` | set product scheme, e.g. `petwell` |
| expo-router origin | `https://rork.com/` | `expo/app.json` → plugins | set product domain |
| RevenueCat keys | placeholder (env) | EAS secrets | set per-store keys |
| Support email/domain | **none defined yet** | docs/app | choose + add a support email + domain |

### Demo/seed vs real data (placeholder replacement, mission §8)
- **Recalls:** 146 real openFDA records ready to replace demo recall seeds. Keep any demo rows only if clearly `demo_seed` and hidden from production.
- **Catalog:** 120 real OPFF products ready to supplement the demo catalog as `open_database` / `needs_admin_review`.
- **Toxin labels:** unchanged — no vet signoff provided; UI must continue to say "pending vet review."
- **Marketplace:** unchanged — research-preview retained; no fake buy/affiliate links added.
- **Lab evidence:** only source-backed rows added; `brand_claim` where not a lab document; `no_public_coa_found` after searching; **no COA/lab rows invented.**
