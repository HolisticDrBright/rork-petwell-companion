# Petwell AI Layer

A safe, server-side AI layer. **No model API key ever ships in the Expo app.** The
app calls Supabase Edge Functions; the functions call the provider (OpenAI) with a
server-only key, run the safety policy, log the call, and return structured results.

```
Expo app  →  Supabase Edge Function  →  OpenAI (Responses API)
                     ↓
            Supabase DB + Storage  →  app shows structured, reviewed results
```

## Edge Functions (`supabase/functions/`)

| Function | Feature | Notes |
|---|---|---|
| `ai-vet-report-rewrite` | vet_report_rewrite | vet + owner summaries; no new facts; red flags preserved |
| `ai-record-summary` | record_summary | uploaded PDF/image → structured; `needs_review`; never invents |
| `ai-coa-extract` | coa_extraction | **admin-only**; never `verified_lab`; never writes `lab_tests`; queues review |
| `ai-vision-label` | food_label_vision | OCR fallback; label only; never contaminant confidence |
| `ai-vision-symptom` | symptom_vision | describes OBSERVABLE features in a symptom photo (stool/skin/ear/eye/teeth); never diagnoses/scores; server rules (not the model) set urgency; hands off to the rule-based triage |
| `ai-explain` | explanation | explains a deterministic result; adds no conclusions |
| `ai-care-plan` | care_plan | phrases an already-gated plan; suppresses gentle options on red flags |
| `ai-chat` | chat | assistant; deterministic emergency/poison routing first |

Shared (`_shared/`): `safety.ts` (mirror of `expo/lib/ai/safety.ts`), `provider.ts`
(OpenAI now, Anthropic-ready), `runtime.ts` (auth/budget/provider wrapper),
`prompts.ts`, `schemas.ts`, `auth.ts`, `budget.ts`, `log.ts`, `files.ts`, `cors.ts`.

## Database (migration `0018_ai_layer.sql`)

`ai_generations` (token/cost log + safety flags + review_status), `ai_chat_threads`,
`ai_chat_messages`, `ai_extracted_records` (default `needs_review`). All owner-scoped
via RLS; users can read and delete their own AI history; admins can read extracted
records for review.

## Environment variables

**Server-side only — set as Supabase Edge Function secrets** (`supabase secrets set`),
NEVER as `EXPO_PUBLIC_*`:

| Var | Purpose | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI key | — (required to enable AI) |
| `AI_PROVIDER` | `openai` (Anthropic later) | `openai` |
| `AI_ENABLED` | master switch; `false` disables all AI | `true` |
| `AI_CHAT_MODEL` | chat/explain/care-plan model | `gpt-4.1-mini` |
| `AI_VISION_MODEL` | label vision model | `gpt-4.1-mini` |
| `AI_SUMMARY_MODEL` | record/COA/report model | `gpt-4.1-mini` |
| `AI_DAILY_BUDGET_CENTS` | global daily cost cap (0 = none) | `0` |
| `AI_USER_DAILY_LIMIT` | per-user daily call cap (0 = none) | `100` |
| `ANTHROPIC_API_KEY` | (later) | — |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected into
edge functions automatically.

**Client-side:** none for AI. (Only the existing `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY`.) A test fails the build if any
`EXPO_PUBLIC_OPENAI*` / `EXPO_PUBLIC_ANTHROPIC*` or `sk-…` appears in client files.

## Deploy

```bash
supabase secrets set OPENAI_API_KEY=sk-... AI_PROVIDER=openai AI_ENABLED=true \
  AI_CHAT_MODEL=gpt-4.1-mini AI_VISION_MODEL=gpt-4.1-mini AI_SUMMARY_MODEL=gpt-4.1-mini \
  AI_DAILY_BUDGET_CENTS=2000 AI_USER_DAILY_LIMIT=100
supabase functions deploy ai-vet-report-rewrite ai-record-summary ai-coa-extract \
  ai-vision-label ai-vision-symptom ai-explain ai-care-plan ai-chat
# apply migration 0018 (psql or the SQL editor)
```

## What is implemented vs disabled until a key is added

- **Implemented & verified now (no key needed):** schema + RLS, the full client
  layer (gating, services, UI surfaces), the pure safety policy + 61 tests, all
  prompts and edge-function code. tsc / eslint / safety+data+toxins+ai suites / web
  export all pass.
- **Disabled until deployed + keyed:** the actual model calls. With `AI_ENABLED=false`
  or no `OPENAI_API_KEY`, every function returns a friendly "AI is off" envelope and
  the app shows a disabled note. AI is also OFF in the app until the user opts in
  (Settings → AI), with document processing a separate opt-in.

## Safety guarantees (enforced in code + schema + prompt)

- AI never diagnoses, prescribes, or doses.
- Emergency symptoms / suspected poisoning route deterministically (the model can't
  lower it); chat prepends the banner regardless of model output.
- AI never claims a food is clean/pure/safe; a photo can't establish contaminants.
- Extraction outputs are `needs_review`; COA extraction can never be `verified_lab`
  and never writes `lab_tests`.
- Care plans are drafts to discuss with a vet; gentle options are suppressed on red
  flags server-side.
- **Symptom photos** produce *observations only* — no diagnosis, score, or urgency.
  The model observes visible features; deterministic server rules (`assessInput` on
  the notes + a fixed observed-red-flag → routing map) decide urgency, and the UI
  hands off to the rule-based guided triage. Observations are `needs_review`.
- Sentry scrubs prompts/records/PII (`sendDefaultPii:false` + `beforeSend`).

## Roadmap: symptom image knowledge base

`ai-vision-symptom` deliberately returns structured `feature / value / confidence`
observations (not prose) so they can seed a future **dog & cat image knowledge
base** — mapping observed features (stool color/consistency, tongue/gum color, skin
lesions, ear redness, visible fleas/ticks, rashes) to what they may indicate, so the
app can interpret observations against curated, source-backed references instead of a
general model. Until that exists, observations stay descriptive and defer to the
deterministic triage and a veterinarian.
