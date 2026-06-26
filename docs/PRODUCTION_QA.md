# Petwell — Production QA Checklist (real device + live Supabase)

Run this on a **physical iOS and Android device** against a **live Supabase
project** with the evidence data imported. It exists because some things can only
be verified end-to-end on-device with real data — the automated suites
(`tsc`, `eslint`, `bun tests/*`, web export) cover logic but not device behavior,
RLS under real auth, or how evidence renders with imported rows.

## Prerequisites

- [ ] Supabase project created; all migrations in `supabase/migrations/` applied (through `0016`).
- [ ] `expo/.env` (or EAS secrets) has `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Evidence imported: `data/food-evidence/import_food_evidence.sql` run (or the importers with a service-role key).
- [ ] One account promoted to admin: `update public.profiles set is_admin = true where id = '<uid>';`
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
