# Petwell — companion app

Trusted daily pet-health companion: adaptive symptom triage, longitudinal
records, evidence-graded food intelligence, toxin lookup, and vet-ready reports.
Expo Router + React Native + Supabase.

## Develop

```bash
bun install
bun run start        # expo dev server (or: start-web)
```

## Verify

```bash
bun run typecheck && bun run lint && bun run test
```

## Key docs

- `../docs/PRODUCTION_SETUP.md` — env vars, EAS, data modes
- `../docs/PRODUCTION_QA.md` — on-device release checklist
- `../docs/AI_LAYER.md` — server-side AI (edge functions; no model keys in app)
- `../docs/FOOD_EVIDENCE_MODEL.md` / `../docs/SYMPTOM_KB.md` — evidence rules
- `../docs/SECURITY.md` — which keys live where
