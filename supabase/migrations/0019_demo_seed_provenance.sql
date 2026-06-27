-- Petwell · 0019 backfill demo-seed provenance
--
-- Migrations 0006 and 0010 inserted FICTIONAL "(sample)" brands, products, lab
-- rows and recalls to demonstrate the food-intelligence UI. They predate the
-- `evidence_status` column (added in 0016), so those rows are currently NULL —
-- indistinguishable from real, not-yet-graded catalog data. The app's production
-- product filter (`lib/food/productVisibility.ts`) hides only `demo_seed`
-- products, so these illustrative rows would otherwise surface to real users.
--
-- This migration tags them `demo_seed`. It is:
--   • Precise — only rows tied to a "(sample)" brand (the seed marker) or already
--     flagged `is_demo` are touched.
--   • Idempotent — guarded by `evidence_status IS NULL`, so real imports
--     (`open_database`), recalls (`verified_official`), admin-reviewed rows, and
--     anything already graded are never overwritten, and re-running is a no-op.
--   • Non-destructive — provenance only; no rows are deleted and no purity/score
--     changes are implied. Demo rows never read as verified anywhere in the app.

-- ── Fictional seed products → demo_seed ──────────────────────────────────────
-- All seed brands carry a "(sample)" manufacturer; real OPFF brands do not.
update public.food_products p
set evidence_status = 'demo_seed'
where p.evidence_status is null
  and p.brand_id in (
    select b.id from public.food_brands b where b.manufacturer like '%(sample)%'
  );

-- ── Fictional seed recalls (brand-level, on sample brands) → demo_seed ────────
-- Keeps illustrative recalls from reading as official FDA recalls in production
-- even if a demo product is viewed in dev/admin.
update public.recall_events r
set evidence_status = 'demo_seed'
where r.evidence_status is null
  and r.brand_id in (
    select b.id from public.food_brands b where b.manufacturer like '%(sample)%'
  );

-- ── Illustrative lab rows already flagged is_demo → demo_seed ─────────────────
-- 0010 marked these `is_demo = true`; mirror that into evidence_status so admin
-- provenance counts and any status-based query agree. (foodService already hides
-- is_demo lab rows from production users; this keeps the two signals consistent.)
update public.contaminant_tests ct
set evidence_status = 'demo_seed'
where ct.evidence_status is null
  and ct.is_demo = true;
