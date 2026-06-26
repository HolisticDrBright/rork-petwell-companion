# Petwell — Production QA Checklist (real device + live Supabase)

Run this on a **physical iOS and Android device** against a **live Supabase
project** with the evidence data imported. It exists because some things can only
be verified end-to-end on-device with real data — the automated suites
(`tsc`, `eslint`, `bun tests/*`, web export) cover logic but not device behavior,
RLS under real auth, or how evidence renders with imported rows.

## Prerequisites

- [ ] Supabase project created; all migrations in `supabase/migrations/` applied (through `0018` — the AI layer).
- [ ] `expo/.env` (or EAS secrets) has `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Evidence imported: `data/food-evidence/import_food_evidence.sql` run (or the importers with a service-role key).
- [ ] One account promoted to admin: `update public.profiles set is_admin = true where id = '<uid>';`
- [ ] (For AI checks) Edge functions deployed + secrets set (`OPENAI_API_KEY`, `AI_ENABLED=true`, model names, budget) per `docs/AI_LAYER.md`. AI checks are skippable if AI isn't being shipped yet.
- [ ] Dev build installed on a real iOS device and a real Android device (Expo Go is not enough for native modules / notifications).

## 1. Food search

- [ ] Search a known brand by name → results return from Supabase (not only demo seeds).
- [ ] Scan a real barcode present in the catalog → resolves to the right product.
- [ ] Scan a barcode **not** in the catalog → Open Pet Food Facts fallback runs; the result is labeled open-database / pending review (never "verified").
- [ ] No-result search shows a clear empty state, not a spinner or crash.

## 2. Food evidence badges

- [ ] A product with imported `lab_tests` shows an evidence badge reflecting its true level (brand / study / open-database), not "Product-level lab".
- [ ] Freshpet (brand-level Clean Label Project certification) shows brand-level / certification context — **not** "cleanest" or product-level purity.
- [ ] "How Petwell scores food" link opens the trust page; its ladder + caps render.
- [ ] No surface shows "cleanest / purest / safest / verified clean" anywhere.

## 3. No-lab state (the commercially important one)

- [ ] A popular food with no public COA (e.g. Fancy Feast, Beneful) shows
      **"No public product-level COA found as of <date>."**
- [ ] Its contaminant-confidence reads low / "no public lab test found" — never high.
- [ ] The photo-limitation note is visible (a scan can't detect heavy metals/PFAS/etc.).

## 4. Brand-level vs product-level evidence

- [ ] A brand with self-published values (Wellness) shows "brand claim / brand-level only", capped at moderate — not "high".
- [ ] A study-level finding (CLP / EWG / aflatoxin) is shown as study context and does **not** floor or fail a specific product as if that product was tested.
- [ ] Only an admin-attached, current, product-level passing COA could raise purity to "high" (none exist in the seed set — confirm none show "high").

## 5. Recall display

- [ ] A product/brand with an imported recall shows it with the correct date + classification.
- [ ] A brand-level match reads "Brand-level recall match", **not** "Official FDA Recall" for the exact product.
- [ ] No human-food false positives appear (hot dog buns, animal crackers, catfish, etc.).
- [ ] Tapping a recall opens its FDA source link.

## 6. Admin queue (admin account)

- [ ] Open **Admin · data quality**; the data-quality metrics load.
- [ ] "Imported review queue" lists the imported products + lab evidence.
- [ ] **Approve** a product → it becomes admin_reviewed and drops off the queue; re-open the screen to confirm it stays resolved.
- [ ] **Reject** an item → it's hidden and the queue row resolves.
- [ ] Approving a lab_test does **not** turn brand/study evidence into product-level purity on the food result.
- [ ] A **non-admin** account sees the "admins only" message and cannot mutate (RLS).

## 7. Privacy: export & delete

- [ ] Settings → export data → the export includes the user's pets, logs, records, and longevity tables; it does **not** include catalog/reference tables.
- [ ] Settings → delete account/data → owned rows are removed; reference data is untouched; the session ends cleanly.
- [ ] After delete, signing back in shows no residual personal data.

## 8. Cross-cutting

- [ ] Toxin detail shows "Pending vet review" until a vet signs off.
- [ ] Integrative protocols show the "not individually vet-reviewed — confirm with your vet" note.
- [ ] Reminders fire as local notifications on both platforms (permission prompt handled).
- [ ] Offline: launching with no network shows cached/local data and a graceful banner, not a crash.

## 9. AI features (only if AI is deployed — see docs/AI_LAYER.md)

- [ ] **AI OFF (default):** every AI button (assistant, "Rewrite with AI", "Summarize with AI", "Use AI to read this label", "Explain with AI") shows the friendly "turn on AI in Settings" note and makes **no** network call.
- [ ] Settings → AI: enabling AI, then enabling document processing, unlocks the doc features; the data notice is visible.
- [ ] **Server OFF (`AI_ENABLED=false` / no key):** features return "AI is currently turned off" — not an error/crash.
- [ ] Assistant chat: a normal question gets a helpful, non-diagnostic reply; it never names a diagnosis or doses a medication.
- [ ] **Emergency input** ("my dog collapsed and can't breathe") → the assistant leads with the emergency banner and routes to a vet (the deterministic banner shows even before the model replies).
- [ ] **Toxin input** ("my dog ate xylitol gum") → poison-control banner with the hotline numbers.
- [ ] Vet-report "Rewrite with AI" → vet + owner summaries; red flags preserved; you review before sharing.
- [ ] Record "Summarize with AI" → structured summary marked "review carefully"; saved only after you confirm.
- [ ] Food label "Use AI to read this label" → fills editable text; never shows a contaminant/purity claim.
- [ ] Admin → COA extraction → result is `needs_review`, never `verified_lab`; nothing appears in `lab_tests`.
- [ ] Settings → "Delete AI history" → `ai_generations` / chat threads for the account are removed.

## 10. Payments, auth, native capture & uploads

- [ ] **RevenueCat:** paywall loads real products (lifetime/yearly/monthly); a sandbox purchase unlocks Pro; **Restore** works; entitlement persists across relaunch. Web build shows the no-IAP state gracefully.
- [ ] **Auth:** anonymous start works offline/local; email sign-up converts the anonymous account in place (data carries over); sign-in/out behaves; email-confirmation path is handled.
- [ ] **RLS:** signed in as user A you cannot read user B's pets/logs/records/AI data (try a second account); reference/catalog tables stay readable.
- [ ] **Camera scan:** food-scan camera + library permission prompts handled; a captured label flows to Analyze.
- [ ] **Uploads:** a document/photo uploads to the private `documents` bucket (records tab); it is not world-readable.

## Sign-off

| Area | iOS | Android | Notes |
|---|---|---|---|
| Food search | ☐ | ☐ | |
| Evidence badges | ☐ | ☐ | |
| No-lab state | ☐ | ☐ | |
| Brand vs product | ☐ | ☐ | |
| Recall display | ☐ | ☐ | |
| Admin queue | ☐ | ☐ | |
| Privacy export/delete | ☐ | ☐ | |
| AI opt-in / off states | ☐ | ☐ | |
| RevenueCat (purchase/restore) | ☐ | ☐ | |
| Auth + RLS isolation | ☐ | ☐ | |
| Camera scan + uploads | ☐ | ☐ | |
| Notifications | ☐ | ☐ | |
