# Petwell — commercial launch checklist

Honest readiness ladder. A feature can be **code-complete** yet not **verified on a device** or **wired to
real keys/partners**. Don't advertise anything past the rung it has actually reached.

## Readiness ladder (what each rung means)
1. **Implemented in code** — written, typechecks, lints, unit-tested where pure.
2. **Configured with real keys** — env/secrets/store products set up by you.
3. **Verified locally** — runs in web export / local mode in this repo.
4. **Verified on a real device** — dev build on iOS/Android (IAP, OCR, notifications).
5. **Verified against the production backend** — your Supabase project + RLS.
6. **Needs partner / licensed data** — blocked on an external source.

## Status by area

| Area | Rung reached | Blocking next rung |
|---|---|---|
| Core app (pets, today, triage, records, reminders) | 3 verified locally | device QA |
| Toxin DB + lookup + hotlines | 3 (tested) | vet review of 57 entries |
| Integrative safety gates | 3 (tested) | — (labeled "not individually vet-reviewed") |
| Food trust: badges / purity honesty | 3 (tested) | real lab data (rung 6) |
| Food trust: recall/OPFF import + admin | 3 (runs locally, env-guarded) | service-role key + prod backend (rung 5) |
| Auth (email/password, anon→account) | 1–2 | network-blocked in CI; verify on device/prod |
| Payments (RevenueCat) | 1 (code-complete) | per-store keys + products + device sandbox (rung 4) |
| Lab / contaminant purity | 6 | licensed feed / lab partner / COAs |
| Marketplace / Telehealth | labeled preview/coming-soon | real partners (Path B) — intentionally deferred |
| Backend hardening (RLS, advisors) | 5 on the demo project | run checklist on YOUR project |

## Next 10 (do these to launch)
1. Stand up your **own Supabase project**, `db push` migrations 0001–0017, run the **RLS verification
   checklist** (PRODUCTION_SETUP §4) until Advisors shows 0 lints.
2. Set production **env/EAS secrets** (Supabase URL/anon, Sentry DSN) — no demo opt-in.
3. Replace **bundle IDs + slug + icon/splash** in `app.json` (currently rork placeholders).
4. Configure **RevenueCat**: per-store keys, products (monthly/yearly/lifetime), `Petwell Pro` entitlement,
   paywall, customer center; set the key env vars.
5. **Sandbox-test IAP** on device (PRODUCTION_SETUP §2 checklist); don't claim payments live until it passes.
6. Configure **SMTP** + turn on **email confirmation**; verify sign-up/sign-in/sign-out + anon→account on a
   device with network.
7. Have a **licensed vet review** the 57 toxin entries (`bun scripts/export-toxin-review.ts`) and the
   integrative protocols; flip `evidence_status`/`reviewedBy` as approved.
8. Decide the **lab/purity** path: licensed dataset or admin-entered COAs. Until then keep purity honest
   (already enforced) — no "cleanest food" claims.
9. Schedule the **recall importer** (Edge Function + cron) with a service-role key; assign an owner to curate
   the review queue.
10. Device **QA pass** of every core flow (onboarding → premium), enable **backups/PITR**, confirm Sentry
    has no PII, and do a final `bun audit` review.
