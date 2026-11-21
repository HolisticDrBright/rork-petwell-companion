# Petwell competitive upgrades

The upgrade branch builds on the fixes in PR #1. The production AI owner checks were deployed separately. The upgrade migrations, OCR and cited chat functions, web share viewer, and nightly job are staged as a release bundle.

## Release setup

- Apply the upgrade migrations and run the database checks on a staging project. Each SQL check rolls back its test data.
- Deploy `ai-record-ingestion` and the updated `ai-chat` with the project’s existing AI provider configuration. Keep a licensed veterinarian’s approval for the seeded sources, escalation copy, and user-facing health claims with the release record. The source catalog is in `supabase/seed/vet-sources.json`. Active database red flags can escalate the built-in rules.
- Host the web app with an HTTPS fallback for `/vet-visit-share`. Set `EXPO_PUBLIC_PETWELL_SHARE_WEB_URL` to that site's base URL in the iOS and Android builds. The token is in the URL fragment and must stay out of analytics, logs, and referrers. Verify a visit link in a signed-out browser, including image and PDF access, revocation, and expiration.
- Deploy `health-snapshots` with `--no-verify-jwt` for the nightly runner. The function authenticates every request using its own dedicated `x-petwell-job-token` before creating a service client. Set the same random secret as `PETWELL_HEALTH_SNAPSHOT_SECRET` in Supabase and GitHub. Set the GitHub variable `PETWELL_SUPABASE_URL` to the project's base URL. Dispatch the workflow manually once and verify two runs on the same date create one row per pet. GitHub schedules run from the default branch.
- Verify on a physical iPhone the complete signup and recovery email flow, pet and document save after restart, account deletion with uploaded photos, dog and cat triage, on-device reminders, visit PDF, and the store’s subscription management screen. Any new TestFlight build must use a backend with the upgrade migrations. Complete the public App Store metadata and legal link checks from the existing launch handoff.

## Schedule and score behavior

Schedules support daily, weekly, monthly, and hourly intervals, plus single occurrences. Local clock times follow the schedule’s saved time zone. A time that disappears during a spring clock change is skipped. A repeating clock time during the fall change occurs once. A monthly date absent from a month is skipped. Device alerts are optional, are refreshed from Reminders, and queue up to 24 upcoming alerts per pet within the device’s available capacity.

The score uses the deterministic `supabase/functions/_shared/petHealthScore.ts` module in the app and nightly worker. It averages the data-backed sub-scores with equal weights. Rounded contributions sum to the displayed integer. The app requires two observed systems. Coverage describes available records and never implies clinical accuracy. The chart uses the current model and excludes older scores.

## Version 1 vet-visit handoff

The transport is JSON. The app’s `VetVisitPackage` type and `isVetVisitPackage` function in `expo/lib/report/visitPackage.ts` define and validate the payload.

| Field | Content |
| --- | --- |
| `version` | Integer `1` |
| `report` | Pet identity, recorded conditions and allergies, triage and red flags, recent timeline and scans, and medications. The fields in `expo/lib/report/types.ts` define the report shape. |
| `photos` | Optional owner-selected scan images. Each item contains a `label` and a JPEG, PNG, or WebP base64 `dataUrl`. |
| `citations` | Items with `source_id`, `quote_or_section`, `title`, `publisher`, and an HTTPS `url`. |
| `schedules` | Items with `title`, `kind`, nullable `amount`, ISO `dateTime`, and boolean `confirmed`. |
| `score_history` | Items with `generated_at` and `overall` from 0 to 100. |
| `weight_history` | Items with `date` and `pounds`. |

The PDF renders from the same snapshot on request. Link creation stores a hash of the random token. An unrevoked link works for up to 30 days. Revocation prevents future reads. Recipients can keep copies they already downloaded. The veterinary document archive retains a metadata-stripped JPEG for viewing and export.
