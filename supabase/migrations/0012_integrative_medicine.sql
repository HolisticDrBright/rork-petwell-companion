-- Petwell · 0012 Integrative Systems Medicine
-- Reference catalog (world-readable) + per-user generated plans (owner-scoped).
-- The deterministic safety engine lives in app code (lib/integrative); these
-- tables make the catalog queryable/auditable and persist generated plans.
-- Nothing here is diagnostic or a treatment for emergencies.

create table public.biological_systems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.system_patterns (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.biological_systems(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index system_patterns_system_idx on public.system_patterns(system_id);

create table public.evidence_grades (
  grade text primary key,
  label text not null,
  description text not null
);

create table public.species_safety_rules (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  species text not null check (species in ('dog','cat')),
  severity text not null default 'caution' check (severity in ('safe','caution','avoid')),
  rule text not null,
  created_at timestamptz not null default now()
);

create table public.supplement_ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  benefit text not null,
  systems jsonb not null default '[]',
  dog_safety text not null default 'caution' check (dog_safety in ('safe','caution','avoid')),
  cat_safety text not null default 'caution' check (cat_safety in ('safe','caution','avoid')),
  evidence_grade text references public.evidence_grades(grade),
  ask_vet_first boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

create table public.herb_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  benefit text not null,
  systems jsonb not null default '[]',
  dog_safety text not null default 'caution' check (dog_safety in ('safe','caution','avoid')),
  cat_safety text not null default 'caution' check (cat_safety in ('safe','caution','avoid')),
  evidence_grade text references public.evidence_grades(grade),
  ask_vet_first boolean not null default true,
  thermal_nature text check (thermal_nature in ('warming','cooling','neutral')),
  flavor text,
  tcm_pattern text,
  source text,
  created_at timestamptz not null default now()
);

create table public.natural_remedies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null,
  systems jsonb not null default '[]',
  benefit text not null,
  evidence_grade text references public.evidence_grades(grade),
  ask_vet_first boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);

create table public.tcm_food_properties (
  id uuid primary key default gen_random_uuid(),
  food text not null,
  thermal_nature text check (thermal_nature in ('warming','cooling','neutral')),
  flavor text,
  tcm_pattern_support text,
  species_safety text,
  condition_contraindications text,
  preparation_notes text,
  created_at timestamptz not null default now()
);

create table public.contraindications (
  id uuid primary key default gen_random_uuid(),
  item_slug text not null,
  item_kind text not null,
  contraindication text not null,
  created_at timestamptz not null default now()
);
create index contraindications_item_idx on public.contraindications(item_slug);

create table public.medication_interactions (
  id uuid primary key default gen_random_uuid(),
  item_slug text not null,
  item_kind text not null,
  drug_class text not null,
  note text,
  created_at timestamptz not null default now()
);
create index medication_interactions_item_idx on public.medication_interactions(item_slug);

create table public.condition_meal_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  system_slug text not null,
  pattern text,
  base_urgency text,
  red_flags jsonb not null default '[]',
  food_first jsonb not null default '[]',
  lifestyle jsonb not null default '[]',
  consider_items jsonb not null default '[]',
  what_to_track jsonb not null default '[]',
  when_to_ask_vet jsonb not null default '[]',
  notes jsonb not null default '[]',
  cat_guidance text,
  created_at timestamptz not null default now()
);

create table public.integrative_protocols (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  system_slug text not null,
  summary text,
  created_at timestamptz not null default now()
);

-- Per-user generated plans (owner-scoped, like triage_results / food_scores).
create table public.protocol_recommendations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  triage_result_id uuid references public.triage_results(id) on delete set null,
  system_slug text,
  condition_slug text,
  urgency text,
  emergency_override boolean not null default false,
  plan jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index protocol_recommendations_pet_idx on public.protocol_recommendations(pet_id, created_at desc);

-- ── RLS ──
alter table public.biological_systems       enable row level security;
alter table public.system_patterns          enable row level security;
alter table public.evidence_grades          enable row level security;
alter table public.species_safety_rules     enable row level security;
alter table public.supplement_ingredients   enable row level security;
alter table public.herb_profiles            enable row level security;
alter table public.natural_remedies         enable row level security;
alter table public.tcm_food_properties      enable row level security;
alter table public.contraindications        enable row level security;
alter table public.medication_interactions  enable row level security;
alter table public.condition_meal_plans     enable row level security;
alter table public.integrative_protocols    enable row level security;
alter table public.protocol_recommendations enable row level security;

create policy biological_systems_read      on public.biological_systems      for select using (true);
create policy system_patterns_read         on public.system_patterns         for select using (true);
create policy evidence_grades_read         on public.evidence_grades         for select using (true);
create policy species_safety_rules_read    on public.species_safety_rules    for select using (true);
create policy supplement_ingredients_read  on public.supplement_ingredients  for select using (true);
create policy herb_profiles_read           on public.herb_profiles           for select using (true);
create policy natural_remedies_read        on public.natural_remedies        for select using (true);
create policy tcm_food_properties_read     on public.tcm_food_properties     for select using (true);
create policy contraindications_read       on public.contraindications       for select using (true);
create policy medication_interactions_read on public.medication_interactions for select using (true);
create policy condition_meal_plans_read    on public.condition_meal_plans    for select using (true);
create policy integrative_protocols_read   on public.integrative_protocols   for select using (true);

create policy protocol_recommendations_owner on public.protocol_recommendations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
