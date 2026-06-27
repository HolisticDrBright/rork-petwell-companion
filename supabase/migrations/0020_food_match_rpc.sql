-- Petwell · 0020 scalable food-match RPC
--
-- `foodService.getCatalogItems()` matches labels/barcodes in JS over the whole
-- catalog. That's fine at today's size but doesn't scale. This adds a server-side
-- candidate narrower so the client fetches only the products worth scoring:
-- barcode exact-match + trigram-indexed name ILIKE, narrowed by species, with the
-- same production demo rule (hide `demo_seed` unless `include_demo`). Ingredient
-- names are aggregated in the same call, so it returns ready-to-score candidates.
--
-- The app uses this as an OPTIMIZATION with a graceful fallback: if the function
-- isn't deployed (or errors), `foodService.getMatchCandidates()` falls back to the
-- existing capped client query, so matching keeps working either way.

create extension if not exists pg_trgm;

-- Indexes that make the narrowing index-accelerated rather than a seq scan.
create index if not exists idx_food_products_name_trgm
  on public.food_products using gin (name gin_trgm_ops);
create index if not exists idx_food_products_barcode
  on public.food_products (barcode);
create index if not exists idx_food_product_ingredients_product
  on public.food_product_ingredients (product_id);

create or replace function public.match_food_products(
  name_hint text default null,
  species_filter text default null,         -- 'dog' | 'cat' | null
  barcode_in text default null,
  include_demo boolean default false,       -- production passes false → hide demo_seed
  max_candidates integer default 60
)
returns table (
  id uuid,
  name text,
  brand text,
  barcode text,
  species text,
  product_type text,
  ingredient_names text[]
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with candidates as (
    select p.id, p.name, p.barcode, p.species, p.product_type, p.brand_id,
           (barcode_in is not null and p.barcode = barcode_in) as barcode_hit
    from public.food_products p
    where
      -- Null-safe demo rule: keep NULL + non-demo, drop only demo_seed.
      (include_demo or p.evidence_status is distinct from 'demo_seed'::public.evidence_status)
      and (species_filter is null or p.species = species_filter or p.species = 'both')
      and (
        (barcode_in is not null and p.barcode = barcode_in)
        or name_hint is null
        or name_hint = ''
        or p.name ilike '%' || name_hint || '%'
      )
    order by (barcode_in is not null and p.barcode = barcode_in) desc, p.name asc
    limit greatest(coalesce(max_candidates, 60), 1)
  )
  select c.id, c.name, b.name as brand, c.barcode, c.species, c.product_type,
         coalesce(
           array_agg(fi.name order by fpi.position) filter (where fi.name is not null),
           '{}'
         ) as ingredient_names
  from candidates c
  left join public.food_brands b on b.id = c.brand_id
  left join public.food_product_ingredients fpi on fpi.product_id = c.id
  left join public.food_ingredients fi on fi.id = fpi.ingredient_id
  group by c.id, c.name, b.name, c.barcode, c.species, c.product_type, c.barcode_hit
  order by c.barcode_hit desc, c.name asc;
$$;

grant execute on function public.match_food_products(text, text, text, boolean, integer) to anon, authenticated;
