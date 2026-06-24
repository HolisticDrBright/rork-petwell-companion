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

Until it is enabled the app still runs — it falls back to bundled mock data
("local mode") and simply doesn't persist to the cloud.

## Migrations

Applied in order (`supabase/migrations/`):

| File | Contents |
| --- | --- |
| `0001_core.sql` | profiles, pet_profiles + pet child tables, care_tasks, reminders, health_logs, timeline_events |
| `0002_symptom_scan_records.sql` | symptom_sessions, symptom_answers, triage_results, scan_records, scan_images, vet_records, document_uploads, vet_reports |
| `0003_food_domain.sql` | food brands/products/ingredients/flags/nutrition, contaminant_tests, recall_events, manufacturer_quality_profiles, food_scans/logs/scores/recommendations, evidence_sources, user_corrections |
| `0004_rls.sql` | Enable RLS + owner-scoped policies on all 32 tables; world-readable catalog |
| `0005_storage.sql` | Private buckets: `pet-photos`, `scan-images`, `documents`, `reports` (path scoped to `<uid>/…`) |
| `0006_catalog_seed.sql` | Brand-neutral reference catalog + evidence sources |
| `0007_hardening.sql` | search_path pin + move `owns_pet()` out of the public API |

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

Per-user demo pets are seeded client-side from `expo/constants/mockData.ts` via
`petsService.ensureDemoData()` the first time a user has no pets — so the three
sample pets and their full history appear for everyone, as real, editable rows.

## Service layer

`expo/services/` wraps CRUD per domain and maps rows to the app's view models:
`petsService`, `timelineService`, `recordsService`, `remindersService`,
`scanService`, `triageService`, `foodService`, `reportService`. The app reaches
them through `providers/PetProvider.tsx`, which runs in **remote** mode when
Supabase is reachable and **local** (mock) mode otherwise.

> Petwell provides triage and "possible causes" guidance — never a diagnosis.
