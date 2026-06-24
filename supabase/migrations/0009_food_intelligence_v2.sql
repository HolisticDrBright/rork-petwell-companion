-- Petwell · 0009 food intelligence v2
-- Adds the pieces the adaptive food engine needs: barcodes + life stage + AAFCO,
-- ingredient aliases (normalization), allergen tagging, evidence-gated lab data
-- (clearly demo vs. real), per-source citations, and pet-personalized sub-scores.

-- Products: barcode lookup, life-stage fit, AAFCO statement.
alter table public.food_products
  add column if not exists barcode text unique,
  add column if not exists life_stage text check (life_stage in ('puppy','kitten','adult','senior','all')),
  add column if not exists aafco_statement text;

-- Ingredients: flag common allergens; alias table powers normalization of raw
-- OCR/label tokens onto canonical ingredients.
alter table public.food_ingredients
  add column if not exists is_common_allergen boolean not null default false;

create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.food_ingredients(id) on delete cascade,
  alias text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists ingredient_aliases_ingredient_idx on public.ingredient_aliases(ingredient_id);

-- Contaminant/lab evidence: a photo can NEVER establish purity. These rows carry
-- explicit status, substance category, a citation, and an is_demo flag so the UI
-- can label seed/demo evidence and say "No public lab test found" when absent.
alter table public.contaminant_tests
  add column if not exists substance_category text,
  add column if not exists status text check (status in ('pass','elevated','fail','not_tested')),
  add column if not exists evidence_source_id uuid references public.evidence_sources(id) on delete set null,
  add column if not exists is_demo boolean not null default true;

alter table public.recall_events
  add column if not exists evidence_source_id uuid references public.evidence_sources(id) on delete set null;

-- food_scores becomes pet-personalized and carries the seven sub-scores plus the
-- overall recommendation. Existing grade/summary/factors columns are retained.
alter table public.food_scores
  add column if not exists pet_id uuid references public.pet_profiles(id) on delete cascade,
  add column if not exists nutrition_fit_score int,
  add column if not exists ingredient_quality_score int,
  add column if not exists contaminant_confidence_score int,
  add column if not exists brand_transparency_score int,
  add column if not exists recall_risk_score int,
  add column if not exists personal_outcome_score int,
  add column if not exists overall_score int,
  add column if not exists recommendation text check (recommendation in ('good_fit','use_caution','avoid'));

-- Cite the specific sources behind a product/brand review.
create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.food_products(id) on delete cascade,
  brand_id uuid references public.food_brands(id) on delete cascade,
  evidence_source_id uuid not null references public.evidence_sources(id) on delete cascade,
  relation text not null default 'reference',
  created_at timestamptz not null default now()
);
create index if not exists evidence_links_product_idx on public.evidence_links(product_id);
create index if not exists evidence_links_brand_idx on public.evidence_links(brand_id);

-- RLS: new catalog tables are world-readable, service-role-writable only.
alter table public.ingredient_aliases enable row level security;
alter table public.evidence_links enable row level security;
create policy ingredient_aliases_read on public.ingredient_aliases for select using (true);
create policy evidence_links_read on public.evidence_links for select using (true);
