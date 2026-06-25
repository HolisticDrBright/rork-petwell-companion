# Petwell — production setup runbook

What's **code** (done / I can do) vs. what's **account/billing/credentials** (only you can do, in a
dashboard). Each section marks the split.

---

## 1. Your own production Supabase project

The app currently points at a shared **demo** project. Standing up your own is mostly dashboard work,
but the schema is fully reproducible from `supabase/migrations/` (0001–0015, sequential and verified).

### 1a. Create the project — **you (dashboard + billing)**
1. supabase.com → New project. Pick a region near your users. Choose at least the **Pro** plan if you
   want daily backups / PITR (see 1e).
2. Note the **Project URL** and **anon/publishable key** (Settings → API).

### 1b. Apply the schema — **code (reproducible); you run one command**
Option A (recommended, Supabase CLI):
```bash
cd supabase
supabase link --project-ref <your-project-ref>
supabase db push        # applies migrations 0001–0015 in order
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

---

## 2. Payments / In-app purchases

Required if you sell Premium — Apple and Google mandate their IAP for digital goods. **RevenueCat** is the
standard wrapper for Expo.

### What only you can do (accounts + store config)
- Apple Developer ($99/yr) + Google Play ($25 once) accounts.
- Create the subscription/IAP **products** in App Store Connect and Play Console (IDs, pricing, tax).
- A **RevenueCat** account → an API key + an **entitlement** (e.g. `premium`) + **offerings** mapped to the
  store products.

### What I can build (code)
- Install `react-native-purchases`, add a `purchasesService.ts`, wire the existing **Premium** screen to
  fetch offerings, purchase, and **restore purchases**, and gate premium features on the `premium`
  entitlement — env-driven API key, no-op without it (so dev/web stay clean).

### Caveat
IAP **cannot be tested** in Expo Go or on web — it needs a dev build + sandbox store accounts. So it's best
to wire this **after** you have a RevenueCat key + at least one store's products, so I can connect it to real
offering/entitlement IDs and you can sandbox-test on device. I can scaffold it now (inert until keyed) if you
prefer it ready.

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
