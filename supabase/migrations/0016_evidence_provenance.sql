-- Petwell evidence & provenance foundation.
-- Every reference claim can carry: where it came from, when it was reviewed, its
-- evidence status, and a confidence score. Adds ingestion/admin/lab/toxin tables,
-- a crowdsourced-submission intake, and additive provenance columns on existing
-- catalog tables. Reference tables are world-readable; submissions are owner-
-- scoped; import/admin tables are service-role + admin only.

-- ── Evidence status enum ─────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'evidence_status') then
    create type public.evidence_status as enum (
      'verified_official',
      'verified_lab',
      'brand_claim',
      'open_database',
      'crowdsourced_unverified',
      'admin_reviewed',
      'demo_seed',
      'stale',
      'rejected'
    );
  end if;
end $$;

-- ── Admin flag on profiles ───────────────────────────────────
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── Additive provenance columns on existing catalog tables ───
alter table public.food_products
  add column if not exists evidence_status public.evidence_status,
  add column if not exists match_confidence text,
  add column if not exists ingredient_text text,
  add column if not exists image_url text,
  add column if not exists source_url text,
  add column if not exists last_reviewed_at timestamptz;

alter table public.recall_events
  add column if not exists fda_recall_number text,
  add column if not exists event_id text,
  add column if not exists classification text,
  add column if not exists status text,
  add column if not exists distribution text,
  add column if not exists brand_match_level text,   -- 'product' | 'brand' | 'unmatched'
  add column if not exists dedup_key text,
  add column if not exists raw_payload jsonb,
  add column if not exists evidence_status public.evidence_status,
  add column if not exists last_reviewed_at timestamptz;

create unique index if not exists idx_recall_events_dedup on public.recall_events(dedup_key) where dedup_key is not null;

alter table public.contaminant_tests
  add column if not exists level text not null default 'product',  -- 'product' | 'brand' | 'batch' | 'study'
  add column if not exists evidence_status public.evidence_status,
  add column if not exists expires_at date,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists confidence_score numeric;

-- ── Generalized lab evidence (brand / study / batch level) ───
create table if not exists public.lab_tests (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'brand',               -- 'product' | 'brand' | 'batch' | 'study'
  product_id uuid references public.food_products(id) on delete set null,
  brand_id uuid references public.food_brands(id) on delete set null,
  lot text,
  contaminant_category text not null,                -- heavy_metals | microplastics | pesticides | mycotoxins | pfas | acrylamide | bpa_bps | other
  substance text,
  result_value text,
  unit text,
  status text,                                       -- pass | elevated | fail | not_detected | unknown
  test_date date,
  lab_name text,
  source_url text,
  document_path text,
  expires_at date,
  evidence_status public.evidence_status not null default 'brand_claim',
  confidence_score numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_lab_tests_product on public.lab_tests(product_id);
create index if not exists idx_lab_tests_brand on public.lab_tests(brand_id);

-- ── Toxin reference (curated, admin-reviewed) ────────────────
create table if not exists public.toxin_references (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  category text not null,                            -- food | plant | essential_oil | household
  species text not null default 'both',             -- dog | cat | both
  severity text not null default 'high',             -- toxic | high | caution
  body_system text,
  symptoms text[] not null default '{}',
  emergency_text text,
  source_name text,
  source_url text,
  evidence_status public.evidence_status not null default 'admin_reviewed',
  last_reviewed_at timestamptz not null default now()
);
create index if not exists idx_toxin_references_category on public.toxin_references(category);
create unique index if not exists uq_toxin_references_name on public.toxin_references(name);

-- ── Product aliases (names/barcodes) ─────────────────────────
create table if not exists public.food_product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.food_products(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'name',           -- name | barcode | brand_variant
  created_at timestamptz not null default now()
);
create index if not exists idx_food_product_aliases_product on public.food_product_aliases(product_id);

-- ── Crowdsourced submissions (owner-scoped) ──────────────────
create table if not exists public.product_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode text,
  brand_name text,
  product_name text,
  species text,
  notes text,
  payload jsonb,
  evidence_status public.evidence_status not null default 'crowdsourced_unverified',
  review_status text not null default 'pending',     -- pending | approved | rejected | merged
  matched_product_id uuid references public.food_products(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_submissions_owner on public.product_submissions(owner_id);
create index if not exists idx_product_submissions_status on public.product_submissions(review_status);

create table if not exists public.ocr_label_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid,
  raw_ocr_text text,
  cleaned_text text,
  parsed_ingredients text[],
  guaranteed_analysis jsonb,
  image_path text,
  matched_product_id uuid references public.food_products(id) on delete set null,
  match_confidence text,
  evidence_status public.evidence_status not null default 'crowdsourced_unverified',
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_ocr_submissions_owner on public.ocr_label_submissions(owner_id);

-- ── Admin review queue + audit log (service/admin only) ──────
create table if not exists public.admin_review_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,                         -- product_submission | ocr_label | recall | lab_test | brand_merge
  entity_id uuid,
  priority int not null default 0,
  status text not null default 'open',               -- open | in_progress | resolved
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_queue_status on public.admin_review_queue(status);

create table if not exists public.admin_review_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null default auth.uid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,                              -- approve | reject | merge | edit | attach_evidence | set_status
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_actions_entity on public.admin_review_actions(entity_type, entity_id);

-- ── Ingestion logging + raw snapshots (service only) ─────────
create table if not exists public.data_import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,                              -- openfda_recalls | open_pet_food_facts | manual
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',            -- running | success | error
  records_seen int not null default 0,
  records_created int not null default 0,
  records_updated int not null default 0,
  records_skipped int not null default 0,
  errors jsonb
);

create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  url text,
  fetched_at timestamptz not null default now(),
  content_hash text,
  raw_payload jsonb
);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.lab_tests enable row level security;
alter table public.toxin_references enable row level security;
alter table public.food_product_aliases enable row level security;
alter table public.product_submissions enable row level security;
alter table public.ocr_label_submissions enable row level security;
alter table public.admin_review_queue enable row level security;
alter table public.admin_review_actions enable row level security;
alter table public.data_import_runs enable row level security;
alter table public.source_snapshots enable row level security;

-- Reference tables: world-readable
do $$
declare t text;
begin
  foreach t in array array['lab_tests','toxin_references','food_product_aliases']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
  end loop;
end $$;

-- Submissions: owner can do anything with their own; admins can read all
do $$
declare t text;
begin
  foreach t in array array['product_submissions','ocr_label_submissions']
  loop
    execute format('drop policy if exists %I_owner on public.%I', t, t);
    execute format('create policy %I_owner on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format('create policy %I_admin_read on public.%I for select using (public.is_admin())', t, t);
  end loop;
end $$;

-- Admin/import tables: admin-only via RLS (service-role key bypasses RLS).
do $$
declare t text;
begin
  foreach t in array array['admin_review_queue','admin_review_actions','data_import_runs','source_snapshots']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_admin on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ── Seed toxin_references from the curated safety lists ──────
insert into public.toxin_references (name, aliases, category, species, severity, body_system, symptoms, emergency_text, source_name, source_url)
values
  ($q$Xylitol (birch sugar)$q$, array[$q$xylitol$q$,$q$birch sugar$q$], $q$food$q$, $q$both$q$, $q$toxic$q$, $q$Metabolic/Liver$q$, array[$q$weakness$q$,$q$vomiting$q$,$q$collapse$q$,$q$seizures$q$], $q$Suspected ingestion is an emergency — call your vet or Pet Poison Helpline now.$q$, $q$Pet Poison Helpline$q$, $q$https://www.petpoisonhelpline.com/poison/xylitol/$q$),
  ($q$Grapes / raisins$q$, array[$q$grape$q$,$q$raisin$q$,$q$currant$q$,$q$sultana$q$], $q$food$q$, $q$both$q$, $q$toxic$q$, $q$Kidney$q$, array[$q$vomiting$q$,$q$lethargy$q$,$q$reduced urination$q$], $q$No safe amount — treat any ingestion as an emergency.$q$, $q$ASPCA APCC$q$, $q$https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets$q$),
  ($q$Onion / garlic / chives$q$, array[$q$onion$q$,$q$garlic$q$,$q$chive$q$,$q$leek$q$,$q$shallot$q$], $q$food$q$, $q$both$q$, $q$high$q$, $q$Blood (RBC)$q$, array[$q$weakness$q$,$q$pale gums$q$,$q$dark urine$q$], $q$Cats are especially sensitive — call your vet if ingested.$q$, $q$ASPCA APCC$q$, $q$https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets$q$),
  ($q$Chocolate / cocoa$q$, array[$q$chocolate$q$,$q$cocoa$q$,$q$cacao$q$,$q$theobromine$q$], $q$food$q$, $q$both$q$, $q$toxic$q$, $q$Heart/Nervous$q$, array[$q$vomiting$q$,$q$racing heart$q$,$q$tremors$q$,$q$seizures$q$], $q$Darker chocolate is worse — call your vet or poison control.$q$, $q$Pet Poison Helpline$q$, $q$https://www.petpoisonhelpline.com/poison/chocolate/$q$),
  ($q$Macadamia nuts$q$, array[$q$macadamia$q$], $q$food$q$, $q$dog$q$, $q$high$q$, $q$Nervous/Muscular$q$, array[$q$weakness$q$,$q$tremors$q$,$q$hyperthermia$q$], $q$Call your vet if your dog ate macadamia nuts.$q$, $q$ASPCA APCC$q$, $q$https://www.aspca.org/pet-care/animal-poison-control/people-foods-avoid-feeding-your-pets$q$),
  ($q$Lily (true & day lilies)$q$, array[$q$lily$q$,$q$lilies$q$], $q$plant$q$, $q$cat$q$, $q$toxic$q$, $q$Kidney$q$, array[$q$vomiting$q$,$q$lethargy$q$,$q$kidney failure$q$], $q$Even pollen or vase water can be fatal to cats — emergency vet now.$q$, $q$ASPCA APCC$q$, $q$https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants$q$),
  ($q$Sago palm$q$, array[$q$sago$q$,$q$cycad$q$], $q$plant$q$, $q$both$q$, $q$toxic$q$, $q$Liver$q$, array[$q$vomiting$q$,$q$jaundice$q$,$q$liver failure$q$], $q$Highly toxic — emergency care required.$q$, $q$ASPCA APCC$q$, $q$https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants$q$),
  ($q$Tea tree (melaleuca) oil$q$, array[$q$tea tree$q$,$q$melaleuca$q$], $q$essential_oil$q$, $q$both$q$, $q$toxic$q$, $q$Nervous/Skin$q$, array[$q$weakness$q$,$q$tremors$q$,$q$drooling$q$], $q$Toxic even in small amounts — call your vet/poison control.$q$, $q$Pet Poison Helpline$q$, $q$https://www.petpoisonhelpline.com/poison/tea-tree-oil/$q$),
  ($q$Pennyroyal oil$q$, array[$q$pennyroyal$q$], $q$essential_oil$q$, $q$both$q$, $q$toxic$q$, $q$Liver$q$, array[$q$vomiting$q$,$q$lethargy$q$,$q$liver failure$q$], $q$Can cause liver failure — emergency.$q$, $q$Pet Poison Helpline$q$, $q$https://www.petpoisonhelpline.com/$q$),
  ($q$Citrus / d-limonene oils$q$, array[$q$citrus oil$q$,$q$d-limonene$q$,$q$limonene$q$], $q$essential_oil$q$, $q$cat$q$, $q$high$q$, $q$Skin/Nervous$q$, array[$q$drooling$q$,$q$weakness$q$,$q$tremors$q$], $q$Cats are very sensitive to citrus oils — avoid and call your vet if exposed.$q$, $q$Pet Poison Helpline$q$, $q$https://www.petpoisonhelpline.com/$q$)
on conflict (name) do nothing;
