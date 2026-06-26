# Petwell Food-Trust Scoring Model (conservative draft)

_Last updated: 2026-06-25 · Status: draft for admin/vet review · Aligns with `expo/lib/food/scoring.ts` and `expo/lib/food/provenance.ts`_

## Purpose & guardrails

This model ranks "cleaner / better-fit" foods **without overclaiming**. It is intentionally conservative and mirrors the hard rules already encoded in the app:

- **A photo, barcode, product page, or marketing claim can never establish purity.** Only lab/COA/recall evidence drives contaminant confidence.
- **Products with no lab evidence cannot be ranked "cleanest."** Absence of a public COA is recorded as `no_public_coa_found`, not as "clean."
- **Brand-level evidence is weaker than product-level evidence**, which is weaker only relative to an independent, current product COA.
- **Marketing claims ≠ lab evidence.** Self-published numbers (lab unnamed, no downloadable COA) are `brand_claim`, not `verified_lab`.
- **Recalls are time- and severity-weighted.**
- **Breed considerations are secondary** to the actual pet profile (species, life stage, body condition, diagnoses, allergies).

## Evidence grading (provenance)

| Tier | Meaning | Examples in this dataset |
|---|---|---|
| `verified_lab` | Independent published lab data or independent certification | Clean Label Project study + Freshpet certification; peer-reviewed/government studies (Frontiers 2018, Cornell glyphosate, EWG PFAS, FDA aflatoxin) |
| `batch_lot_coa` | Real per-lot COA lookup tool exists (document not yet captured) | Open Farm, Stella & Chewy's, Natural Balance |
| `brand_level_lab_report` | Brand publishes real values, lab unnamed / no independent COA | Wellness "Testing Results"; Champion (Orijen/Acana) white paper |
| `brand_claim` | Marketing / QA language, no values | Most premium & mass brands |
| `needs_review` | Ambiguous or low-credibility source | Products merely named in CLP study (no per-product values); NaturalNews rating |
| `no_public_coa_found` | Searched, nothing public | Fancy Feast, Beneful, Whiskas, Authority, etc. |

## Scoring dimensions (weights are a starting point; tune after review)

| Dimension | Weight | Notes |
|---|---|---|
| Product-level lab evidence | 22% | Only an independent, current product COA scores high. Brand/study/no-evidence are capped. |
| Contaminant evidence quality | 15% | Severity of any elevated/fail result; recency; method (ICP-MS/AOAC) |
| Recall history | 18% | Time-weighted (≤2 yrs heaviest) and severity-weighted (Class I > II > III) — see `scoreRecallRisk` |
| Ingredient transparency | 12% | Full ingredient disclosure, named proteins, sourcing detail |
| AAFCO completeness / life-stage fit | 12% | "Complete & balanced" statement + life-stage match (`aafcoFit`, `lifeStageFit`) |
| Brand transparency (WSAVA-style) | 8% | Owns facilities, nutritionist on staff, publishes testing, recall responsiveness |
| Product match confidence | 5% | exact_barcode > name-match > fuzzy |
| Pet-specific fit (allergy/condition) | 5% | Allergen conflicts, condition-aware (renal, pancreatitis, weight) |
| Brand sourcing transparency | 3% | Country-of-origin, supplier disclosure |
| Owner-reported tolerance | (future) | Personal outcome once feeding logs exist (`scorePersonalOutcome`) |

## Caps that prevent overclaiming

1. **No lab evidence → contaminant confidence capped at ~25/100** ("No public lab test found"), regardless of marketing. (Matches `scoreContaminantConfidence`.)
2. **Brand-level or study-level evidence cannot raise a single *product* above "moderate" contaminant confidence.** Only ≥1 real, current, **product-level** passing COA unlocks "high."
3. **Any elevated/fail result floors the contaminant score** (~30) and flags the product.
4. **Stale lab data (past freshness window) → treated as `stale`/low**, e.g. the 2017 Champion white paper.
5. **"Cleanest" label is forbidden** unless ≥1 independent, current, product-level COA exists. No product in the current dataset qualifies.

## Recall weighting

```
base = 100
for each recall:
  Class I  (bad):   -45 if within 2 years, else -18
  Class II (watch): -22 if within 2 years, else -10
  Class III:        -5
brand with >1 lifetime recalls: additional -5
```
Brand-level matches are labeled "Brand-level recall match" and never imply an exact product recall.

## How "top candidates" are chosen (current dataset)

Because **no product-level independent COA exists yet**, the highest a product can rank is **"candidate / needs review"** — never "cleanest." Ranking currently surfaces:
- **Freshpet** — only independent certification (Clean Label Project Certified). → `candidate`.
- **Wellness, Open Farm, Stella & Chewy's, Natural Balance** — real published values or per-lot COA tools. → `needs_review` (verify before featuring).
- Everything else → `not_enough_evidence` or retains research-preview labeling.

## Open questions for vet/admin review
- Confirm weights and the freshness window (months) for lab data staleness.
- Decide whether independent **certification** (CLP) may unlock a higher tier than brand self-reported values.
- Define the minimum bar for moving a marketplace entry from `needs_review` → `candidate` → published.
