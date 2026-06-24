-- Petwell · 0007 security hardening (clears database linter warnings)
-- 1) Pin search_path on the trigger function.
-- 2) Move owns_pet() into a private schema so it is NOT exposed as a REST RPC,
--    while remaining callable from RLS policies.

alter function public.set_updated_at() set search_path = public;

create schema if not exists private;

create or replace function private.owns_pet(p uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.pet_profiles
    where id = p and owner_id = auth.uid()
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.owns_pet(uuid) to authenticated;

-- Repoint the pet-child policies at the private helper.
drop policy pet_conditions_owner on public.pet_conditions;
drop policy pet_allergies_owner on public.pet_allergies;
drop policy pet_medications_owner on public.pet_medications;
drop policy care_tasks_owner on public.care_tasks;
drop policy reminders_owner on public.reminders;

drop function public.owns_pet(uuid);

create policy pet_conditions_owner on public.pet_conditions
  for all using (private.owns_pet(pet_id)) with check (private.owns_pet(pet_id));
create policy pet_allergies_owner on public.pet_allergies
  for all using (private.owns_pet(pet_id)) with check (private.owns_pet(pet_id));
create policy pet_medications_owner on public.pet_medications
  for all using (private.owns_pet(pet_id)) with check (private.owns_pet(pet_id));
create policy care_tasks_owner on public.care_tasks
  for all using (private.owns_pet(pet_id)) with check (private.owns_pet(pet_id));
create policy reminders_owner on public.reminders
  for all using (private.owns_pet(pet_id)) with check (private.owns_pet(pet_id));
