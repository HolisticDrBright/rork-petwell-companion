# Import notes — Petwell food evidence (2026-06-25)

## What's here
| File | Rows | What it is |
|---|---|---|
| `recalls_openfda.csv` | 2 (verified pet-only; see note) | Real openFDA Food Enforcement pet/animal-food recalls (2012–2026), normalized + deduped per the repo's `recallNormalize` logic. |
| `products.csv` | 120 | Open Pet Food Facts catalog (top by scans + completeness), barcode-keyed, `open_database` / `needs_admin_review`. |
| `brands.csv` | 76 | Curated top-volume brands + public ownership metadata + best evidence found. |
| `lab_evidence.csv` | 81 | Full lab/COA evidence ledger (conservatively graded). |
| `coa_sources.csv` | 29 | Positive evidence sources only (COAs, lot tools, brand value reports, studies). |
| `no_public_coa_found.csv` | 12 | Brands searched with no public COA. |
| `marketplace_candidates.csv` | 9 | Marketplace candidates; research-preview retained; no fake links. |
| `breed_food_fit_profiles.csv` | 20 | Breed-aware considerations; `needs_vet_review`. |
| `source_manifest.csv` | 10 | Provenance manifest for every file + raw snapshots. |
| `source-snapshots/` | — | Raw normalized JSON for openFDA + OPFF (provenance). |
| `import_food_evidence.sql` | — | Idempotent Supabase import (see below). |
| `build_*.py` | — | Reproducible build scripts (re-runnable). |

## Controlled vocabularies (must match `provenance.ts` + migration 0016)
- **source_type:** real_product_coa · batch_lot_coa · brand_level_lab_report · brand_marketing_claim · third_party_lab_summary · public_study · no_public_coa_found
- **status:** pass · not_detected · elevated · fail · unknown
- **evidence_level:** product · brand · batch · study · claim_only
- **evidence_status (CSV):** verified_lab · brand_claim · needs_review · no_public_coa_found
- **DB `evidence_status` enum:** verified_official · verified_lab · brand_claim · open_database · crowdsourced_unverified · admin_reviewed · demo_seed · stale · rejected

### Mapping CSV → DB on import
- `needs_review` and `no_public_coa_found` are **not** inserted as lab results. They go to `evidence_sources` + `admin_review_queue` so they can't imply a passing test.
- Brand-published values (`brand_level_lab_report`) and per-lot tools (`batch_lot_coa`) enter `lab_tests` at **`level='brand'`/`'batch'`, never `'product'`**, so the scoring engine cannot read them as verified product-level purity.
- DB `evidence_status='verified_lab'` is reserved for **independent published** evidence (studies + independent certification). Everything else → `brand_claim`.
- openFDA recalls → `verified_official`. Brand matches are **brand-level only**.

## Two integrity flags (deliberately kept honest)
1. A search summary claimed **Nulo publishes a full CoA per SKU** with specific lead averages. The brand site did **not** contain this — treated as **fabricated and rejected**; Nulo is `brand_claim`.
2. **NaturalNews/Forensic Food Lab** "A-3" Friskies rating is included but flagged **low-credibility** and set `needs_review` (not a peer-reviewed source).

## Re-running the build
```bash
cd data/food-evidence
python3 build_lab_evidence.py   # lab_evidence.csv, coa_sources.csv, no_public_coa_found.csv
python3 build_catalog.py        # brands.csv, marketplace_candidates.csv, breed_food_fit_profiles.csv, source_manifest.csv
python3 build_sql.py            # import_food_evidence.sql
# recalls + OPFF are pulled live; see git history / source-snapshots for the captured set.
```

## openFDA recall limitation (important)
openFDA's `food/enforcement.json` is overwhelmingly HUMAN food. Keyword filtering (the approach in the repo's `recallNormalize.isPetFoodRecall`) produces many false positives ("animal crackers", "hot dog buns", "hush puppy", "fresh mango"). After strict filtering + manual review, only **2** entries (Freshpet refrigerated dog food, 2019 temperature-abuse recalls) were verifiably pet food. **Recommendation:** source pet recalls from the FDA Animal & Veterinary recall feed / FDA recalls RSS instead of the human food/enforcement endpoint, and tighten `isPetFoodRecall`. The broader 54-row strict pull is preserved in git history but NOT loaded live to avoid injecting human-food recalls.
