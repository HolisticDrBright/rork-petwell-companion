# Petwell — production setup runbook

What's **code** (done / I can do) vs. what's **account/billing/credentials** (only you can do, in a
dashboard). Each section marks the split.

---

## 1. Your own production Supabase project

The app does **not** point at a shared backend by default — with no env vars it runs in local mode, and the
shared demo project is used **only** if you explicitly set `EXPO_PUBLIC_USE_DEMO_SUPABASE=1` (dev only). The
schema is fully reproducible from `supabase/migrations/` (**0001–0017**, sequential and verified).

### 1a. Create the project — **you (dashboard + billing)**
1. supabase.com → New project. Pick a region near your users. Choose at least the **Pro** plan if you
   want daily backups / PITR (see 1e).
2. Note the **Project URL** and **anon/publishable key** (Settings → API).

### 1b. Apply the schema — **code (reproducible); you run one command**
Option A (recommended, Supabase CLI):
```bash
cd supabase
supabase link --project-ref <your-project-ref>
supabase db push        # applies migrations 0001–0017 in order
```
Option B (no CLI): open the SQL editor and run each file in `supabase/migrations/` in numeric order.

This recreates every table, RLS policy, storage bucket (`scan-images`, `documents` from `0005_storage.sql`),
and the reference/catalog seed data. No app-code change is needed beyond the env vars in 1f.

### 1c. Auth providers — **you (dashboard)**
- Authentication → Providers → **Email**: enable. (Email + password is the app's account method.)
- Authentication → **Anonymous sign-ins**: **enable** — the app uses an anonymous identity by default and
  converts it in place when a user creates an account, so this is required.
- Set the **Site URL** / redirect allow-list to your app's scheme if you later add email links.

### 1d. SMTP (so confirmation + password-reset emails actually send) — **you (provider account)**
Supabase's built-in email sender is rate-limited and not for production. Configure custom SMTP under
Authentication → Emails → SMTP with a transactional provider — **Resend**, **Postmark**, **SendGrid**, or
**Amazon SES** all work. You'll paste host/port/user/pass + a verified "from" address. (No app code needed.)

### 1e. Backups — **you (dashboard/plan)**
Database → Backups: enable daily backups, and **Point-in-Time Recovery (PITR)** on Pro+ for a real RPO.

### 1f. Env vars / EAS secrets — **code-ready; you set the values**
The app reads these (see `lib/supabaseConfig.ts`, `lib/sentry.ts`). Set them in `expo/.env` for local and as
**EAS secrets** for production builds (`eas secret:create`):
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
EXPO_PUBLIC_SENTRY_DSN=<your sentry dsn>
```
Do **not** set `EXPO_PUBLIC_USE_DEMO_SUPABASE` in production — with the three vars above the app uses your
project; with none it safely falls back to local mode.

### 1g. "Confirm email" decision — **recommendation: ON for production**
The app handles both states. Recommendation:
- **Production / public launch → Confirm email ON** (after SMTP in 1d). Without it, anyone can register an
  email they don't own. The app already shows "check your email to confirm, then sign in."
- **Closed/invite beta → temporarily OFF** for zero-friction testing, then turn ON before public launch.

### 1h. Verify — **you (5 min)**
- App launches → anonymous session created (check Authentication → Users).
- Create an account in-app → user gains an email; existing data stays (same id).
- Confirm RLS: a second account can't see the first's rows.

> I can run 1b directly **if you connect your production project** to this session (the MCP is currently
> pointed at the demo project). 1a/1c–1e are dashboard-only.

### 1i. Data mode & demo data — **how production avoids mock/demo data**

The app resolves a single **data mode** (`expo/lib/dataMode.ts`) that governs whether any
demo/mock/placeholder data may appear:

| Mode | When | Demo pets auto-seed? | Demo rows shown? | Local fallback? | Shared demo Supabase? |
|---|---|---|---|---|---|
| **production** | release build, or `EXPO_PUBLIC_APP_ENV=production` | No | No | No (backend required) | No |
| **development** | `expo start` (`__DEV__`), or `EXPO_PUBLIC_APP_ENV=development` | Yes | Yes | Yes | Only with opt-in |
| **demo** | `EXPO_PUBLIC_APP_ENV=demo` | Yes | Yes | Yes | Only with opt-in |

- **`EXPO_PUBLIC_APP_ENV`** — leave **unset** for production (a release build defaults to production).
  Set `development` or `demo` only for internal/QA builds.
- A **production build missing** `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` shows a
  **"Setup required" blocking screen** — it never silently drops to demo/local data.
- The **shared demo Supabase** project is used only when `EXPO_PUBLIC_USE_DEMO_SUPABASE=1` **and** the build
  is not production. In production the flag is ignored.
- Production never auto-seeds Buddy/Luna/Milo. A brand-new user has **zero pets** and lands on the first-pet
  empty state (`components/FirstPetGate`) → `/add-pet`. Onboarding creates **no** pets (no fake "Buddy"); it
  only collects goals and hands off to add-pet. The provider keeps backend-readiness separate from "has ≥1 pet"
  and treats `selectedPet` as nullable, so a zero-pet account never crashes or falls back to demo data.
- An explicit, clearly-labeled **"Try a demo profile"** action (Settings, and the first-pet gate) can seed sample
  pets on demand — they carry a `demo_key` and show a **DEMO** badge wherever they're listed or selected.
- **Demo/seed food products** (the fictional 0006/0010 "(sample)" catalog) are marked `evidence_status =
  'demo_seed'` by migration `0019` and hidden from production search / label match / bundles / barcode /
  alternatives via `excludeDemoProducts()` (`expo/lib/food/productVisibility.ts`). Dev/admin still see them.

**Verify a production build isn't using mock/demo data:**
1. In **Admin → Data Source Status**: "App data mode" reads **Production (live data)**, "Supabase: connected ✓",
   and **Demo / seed** product + lab counts are **0** (or hidden from user views).
2. No pet shows a **DEMO** badge; food results with no real lab evidence say **"No public product-level COA found"**
   (not demo/illustrative). Timeline "Today" matches the real date.
3. Build-time guards: `bun tests/dataMode.test.ts` proves production requires a backend, never shows demo data, and
   refuses the demo Supabase even if the opt-in flag is set. `bun tests/petEmptyState.test.ts` proves a zero-pet
   account doesn't crash, production never auto-seeds demo pets, and production food queries exclude `demo_seed`.

---

## 2. Payments / In-app purchases

Required if you sell Premium — Apple and Google mandate their IAP for digital goods. **RevenueCat** is the
standard wrapper for Expo.

### What only you can do (accounts + store config)
- Apple Developer ($99/yr) + Google Play ($25 once) accounts.
- Create the subscription/IAP **products** in App Store Connect and Play Console (IDs, pricing, tax).
- A **RevenueCat** account → an API key + an **entitlement** (e.g. `premium`) + **offerings** mapped to the
  store products.

### What's built (code) ✓ — env-driven, inert without keys
RevenueCat **is wired** (`react-native-purchases` + `react-native-purchases-ui` v10):
- `providers/SubscriptionProvider.tsx` configures the SDK from env, exposes reactive `isPro`, syncs the
  RevenueCat identity with the Supabase user, and mirrors the entitlement onto the existing `premium` gate.
- `app/premium.tsx` handles **loading, no-offerings, purchase success, cancellation, restore, the Customer
  Center, and web/no-native fallback**; `app/settings.tsx` exposes Restore + Manage subscription.
- Keys are env vars (placeholders in `.env.example`): `EXPO_PUBLIC_REVENUECAT_IOS_KEY`,
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, and `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` (default **`Petwell Pro`** —
  must match your dashboard entitlement). **With no key for the platform, purchases are disabled and Pro
  stays locked** — the app still runs.

### Still required of you (accounts + store config — NOT done in code)
- Per-store public SDK keys (`appl_…` / `goog_…`) in the RevenueCat dashboard → set the env vars above.
  (The key currently in the local `.env` is a placeholder `test_…` value; verify it's a real per-store key.)
- Create the products (`monthly`, `yearly`, `lifetime`), an **Offering**, the **`Petwell Pro` entitlement**,
  and a **Paywall** + **Customer Center** in the dashboard.

### Sandbox testing checklist — **device only (cannot be tested in Expo Go / web / this CI)**
Build a dev client (`npx expo run:ios` / `run:android`), then verify on device:
- [ ] iOS **sandbox** purchase completes (sandbox Apple ID in Settings)
- [ ] Android **license-tested** purchase completes (Play Console test track + license tester)
- [ ] **Restore purchases** re-grants Pro on a reinstall / second device
- [ ] **Entitlement unlock** flips `isPro` and unlocks gated UI
- [ ] **Log out → log in** keeps the entitlement attached to the account (RevenueCat `logIn`)
- [ ] Customer Center opens and can manage/cancel

> Status: **implemented in code, NOT verified on a real device** here (IAP needs a dev build + store sandbox).
> Do not advertise payments as live until the checklist passes with real products.

---

## 3. Data operations (recalls / products / lab)

The schema already supports this (`recall_events`, `food_products`, `contaminant_tests`, `evidence_sources`,
…). The question is feeding it real data.

### Recalls — **I can build an ingester (free source)**
openFDA Food Enforcement API (`https://api.fda.gov/food/enforcement.json`, free) publishes FDA food recalls
including animal/pet food. I can write a script / Supabase Edge Function that pulls recalls, filters to
animal/pet products, and upserts `recall_events` (brand-name matched to the catalog where possible), on a
schedule. Needs your project + a service-role key to run; best tuned against real API responses.

### Products / labels — **I can extend the existing importer (free source)**
Open Pet Food Facts (already wired for barcode lookup) can also seed `food_products` + ingredients in bulk by
category. I can add a batch importer with the same matching/normalization the app already uses.

### Lab / contaminant data — **honest gap: no free feed**
There is no free, authoritative pet-food contaminant dataset. Real purity confidence requires **licensing**
(e.g. Clean Label Project), a **testing-lab partnership**, or **brand-provided COAs** entered manually. The
app is built for this: `contaminant_tests.is_demo` flags seed data, and purity confidence stays low /
"no public lab test found" until real evidence exists — never inferred from a photo. Keep that posture until
you have a licensed source.

### Ongoing ownership
Ingestion code is a one-time build; **running and curating it is an ongoing operation** someone on your side
owns (schedule the job, review matches, enter COAs). I can build the tooling and the schedule; I can't run a
sustained data operation.

---

## Secrets summary

| Secret | Where it's used | Who provides |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | app backend | your Supabase project |
| `EXPO_PUBLIC_SENTRY_DSN` | crash reporting | your Sentry project |
| Sentry auth token + org/project slug | source-map upload (CI/EAS) | your Sentry account |
| RevenueCat API key | IAP (when added) | your RevenueCat account |
| SMTP credentials | auth emails | your email provider (in Supabase dashboard) |
| Supabase service-role key | data-ingestion jobs (server-side only, never in the app) | your Supabase project |
| RevenueCat per-store keys | in-app purchases | your RevenueCat dashboard |

---

## 4. RLS verification checklist (run after `db push`)

RLS is defined in `0004_rls.sql`, `0007_hardening.sql`, `0016_evidence_provenance.sql`, `0017_secure_is_admin.sql`.
Verify before launch:

- [ ] **User-owned tables are owner-scoped.** Signed in as user A, you cannot read/write user B's rows
  (`pets`, `timeline_entries`, `scans`, `records`, `reports`, `health_scores`, `detected_patterns`,
  `treat_audits`, `environment_checklists`, `progress_programs`, `program_logs`, `privacy_preferences`, …).
  The privacy export (`services/ownedTables.ts`, 31 tables) is the canonical owned-table list — a `data.test`
  invariant asserts the newer tables are covered and that catalog tables are **not** exported as user data.
- [ ] **Reference/catalog tables are world-readable, not user-writable** (`food_products`, `food_brands`,
  `recall_events`, `toxin_references`, `meal_plans`, `marketplace_products`, integrative catalog). Anon can
  `select`; anon cannot `insert/update/delete`.
- [ ] **Admin/import tables are admin/service-role only** (`lab_tests` writes, `admin_review_actions`,
  `admin_review_queue`, `product_submissions`, `ocr_label_submissions` review fields, `data_import_runs`).
  A non-admin user cannot approve submissions or write recalls. `is_admin()` is SECURITY-DEFINER and lives
  outside the API schema (`0017`).
- [ ] **Storage buckets** (`scan-images`, `documents`) enforce per-user folder paths.
- [ ] Supabase **Advisors** (Dashboard → Advisors, or `get_advisors`) shows **0 security lints**.

---

## 5. Data operations runbook (recalls / products / toxins)

The ingestion code is **runnable but operator-owned** — it needs your project + a **service-role key**
(server-side only; never shipped in the app) and someone to schedule + curate it.

```bash
cd expo
# Recalls (openFDA, free): brand-matched, deduped, logged to data_import_runs
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role> bun scripts/import-recalls.ts 200
# Products (Open Pet Food Facts, free): imported as `open_database`, pending admin review
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… bun scripts/import-opff.ts <barcode> [barcode...]
# Toxin DB → veterinary review checklist (pure, offline)
bun scripts/export-toxin-review.ts > ../docs/toxin-review-checklist.md
```

- **Recommended production form:** wrap `recallImporter.run()` in a **Supabase Edge Function** (Deno) on a
  daily **cron schedule** (Dashboard → Edge Functions + Cron), using the function's service-role env. The
  importers take an injected client, so the same code runs from a script, an Edge Function, or the in-app
  admin screen.
- **Admin review:** sign in as a user with `profiles.is_admin = true` → **Settings → Admin → Data quality &
  review queue** (`app/admin.tsx`) to see real/demo/no-lab counts and approve/reject OCR-label submissions.
- **Lab / contaminant data — honest gap (unchanged):** there is **no free** pet-food contaminant feed. Real
  purity confidence requires **licensing** (e.g. Clean Label Project), a **lab partnership**, or
  **brand-provided COAs entered by an admin**. Until then the app keeps purity confidence low / "no public
  lab test found", demo data is labeled `demo_seed`, and a photo never raises confidence (enforced by tests).

---

## 6. EAS build readiness (before you ship binaries)

| Item | Status | Action |
|---|---|---|
| iOS bundle ID | ✅ `com.holisticdrbright.petwell` | `app.json` → `ios.bundleIdentifier` |
| Android package | ✅ `com.holisticdrbright.petwell` | `app.json` → `android.package` |
| App slug / name | ⚠️ slug is a generated id | set a real `slug`/`name` (also used by the `start` scripts) |
| App icon / splash | ⚠️ verify defaults replaced | provide production icon + splash assets |
| Native permissions | ✅ camera/photos (image-picker), notifications declared in `app.json` | confirm usage strings read well in the store |
| RevenueCat keys | ⚠️ env, placeholder value locally | set EAS secrets (per-store keys) |
| Sentry DSN | ✅ env-driven, no-op without it | set EAS secret |
| Supabase env vars | ✅ env-driven, local mode without them | set EAS secrets |
| OCR / live barcode | ⚠️ native modules NOT bundled | optional: add `expo-text-extractor` + `expo-camera` in a dev build (see `docs/food-scanning.md`); the app falls back to manual label review without them |

`eas secret:create` for each secret; `eas build` for the dev/prod client. IAP, local notifications, and
on-device OCR **cannot** be tested in Expo Go / web — they need a dev build.

---

## 7. App-store compliance notes

- **Positioning:** informational pet-health *guidance only* — **not** a diagnosis, **not** a substitute for
  veterinary care, **not** for emergencies. This is stated in `app/terms.tsx` ("Not veterinary advice",
  emergency disclaimer) and the in-app `Disclaimer` shown across triage/food/toxin/report screens.
- **Emergencies & poisoning** route to a vet / emergency clinic / ASPCA (888-426-4435) / Pet Poison Helpline
  (855-764-7661) with one-tap calling — never handled in-app.
- **Subscriptions use native IAP** via RevenueCat (Apple/Google), with Restore + manage/cancel.
- **No fake commerce / telehealth:** Marketplace is a labeled "Research preview" (no buy links, affiliate
  disclosure present); Telehealth is "coming soon" and only exposes real actions (emergency-vet finder, call
  your vet, vet report).
- **Privacy:** export + delete-account implemented; Sentry runs with `sendDefaultPii: false`.

---

## 8. Dependency audit (as of this writing)

`bun audit` reports advisories only in **transitive build/dev tooling** — `tar`/`@xmldom/xmldom` (Expo CLI &
prebuild), `@babel/helpers` (transpile), `ajv` (ESLint), `brace-expansion`/`minimatch` (build globbing).
**None ship in the runtime app bundle.** Do **not** run `audit fix --force` — it would risk breaking the Expo
toolchain. These clear as Expo SDK / ESLint / Babel are updated. Re-check with `bun audit` before each release.
