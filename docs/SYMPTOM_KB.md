# Petwell — Symptom Image Knowledge Base

A curated, source-backed reference that maps **observable visual features** (from
`ai-vision-symptom`, or manual notes) to conservative context — what a feature *may*
relate to, how urgent it looks, what to watch for, and which rule-based triage to
hand off to. It is **never a diagnosis**, and every entry stays pending vet review
until a licensed veterinarian signs off. This mirrors the toxin/food provenance
model: the app never invents clinical conclusions.

> The knowledge base provides context. The **deterministic triage** and a
> **veterinarian** make the assessment. KB urgency nudges vet contact; it never
> overrides the emergency/toxin routing.

## Where it fits

```
photo → ai-vision-symptom (observable features only)
             │  { feature, value, confidence }[]  + observedRedFlags
             ▼
      matchSymptomKb (area + species scoped, token match)
             │  source-backed entries, most-urgent first
             ▼
   scan-result shows "What this may relate to" (reference, pending vet review)
             │
             ▼
      Continue to guided check  →  rule-based triage (source of truth)
```

The vision model only *observes*; deterministic server rules set urgency/routing
(see `docs/AI_LAYER.md`). The KB adds descriptive, cited context on top — it does
not change routing.

## Data model

`expo/lib/symptomKb/types.ts` → `SymptomKbEntry`:

| Field | Meaning |
|---|---|
| `species` | `dog` \| `cat` \| `both` |
| `area` | `poop` \| `skin` \| `ear` \| `eye` \| `teeth` (matches the vision areas) |
| `feature` | loose grouping, e.g. `stool_color`, `gum_color` |
| `matchTokens` | lowercase tokens that, if present in the observed value/summary, match |
| `title` | short label, e.g. "Black or tarry stool" |
| `mayIndicate` | **hedged, descriptive** context — "can be associated with…". Never "your pet has…" |
| `urgency` | `info` \| `watch` \| `vet_soon` \| `emergency` (a nudge, not a verdict) |
| `watchFor` | related signs to watch |
| `relatedConcern` | triage module id to hand off to (`diarrhea`/`skin`/`ear`/`eye`/…) |
| `source` | reputable general reference (Merck Vet Manual, VCA, ASPCA, CAPC, AAHA) |
| `reviewStatus` | `needs_vet_review` (default) \| `vet_reviewed` |

## Provenance rules (enforced + tested)

- **Never a diagnosis, treatment, or purity claim.** Copy is descriptive and hedged;
  `expo/tests/symptomKb.test.ts` asserts no diagnosis/dosing/"cleanest/purest/safest"
  phrasing anywhere and that every `mayIndicate` hedges.
- **Everything is `needs_vet_review`** until a vet signs off — nothing auto-trusted.
  The UI shows matches labeled "general reference, pending vet review".
- **Every entry cites a source.**
- **Observed red flags map to `emergency`** (black/tarry stool, pale/white gums,
  blue/purple gums) so the context reinforces — never softens — a vet nudge.
- The matcher is **area- and species-scoped** and returns nothing for unrelated
  observations (tested), so it can't surface off-topic content.

## Files

- `expo/lib/symptomKb/` — `types.ts`, `data.ts` (offline seed), `match.ts` (pure).
- `expo/services/symptomKbService.ts` — offline-first hydrate (local seed +
  vet-curated remote entries; never throws).
- `supabase/migrations/0021_symptom_kb.sql` — `symptom_kb_entries` table + RLS
  (world-readable, admin-writable) + a seed subset.
- `expo/tests/symptomKb.test.ts` — safety invariants (in CI).
- Wired into `expo/app/scan-result.tsx` under the AI observations (opt-in AI only).

## Growing it (scaffold → curated library)

This is a **scaffold**: ~19 high-value features across all five areas, offline-first,
each source-backed and `needs_vet_review`. To grow it:

1. Add entries to `expo/lib/symptomKb/data.ts` (offline) and/or the
   `symptom_kb_entries` table (remote, vet-curated). Remote overrides local by
   `area + title`.
2. A licensed vet reviews each entry and sets `review_status = 'vet_reviewed'`
   (+ `reviewed_by`, `last_reviewed_at`).
3. Keep copy hedged and cited; the tests block diagnosis/treatment/purity language.

Future direction (see `docs/AI_LAYER.md`): as the library grows, the app can weight
matches by feature confidence and, eventually, train against a labeled image dataset
— but interpretations always defer to the deterministic triage and a veterinarian.
