-- Petwell Longevity layer: health scores, patterns, meal plans, treats,
-- environment, programs, and marketplace. Catalog tables are world-readable;
-- per-pet user data is owner-scoped (owner_id = auth.uid()).

-- ── Catalog: meal plans ──────────────────────────────────────
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  condition_slug text,
  species text not null default 'both',
  who_for text,
  calories_note text,
  fat_note text,
  protein_note text,
  fiber_note text,
  hydration_note text,
  thermal_nature text,
  tcm_pattern text,
  prep text,
  evidence text,
  needs_nutritionist boolean not null default false,
  cat_caution text,
  contraindications text[] not null default '{}',
  commercial text[] not null default '{}',
  homemade text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_slug text not null,
  kind text not null,
  name text not null,
  note text,
  sort int not null default 0
);

-- ── Catalog: environment risks ───────────────────────────────
create table if not exists public.environment_risks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  question text not null,
  why text not null,
  safer_step text not null,
  allergy_relevant boolean not null default false,
  cat_severity text not null default 'caution',
  dog_severity text not null default 'caution'
);

-- ── Catalog: marketplace products ────────────────────────────
create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null,
  name text not null,
  species text not null default 'both',
  evidence text not null default 'C',
  transparency int not null default 3,
  ingredient_quality int not null default 3,
  lab_tested boolean not null default false,
  reported_outcomes int not null default 3,
  fit_tags text[] not null default '{}',
  blurb text
);

-- ── Catalog: program task templates ──────────────────────────
create table if not exists public.program_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  kind text not null default 'daily',
  label text not null,
  sort int not null default 0
);

-- ── User data: health scores + system sub-scores ─────────────
create table if not exists public.health_scores (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  overall int not null,
  band text not null,
  headline text,
  generated_at date not null default current_date,
  systems jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.system_scores (
  id uuid primary key default gen_random_uuid(),
  health_score_id uuid not null references public.health_scores(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  score int not null,
  band text not null,
  status text,
  created_at timestamptz not null default now()
);

-- ── User data: detected patterns ─────────────────────────────
create table if not exists public.detected_patterns (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pattern_id text not null,
  name text not null,
  system_slug text,
  confidence text,
  urgent boolean not null default false,
  summary text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── User data: treat audits ──────────────────────────────────
create table if not exists public.treat_audits (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  verdict text not null,
  calories int,
  fat_level text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── User data: environment checklists ────────────────────────
create table if not exists public.environment_checklists (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── User data: progress programs + logs ──────────────────────
create table if not exists public.progress_programs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id text not null,
  started_at date not null default current_date,
  status text not null default 'active',
  logged_days int[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.program_logs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.progress_programs(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day int not null,
  note text,
  logged_at timestamptz not null default now()
);

-- ── User data: saved product recommendations ─────────────────
create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_slug text not null,
  category text,
  score numeric,
  created_at timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_health_scores_pet on public.health_scores(pet_id);
create index if not exists idx_system_scores_hs on public.system_scores(health_score_id);
create index if not exists idx_detected_patterns_pet on public.detected_patterns(pet_id);
create index if not exists idx_treat_audits_pet on public.treat_audits(pet_id);
create index if not exists idx_env_checklists_pet on public.environment_checklists(pet_id);
create index if not exists idx_progress_programs_pet on public.progress_programs(pet_id);
create index if not exists idx_program_logs_program on public.program_logs(program_id);
create index if not exists idx_product_recs_pet on public.product_recommendations(pet_id);
create index if not exists idx_meal_plan_items_slug on public.meal_plan_items(meal_plan_slug);
create index if not exists idx_program_tasks_template on public.program_tasks(template_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.environment_risks enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.program_tasks enable row level security;
alter table public.health_scores enable row level security;
alter table public.system_scores enable row level security;
alter table public.detected_patterns enable row level security;
alter table public.treat_audits enable row level security;
alter table public.environment_checklists enable row level security;
alter table public.progress_programs enable row level security;
alter table public.program_logs enable row level security;
alter table public.product_recommendations enable row level security;

-- Catalog tables: world-readable
do $$
declare t text;
begin
  foreach t in array array['meal_plans','meal_plan_items','environment_risks','marketplace_products','program_tasks']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select using (true)', t, t);
  end loop;
end $$;

-- User-data tables: owner-scoped full access
do $$
declare t text;
begin
  foreach t in array array['health_scores','system_scores','detected_patterns','treat_audits','environment_checklists','progress_programs','program_logs','product_recommendations']
  loop
    execute format('drop policy if exists %I_owner on public.%I', t, t);
    execute format('create policy %I_owner on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
  end loop;
end $$;
