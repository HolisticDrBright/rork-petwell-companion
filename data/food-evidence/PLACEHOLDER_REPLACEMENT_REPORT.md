# Petwell — Placeholder / Demo Replacement Report

Generated during the food-evidence integration pass. Lists every placeholder, demo,
or pending value, exactly where to change it, and what is intentionally left labeled
as preview/demo/pending. **No real values were invented.**

> NOTE: The `data/food-evidence/` research dataset (lab_evidence.csv, brands.csv,
> products.csv, import_food_evidence.sql, COA_COLLECTION_REPORT.md, etc.) was **not
> present in this repo** at the time of this pass — it exists only on the author's
> machine and was never committed/pushed. Tasks that depend on those files
> (commit dataset, validate CSVs, verify import SQL, integrate marketplace
> candidates) remain **blocked until the dataset is pushed**.

---

## 1. App identity placeholders — `expo/app.json` (must be replaced before store submit)

| Field | Current placeholder | Where |
|---|---|---|
| App name | `Petwell` (ok, but confirm trademark) | `app.json:3` |
| Slug | `u36ek53il5cxdlwr8ag9m` (rork-generated) | `app.json:4` |
| iOS bundle ID | `app.rork.u36ek53il5cxdlwr8ag9m` | `app.json:18` |
| Android package | `app.rork.u36ek53il5cxdlwr8ag9m` | `app.json:25` |
| App icon | `./assets/images/icon.png` (confirm final art) | `app.json:7` |
| Splash | `./assets/images/splash-icon.png` (confirm final art) | `app.json:11-12` |
| Web favicon | `./assets/images/favicon.png` | `app.json:28` |

The slug is also used by the dev scripts in `expo/package.json` (`start`/`start-web`).

## 2. Support email / contact placeholders

`support@petwell.app` is used in 3 places — replace with your real, monitored inbox
(and confirm you own the `petwell.app` domain):
- `expo/app/settings.tsx:292` (Contact us mailto)
- `expo/app/privacy-policy.tsx:85` ("Questions about privacy? Email …")
- `expo/app/terms.tsx:90` ("Questions? Email …")

`expo/app/account.tsx:139` shows `you@example.com` — this is a **text-input
placeholder hint** for the email field, not a contact address; leave or restyle.

## 3. Payments — RevenueCat

- `expo/.env` holds a placeholder key `test_NtrGHqfvwEaHDggZOcpTRBTTBUI` for both
  `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `_ANDROID_KEY`. Replace with real **per-store**
  public SDK keys (`appl_…` / `goog_…`) as EAS secrets. Until then Pro stays locked.
- Entitlement id env: `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` (default `Petwell Pro`).

## 4. Backend — Supabase

- Env-driven (`EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY`). With none set the app runs
  in local mode; the shared demo project is used ONLY with explicit
  `EXPO_PUBLIC_USE_DEMO_SUPABASE=1`. Set your production project's vars as EAS secrets.

## 5. Sample / demo DATA still in place (intentionally labeled)

| Data | Status | Source |
|---|---|---|
| Sample food catalog | **demo/seed** | `supabase/migrations/0006_catalog_seed.sql`, `0010_…`, `0015_…` |
| Demo lab/contaminant tests | **demo_seed** (labeled "Demo data", never "verified") | seed migrations; `contaminant_tests.is_demo`, `lab_tests.evidence_status='demo_seed'` |
| Demo recalls | seed rows where present; real ones come from the openFDA importer | `expo/scripts/import-recalls.ts` |
| Marketplace | **Research preview** — illustrative example brands, no buy links, affiliate disclosure shown | `expo/lib/integrative/marketplace.ts`, `expo/app/marketplace.tsx` |
| Integrative protocols | labeled "not individually vet-reviewed" | `expo/app/protocols.tsx`, `protocol-detail.tsx` |
| Toxin database (57 entries) | **all pending vet review** (`reviewedBy: null`) | `expo/lib/toxins/data.ts`; export via `bun scripts/export-toxin-review.ts` |

## 6. Blocked by missing COAs / licensing (cannot be replaced with current sources)

- **Product-level contaminant purity.** Research finding: **zero** public,
  downloadable, product-level independent COAs from mainstream dog/cat brands.
  The app therefore keeps purity confidence low and shows **"No public product-level
  COA found as of [date]."** Real purity requires a licensed dataset (e.g. Clean
  Label Project), a lab partnership, or brand-provided COAs entered by an admin.
  Until then, do NOT display "cleanest / safest / pure / verified clean".

## 7. What this pass REPLACED / tightened (code)

- **openFDA recall filter** (`expo/lib/food/recallNormalize.ts`): rewritten to
  exclude human-food false positives (hot dog buns, corn dogs, animal crackers,
  hush puppies, fresh mango) while keeping true dog/cat/pet recalls; livestock
  "animal feed" excluded unless a companion animal is named. Regression tests added.
- **Evidence display copy** (`expo/lib/food/provenance.ts`, `expo/app/food-result.tsx`):
  added conservative, mandated copy for product-level lab / brand-level / public
  study / brand claim / open-database / no-public-COA / pending-review, plus the
  dated "No public product-level COA found" line and an evidence-basis classifier.
- **"How Petwell scores food"** trust page (`expo/app/food-trust.tsx`), linked from
  Food Result + Settings.
- **Admin metrics** (`expo/services/dataQualityService.ts`, `expo/app/admin.tsx`):
  added open-database / brand-claim / needs-review product counts alongside the
  real-vs-demo-vs-no-lab + stale + unmatched-recall + pending-submission metrics.

## 8. Still requires HUMAN action

- Replace items in §1–§4 with real values (you/account-side; not code).
- **Vet review** of the 57 toxin entries and the integrative protocols.
- Push the `data/food-evidence/` dataset so it can be validated, the Supabase
  import SQL verified, and real (open-database/brand-claim/study) evidence loaded.
- Secure a licensed lab/COA source before making any product-level purity claim.
