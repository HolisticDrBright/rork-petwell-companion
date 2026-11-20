-- Commit a pet and its conditions together; a failing child write rolls back.
-- Invoker functions retain RLS and explicitly bind every write to auth.uid().
create or replace function public.create_pet_with_conditions(input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  pet public.pet_profiles;
  conditions jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.pet_profiles(owner_id, name, species, breed, age_years, sex, weight_lb, photo_url, status, status_note, recent_change, risk_watch)
  values (auth.uid(), input->>'name', input->>'species', coalesce(input->>'breed',''),
    coalesce((input->>'ageYears')::numeric,0), input->>'sex', coalesce((input->>'weightLb')::numeric,0),
    input->>'photo', 'stable', 'New', 'Profile created', 'Not yet assessed') returning * into pet;
  insert into public.pet_conditions(pet_id, label)
    select pet.id, trim(value) from jsonb_array_elements_text(coalesce(input->'conditions','[]'::jsonb)) where trim(value) <> '';
  select coalesce(jsonb_agg(jsonb_build_object('label', label)), '[]'::jsonb) into conditions from public.pet_conditions where pet_id = pet.id;
  return to_jsonb(pet) || jsonb_build_object('pet_conditions', conditions, 'pet_allergies', '[]'::jsonb);
end;
$$;

create or replace function public.add_timeline_event(pet_id uuid, entry jsonb)
returns public.timeline_events language plpgsql security invoker set search_path = '' as $$
declare
  saved public.timeline_events;
begin
  if auth.uid() is null or not exists (select 1 from public.pet_profiles p where p.id = pet_id and p.owner_id = auth.uid()) then
    raise exception 'Pet not found or access denied' using errcode = '42501';
  end if;
  insert into public.timeline_events(pet_id, owner_id, category, title, detail, value, urgency, event_date, event_time, source, ref_id, image_path)
  values (pet_id, auth.uid(), entry->>'category', entry->>'title', entry->>'detail', (entry->>'value')::numeric,
    entry->>'urgency', (entry->>'date')::date, entry->>'time', coalesce(entry->>'source','manual'), (entry->>'refId')::uuid, entry->>'imagePath') returning * into saved;
  if saved.value is not null and saved.category in ('stool','skin','weight','activity','appetite') then
    insert into public.health_logs(pet_id, owner_id, category, value, note, logged_at)
    values (saved.pet_id, auth.uid(), saved.category, saved.value, saved.detail, saved.event_date::timestamptz);
  end if;
  if entry->'food' is not null and entry->'food' <> 'null'::jsonb then
    if saved.category <> 'food' then raise exception 'Food metadata requires a food event'; end if;
    if entry->'food'->>'foodScanId' is not null and not exists (
      select 1 from public.food_scans f where f.id = (entry->'food'->>'foodScanId')::uuid and f.owner_id = auth.uid()
    ) then raise exception 'Food scan access denied' using errcode = '42501'; end if;
    insert into public.food_logs(pet_id, owner_id, label, product_id, food_scan_id, fed_at)
    values (saved.pet_id, auth.uid(), entry->'food'->>'label', (entry->'food'->>'productId')::uuid,
      (entry->'food'->>'foodScanId')::uuid, saved.event_date::timestamptz);
  end if;
  return saved;
end;
$$;
revoke all on function public.create_pet_with_conditions(jsonb) from public, anon;
revoke all on function public.add_timeline_event(uuid,jsonb) from public, anon;
grant execute on function public.create_pet_with_conditions(jsonb) to authenticated;
grant execute on function public.add_timeline_event(uuid,jsonb) to authenticated;
