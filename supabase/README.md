# Petwell — Supabase backend

Production-ready backend foundation for the Petwell app: schema, Row Level
Security, storage, seed data, and a typed service layer the app talks to.

## Project

- Project: **petwell** (`iwrqvrfklmyppfhrikfb`), region `us-east-1`.
- URL + publishable key live in `expo/lib/supabaseConfig.ts` (overridable via
  `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; see
  `expo/.env.example`). The publishable key is safe to ship — RLS protects data.

## One-time setup: enable Anonymous sign-ins

Petwell signs every device in anonymously so each user gets a real, RLS-scoped
identity with **no login screen**. Enable it once:

> Supabase Dashboard → Authentication → Sign In / Providers → **Anonymous
> sign-ins: ON**.

In **development/demo** builds the app still runs without it — it falls back to
bundled mock data ("local mode") and simply doesn't persist to the cloud.
**Production builds require a real backend**: if Supabase config is missing they
show a "Setup required" screen instead of silently using demo/local data (see
`expo/lib/dataMode.ts` and `docs/PRODUCTION_SETUP.md`).

## Migrations

Applied in order (`supabase/migrations/`):

| File | Contents |
| --- | --- |
| `0001_core.sql` | profiles, pet_profiles + pet child tables, care_tasks, reminders, health_logs, timeline_events |
| `0002_symptom_scan_records.sql` | symptom_sessions, symptom_answers, triage_results, scan_records, scan_images, vet_records, document_uploads, vet_reports |
| `0003_food_domain.sql` | food brands/products/ingredients/flags/nutrition, contaminant_tests, recall_events, manufacturer_quality_profiles, food_scans/logs/scores/recommendations, evidence_sources, user_corrections |
| `0004_rls.sql` | Enable RLS + owner-scoped policies on all 32 tables; world-readable catalog |
| `0005_storage.sql` | Private buckets: `pet-photos`, `scan-images`, `documents`, `reports` (path scoped to `<uid>/…`) |
| `0006_catalog_seed.sql` | Brand-neutral **demo/seed** reference catalog (fictional "(sample)" brands) + evidence sources |
| `0007_hardening.sql` | search_path pin + move `owns_pet()` out of the public API |
| `0008_triage_summary.sql` | triage summary persistence |
| `0009_food_intelligence_v2.sql` | food-intelligence v2 (scoring inputs, aliases) |
| `0010_food_catalog_expansion.sql` | **demo/seed** catalog expansion → 10 fictional brands / 20 products + DEMO lab rows (`is_demo`) |
| `0011_privacy_preferences.sql` | privacy preferences |
| `0012_integrative_medicine.sql` | integrative-medicine tables |
| `0013_integrative_seed.sql` | integrative seed (vet-review pending) |
| `0014_longevity_layer.sql` | longevity / health-score tables |
| `0015_longevity_seed.sql` | longevity seed |
| `0016_evidence_provenance.sql` | `evidence_status` enum + provenance columns; `lab_tests`, `toxin_references`, submissions, admin review queue, import logging |
| `0017_secure_is_admin.sql` | hardened `is_admin()` |
| `0018_ai_layer.sql` | server-side AI layer (`ai_generations`, chat threads) — gated, opt-in |
| `0019_demo_seed_provenance.sql` | backfill: mark 0006/0010 fictional products/recalls/lab rows `evidence_status = 'demo_seed'` so production hides them |

Apply with the Supabase CLI:

```bash
supabase link --project-ref iwrqvrfklmyppfhrikfb
supabase db push
```

Regenerate types after schema changes:

```bash
supabase gen types typescript --project-id iwrqvrfklmyppfhrikfb > expo/types/db.ts
```

## Security model

- **Every table has RLS.** User data is scoped by `owner_id = auth.uid()` (or by
  pet ownership for pet-child tables). Verified: a second user sees zero of
  another user's rows and cannot write as them.
- **Reference catalog** (food brands/products/ingredients/flags/nutrition/
  recalls/evidence) is world-readable, writable only by the service role.
- **Storage** objects must live under a folder named with the user's id.
- `supabase get_advisors (security)` returns no findings.

## Demo data (Buddy, Luna, Milo)

`petsService.ensureDemoData()` seeds the three sample pets (from
`expo/constants/mockData.ts`) as real, editable rows carrying a `demo_key`
(`buddy`/`luna`/`milo`) and a **DEMO** label in the UI.

- **Production never auto-seeds demo pets.** A brand-new production user has
  **zero pets** and lands on the first-pet empty state (`components/FirstPetGate`),
  which routes to `/add-pet`. Onboarding creates no pets and fabricates no
  "Buddy" — it only collects goals and hands off to the add-pet flow.
- Demo pets are auto-seeded **only** in dev/demo builds (`shouldShowDemoData`),
  or on demand via the explicit **Settings → "Try a demo profile"** action (and
  the same shortcut on the first-pet gate). The explicit action works in any
  build but is always user-initiated and clearly labeled DEMO.

## Evidence status & provenance (food)

Every food row can carry an `evidence_status` (`0016`): `verified_official`,
`verified_lab`, `brand_claim`, `open_database`, `crowdsourced_unverified`,
`admin_reviewed`, `demo_seed`, `stale`, `rejected`. Provenance rules the app
enforces:

- **`demo_seed` = illustrative/fictional** (the 0006/0010 sample catalog). It is
  **hidden from production user-facing surfaces** — search, catalog/label match,
  bundles, barcode, and alternatives all filter it out via
  `excludeDemoProducts()` (`expo/lib/food/productVisibility.ts`). The filter is
  null-safe: real, not-yet-graded rows (`null`) and real imports
  (`open_database`, etc.) stay visible. Dev/demo/admin builds still see demo rows.
- Demo / brand-level / study-level lab rows **can never raise product-level
  purity** (`countsAsProductLevelPurity`); only a current, admin-verified,
  product-level COA can. No surface claims "cleanest / purest / safest / clean".
- **Admin → Data Source Status** shows demo/seed vs. real counts so the team can
  audit and clean up seed data.
- Real importers set honest provenance: OPFF → `open_database` (pending review),
  FDA recalls → `verified_official`, crowdsourced → `crowdsourced_unverified`,
  admin approval → `admin_reviewed`. See `docs/DATA_REFRESH.md`.

## Service layer

`expo/services/` wraps CRUD per domain and maps rows to the app's view models:
`petsService`, `timelineService`, `recordsService`, `remindersService`,
`scanService`, `triageService`, `foodService`, `reportService`. The app reaches
them through `providers/PetProvider.tsx`, which runs in **remote** mode when
Supabase is reachable and **local** (mock) mode otherwise. The provider keeps
backend-readiness separate from "has ≥1 pet": a real remote account with zero
pets stays in remote mode (it does not fall back to demo data) and shows the
first-pet flow. Production requires a backend (no silent local fallback).

> Petwell provides triage and "possible causes" guidance — never a diagnosis.
