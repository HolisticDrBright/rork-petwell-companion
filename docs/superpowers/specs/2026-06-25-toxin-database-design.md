# Petwell Local Toxin Database Design

Date: 2026-06-25
Status: Approved direction, ready for implementation planning
Scope: Dogs and cats only

## Goal

Build a legally clean, medically conservative, local toxin safety database for Petwell. The first version should cover common dog and cat toxins, work offline, connect to existing triage and integrative safety surfaces, and route suspected poison exposure to a veterinarian or poison control.

The database must not copy a proprietary poison-control database. It should use original Petwell summaries, source links, review metadata, and conservative emergency language.

## Safety Position

Petwell may help owners recognize that something could be dangerous, but it must not diagnose poisoning, estimate safe doses, or provide treatment instructions. Any suspected ingestion of a dangerous toxin should route to emergency veterinary help.

Prominent hotline actions:

- ASPCA Animal Poison Control: 888-426-4435
- Pet Poison Helpline: 855-764-7661

Core copy rules:

- "Call your veterinarian or poison control now" for severe/high-risk items.
- "Do not induce vomiting unless instructed by a veterinarian or poison control."
- "Bring the package, plant, medication bottle, photo, or ingredient label if available."
- "This is guidance only, not a diagnosis."

## V1 Content Scope

V1 should target 250-500 entries across common consumer risks for dogs and cats.

Categories:

- Foods: xylitol/birch sugar, chocolate/cocoa, grapes/raisins/currants, onion/garlic/chives/leeks, alcohol, caffeine, macadamia nuts, raw yeast dough, moldy food, high-fat table scraps.
- Plants: lilies, sago palm, oleander, azalea/rhododendron, tulip/daffodil bulbs, autumn crocus, foxglove, pothos, philodendron, dieffenbachia, aloe, jade, kalanchoe.
- Human medications: NSAIDs, acetaminophen, antidepressants, ADHD stimulants, beta blockers, calcium channel blockers, sleep medications, benzodiazepines, decongestants.
- Veterinary medications and supplements: accidental overdose patterns, flea/tick product misuse, iron, vitamin D, 5-HTP, alpha-lipoic acid.
- Household and chemical: antifreeze/ethylene glycol, bleach, laundry pods, disinfectants, paint/solvents, batteries, silica gel, fertilizers, pesticides, rodenticides, insecticides.
- Oils and botanicals: tea tree, pennyroyal, wintergreen, eucalyptus, citrus oils, peppermint oil, cinnamon/clove oils.
- Recreational and environmental: cannabis/THC, nicotine, mushrooms, blue-green algae.

V1 should prioritize commonness, severity, and likelihood that owners search for the item.

## Data Model

Add Supabase/reference tables and a local JSON fallback. Reference toxin tables should be publicly readable and not user-owned.

Suggested tables:

- `toxin_references`
- `toxin_aliases`
- `toxin_sources`
- `toxin_source_links`
- `toxin_review_actions`
- `toxin_database_versions`

`toxin_references` fields:

- `id`
- `slug`
- `name`
- `category`
- `species_scope`: dog, cat, both
- `dog_severity`: emergency, high, caution, usually_safe, unknown
- `cat_severity`: emergency, high, caution, usually_safe, unknown
- `body_systems`: JSON/text array
- `summary`
- `clinical_signs`
- `emergency_action`
- `what_not_to_do`
- `dose_warning`
- `common_sources`
- `evidence_status`: source_cited, vet_reviewed, needs_review, deprecated
- `last_reviewed_at`
- `reviewed_by`
- `created_at`
- `updated_at`

`toxin_aliases` fields:

- `id`
- `toxin_id`
- `alias`
- `normalized_alias`
- `match_weight`
- `locale`

`toxin_sources` fields:

- `id`
- `name`
- `publisher`
- `url`
- `source_type`: poison_control_public, veterinary_manual, regulatory, academic, manufacturer, internal_review
- `accessed_at`

`toxin_source_links` fields:

- `id`
- `toxin_id`
- `source_id`
- `claim_type`: toxicity, symptoms, species_sensitivity, emergency_guidance, synonym
- `note`

`toxin_review_actions` fields:

- `id`
- `toxin_id`
- `action`
- `reviewer`
- `note`
- `created_at`

`toxin_database_versions` fields:

- `id`
- `version`
- `entry_count`
- `published_at`
- `notes`

## Local App API

Add a toxin module that can read from local data immediately and later hydrate from Supabase.

Suggested files:

- `expo/lib/toxins/types.ts`
- `expo/lib/toxins/localData.ts` or `expo/data/toxins.v1.json`
- `expo/lib/toxins/search.ts`
- `expo/lib/toxins/safety.ts`
- `expo/services/toxinService.ts`

Core functions:

- `searchToxins(query, species)`
- `matchToxinsInText(text, species)`
- `getToxinBySlug(slug)`
- `getToxinSeverity(toxin, species)`
- `buildEmergencyAction(toxin, species)`
- `shouldRouteToPoisonControl(toxin, species)`

Search should support aliases, typo-tolerant-ish matching where practical, category filtering, and common lay terms such as "weed", "pot", "rat poison", "pain reliever", "Advil", "Tylenol", "birch sugar", and "gum sweetener".

## App Integrations

Add a dedicated Toxin Lookup screen:

- Search bar
- Dog/cat selector defaults to selected pet
- Category filters
- Severity badges
- Entry detail page
- One-tap call buttons for ASPCA and Pet Poison Helpline
- "Find emergency vet nearby"
- "Add to vet report" or "Save concern to timeline"

Update existing surfaces:

- Triage: suspected toxin exposure should remain a red flag and link to poison help.
- Treat audit: replace the small hardcoded `TOXIC_FOODS` list with toxin database matching.
- Environment scan: use plant/oil/household entries from toxin database.
- Meal planner: block or warn when an ingredient matches a dog/cat toxin.
- Vet report: include toxin concern, selected entry, signs, timing, and hotline instructions.
- Settings/About: show source and review policy.

## UX States

Severity labels:

- Emergency: call vet or poison control now.
- High risk: contact vet/poison control promptly.
- Caution: may be unsafe depending on amount, pet size, or context; ask vet.
- Usually safe: not known to be toxic, but monitor and call vet if symptoms appear.
- Unknown: Petwell does not have enough information; ask vet/poison control.

Entry detail should show:

- A concise headline
- Dog/cat-specific severity
- Common names/aliases
- Where pets encounter it
- Signs to watch for
- What to do now
- What not to do
- Hotline buttons
- Source links
- Last reviewed date

Avoid:

- Treatment protocols
- Dose calculators
- "safe amount" claims
- Reassurance when uncertainty is high
- Long copied passages from source sites

## Data Creation Process

Build V1 as an original curated dataset:

1. Create a seed spreadsheet or JSON template.
2. Populate the first 50 highest-priority toxins manually from public references.
3. Use consistent Petwell wording and severity rules.
4. Add source links and accessed dates.
5. Add vet-review metadata as `needs_review` until reviewed.
6. Expand to 250-500 entries after the UI and matching pipeline are proven.

Use source references for facts, but write original summaries. Do not bulk scrape or republish proprietary content.

Recommended public references:

- ASPCA public poison-control pages and toxic/non-toxic plant list
- Pet Poison Helpline public poison pages
- Merck Veterinary Manual public pages
- FDA/EPA public safety data where relevant
- Peer-reviewed/open veterinary references for special cases

## Error Handling

If the toxin database cannot load:

- Keep the emergency hotline card visible.
- Show a simple fallback message: "If you suspect poisoning, call your vet or poison control now."
- Do not allow a blank or broken toxin lookup screen.

If search has no result:

- Offer general poison-control routing.
- Let the user save/search notes for the vet report.
- Do not say the item is safe just because no result was found.

## Testing

Add focused tests for:

- Alias matching finds common names and brand-like lay terms.
- Dog/cat severity differs where appropriate, such as lilies and acetaminophen.
- High-severity entries show hotline actions.
- No result does not imply safety.
- Treat audit blocks xylitol, chocolate, onion/garlic, grapes/raisins.
- Environment scan flags lilies, sago palm, essential oils, antifreeze, rodenticides.
- Triage toxin exposure remains red/emergency and suppresses natural recommendations.
- Vet report includes toxin concern and hotline instruction.
- Local fallback works without Supabase.

## Rollout Plan

Phase 1:

- Add schema and local module.
- Seed 50 highest-priority toxins.
- Add toxin lookup screen and hotline cards.
- Wire treat audit, environment scan, and triage.
- Add tests.

Phase 2:

- Expand to 250-500 entries.
- Add Supabase sync/reference tables.
- Add admin review metadata.
- Add versioning and last-reviewed badges.

Phase 3:

- Add vet reviewer workflow.
- Add source review dashboard.
- Consider commercial licensing or poison-control partnership once traction supports the cost.

## Acceptance Criteria

- A dog/cat owner can search common toxins offline.
- Severe toxins clearly route to ASPCA Animal Poison Control, Pet Poison Helpline, emergency vet, or the user's vet.
- No entry provides dosing/treatment advice.
- Current hardcoded safety lists are replaced or backed by the toxin module.
- App screens never imply "not found" means safe.
- Every toxin entry has source links and review status.
- Tests cover critical matching and emergency-routing behavior.
