-- Petwell · 0003 food intelligence domain
-- Brand-neutral catalog + scoring. No paid placement is implied or stored.

create table public.food_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  manufacturer text,
  country text,
  created_at timestamptz not null default now()
);

create table public.food_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.food_brands(id) on delete set null,
  name text not null,
  product_type text not null default 'food' check (product_type in ('food','treat','supplement')),
  species text not null default 'dog' check (species in ('dog','cat','both')),
  form text,
  calorie_density text,
  created_at timestamptz not null default now()
);
create index food_products_brand_idx on public.food_products(brand_id);

create table public.food_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now()
);

create table public.food_product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.food_products(id) on delete cascade,
  ingredient_id uuid not null references public.food_ingredients(id) on delete cascade,
  position int not null default 0,
  unique (product_id, ingredient_id)
);
create index food_product_ingredients_product_idx on public.food_product_ingredients(product_id);

create table public.ingredient_flags (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.food_ingredients(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'watch' check (severity in ('good','watch','bad')),
  message text not null,
  created_at timestamptz not null default now()
);
create index ingredient_flags_ingredient_idx on public.ingredient_flags(ingredient_id);

create table public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.food_products(id) on delete cascade,
  protein_pct numeric,
  fat_pct numeric,
  fiber_pct numeric,
  moisture_pct numeric,
  kcal_per_100g numeric,
  created_at timestamptz not null default now(),
  unique (product_id)
);

create table public.contaminant_tests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.food_products(id) on delete cascade,
  brand_id uuid references public.food_brands(id) on delete cascade,
  substance text not null,
  result text not null,
  tested_at date,
  lab text,
  source_url text,
  created_at timestamptz not null default now()
);

create table public.recall_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.food_products(id) on delete set null,
  brand_id uuid references public.food_brands(id) on delete set null,
  recall_date date,
  reason text not null,
  severity text default 'watch' check (severity in ('good','watch','bad')),
  source_url text,
  created_at timestamptz not null default now()
);

create table public.manufacturer_quality_profiles (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.food_brands(id) on delete cascade,
  owns_facilities boolean,
  recall_count int default 0,
  transparency_score int,
  notes text,
  created_at timestamptz not null default now(),
  unique (brand_id)
);

create table public.food_scans (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.food_products(id) on delete set null,
  raw_label_text text,
  image_path text,
  created_at timestamptz not null default now()
);
create index food_scans_pet_idx on public.food_scans(pet_id);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.food_products(id) on delete set null,
  food_scan_id uuid references public.food_scans(id) on delete set null,
  label text not null,
  portion text,
  fed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index food_logs_pet_idx on public.food_logs(pet_id, fed_at desc);

-- owner_id null => catalog/global score (read-only to clients).
create table public.food_scores (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.food_products(id) on delete cascade,
  food_scan_id uuid references public.food_scans(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  grade text not null,
  summary text,
  factors jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index food_scores_product_idx on public.food_scores(product_id);

create table public.food_recommendations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pet_profiles(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.food_products(id) on delete set null,
  food_scan_id uuid references public.food_scans(id) on delete set null,
  recommendation text not null,
  watch_window text,
  created_at timestamptz not null default now()
);

create table public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  publisher text,
  url text,
  source_type text,
  summary text,
  created_at timestamptz not null default now()
);

-- Every AI-like result can be corrected by hand; corrections are captured here.
create table public.user_corrections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  field text,
  old_value text,
  new_value text,
  note text,
  created_at timestamptz not null default now()
);
create index user_corrections_owner_idx on public.user_corrections(owner_id);
