# Petwell — Security & Key Management

How Petwell handles secrets, data isolation, and trust boundaries. The governing
rule: **the mobile app only ever holds client-safe public keys. Every real secret
lives server-side (Supabase) and never ships in the binary.**

## Trust boundaries

```
┌─────────────────────────────┐     anon/publishable key      ┌────────────────────────┐
│  Petwell app (iOS/Android)  │ ───────────────────────────▶  │  Supabase (Postgres)   │
│  EXPO_PUBLIC_* only          │      RLS-scoped requests       │  RLS on every table     │
│  - Supabase anon key         │ ───────────────────────────▶  │  Edge Functions (Deno) │
│  - RevenueCat public SDK key │      invoke (user JWT)         │   server-only secrets:  │
│  - Sentry DSN                │                                │   service role, LLM key │
└─────────────────────────────┘                                └────────────┬───────────┘
                                                                             │ server-side
                                                                  ┌──────────▼──────────┐
                                                                  │  LLM / 3rd-party API │
                                                                  └─────────────────────┘
```

The app talks to Supabase with the **anon/publishable** key; Row Level Security
ensures each user only sees their own rows. Anything privileged — the service-role
key, model/LLM keys — is used **only inside Supabase Edge Functions**, which the
app invokes with the user's JWT. The app never sees those secrets.

## Where each key goes

### 1. Client — EAS environment variables (shipped in the app, all `EXPO_PUBLIC_*`)

These are **inlined into the client bundle** at build time. Only put values here
that are safe to be public. Set them per EAS environment
(`development` / `preview` / `production`) — see `expo/eas.json` and
`docs/PRODUCTION_SETUP.md`.

| Variable | What it is | Safe to ship? |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ public |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key | ✅ public — RLS protects all data |
| `EXPO_PUBLIC_USE_API` | use real backend (always on in prod) | ✅ |
| `EXPO_PUBLIC_ENABLE_DEMO_MODE` | show explicit "Try a demo profile" | ✅ |
| `EXPO_PUBLIC_ENABLE_MOCK_SCAN` | allow illustrative photo-scan scores | ✅ |
| `EXPO_PUBLIC_ENABLE_BILLING_FALLBACK` | audit flag; no fake-premium path exists | ✅ |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat **public** SDK key (`appl_…`) | ✅ public SDK key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat **public** SDK key (`goog_…`) | ✅ public SDK key |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` | entitlement id (e.g. `pro`) | ✅ |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry **client** DSN | ✅ public client key |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | support contact address | ✅ |

Why these are safe: the Supabase anon key only allows what RLS permits; RevenueCat
**SDK** keys are designed to be embedded in every binary; a Sentry DSN is a public
ingest key. None of them can read another user's data or spend money on your behalf.

### 2. Server — Supabase Edge Function secrets (NEVER in the app)

Set with the Supabase CLI (`supabase secrets set NAME=value`) or the dashboard.
These power the AI/data layer in `supabase/functions/*` and the data importers.
They are **never** `EXPO_PUBLIC_*` and **never** referenced in `expo/`.

| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions, importer scripts | bypasses RLS — server only |
| `OPENAI_API_KEY` *or* `LLM_API_KEY` | `supabase/functions/_shared` (AI calls) | model key — server only |
| `LLM_PROVIDER` | AI functions | e.g. `openai` |
| `LLM_MODEL` | AI functions | e.g. a current model id |
| `AI_ENABLED` + budget vars | AI functions | gate + cost ceiling (see `docs/AI_LAYER.md`) |
| *(optional)* food/recall API keys | importers | server only |
| *(optional)* email/report provider keys | report delivery | server only |

The data-import scripts (`expo/scripts/import-*.ts`) also need
`SUPABASE_SERVICE_ROLE_KEY` and are run from a trusted machine / CI secret — **not**
from the app. `EXPO_PUBLIC_USE_DEMO_SUPABASE` is a dev-only convenience and is
ignored by production builds.

### 3. Never ships, anywhere

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` / `LLM_API_KEY`, and any third-party
provider secret must never appear in `expo/`, in any `EXPO_PUBLIC_*` variable, in
`app.json`, in committed `.env` files, or in client logs. `lib/config.ts` is the
only place the app reads configuration, and it reads `EXPO_PUBLIC_*` only.

## Data isolation (RLS)

- **Every table has Row Level Security.** User data is scoped by
  `owner_id = auth.uid()` (or pet ownership for pet-child tables). A second user
  cannot read or write another user's pets, logs, records, scans, AI data, or
  subscriptions.
- **Reference/catalog tables** (food brands/products/ingredients/evidence/recalls/
  toxins) are world-readable, writable only by the service role.
- **Storage**: private buckets (`pet-photos`, `scan-images`, `documents`,
  `reports`) with objects scoped under a `<uid>/…` path. Nothing is world-readable.
- Admin-only tables (review queue, import logs) are gated by a hardened
  `is_admin()` (migration `0017`).

See `supabase/README.md` for the schema + policy details.

## AI safety boundary

- AI is **opt-in** (off by default) and **document processing is a separate
  opt-in**. The app sends data to a model only after the user enables it.
- **Emergency and toxin routing is deterministic and runs before any model call.**
  The model can explain, summarize, and ask better questions, but is never the
  source of truth for urgent safety logic.
- Model keys live only in Edge Function secrets; the app calls the function, the
  function calls the model. See `docs/AI_LAYER.md`.

## Crash reporting

Sentry is initialized only when `EXPO_PUBLIC_SENTRY_DSN` is set (`lib/sentry.ts`).
It is configured to avoid sending PII. With no DSN it is a complete no-op.

## Secret hygiene & verification

- `.env` is git-ignored; `expo/.env.example` documents the shape with placeholders.
- Pre-ship grep (also in CI): confirm no server secret leaked into the client.

```bash
# From repo root — must return NOTHING:
grep -rIn -E "SERVICE_ROLE|service_role|OPENAI_API_KEY|LLM_API_KEY" expo \
  --exclude-dir=node_modules | grep -vE "\.md:|\.env\.example"
```

- Rotate keys immediately if a secret is ever committed; Supabase service-role and
  LLM keys can be rotated from their dashboards.
- Report suspected vulnerabilities to the support address in
  `EXPO_PUBLIC_SUPPORT_EMAIL` (default `support@petwell.app`).
