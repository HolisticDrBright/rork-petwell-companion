-- Petwell · 0004 row level security
-- Every table is owner-scoped. Reference catalog tables are world-readable but
-- writable only by the service role (no client write policy).

-- Ownership helper (created here, after pet_profiles exists).
create or replace function public.owns_pet(p uuid)
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

-- Enable RLS everywhere.
alter table public.profiles                       enable row level security;
alter table public.pet_profiles                   enable row level security;
alter table public.pet_conditions                 enable row level security;
alter table public.pet_allergies                  enable row level security;
alter table public.pet_medications                enable row level security;
alter table public.care_tasks                     enable row level security;
alter table public.reminders                      enable row level security;
alter table public.health_logs                    enable row level security;
alter table public.timeline_events                enable row level security;
alter table public.symptom_sessions               enable row level security;
alter table public.symptom_answers                enable row level security;
alter table public.triage_results                 enable row level security;
alter table public.scan_records                   enable row level security;
alter table public.scan_images                    enable row level security;
alter table public.vet_records                    enable row level security;
alter table public.document_uploads               enable row level security;
alter table public.vet_reports                    enable row level security;
alter table public.food_brands                    enable row level security;
alter table public.food_products                  enable row level security;
alter table public.food_ingredients               enable row level security;
alter table public.food_product_ingredients       enable row level security;
alter table public.ingredient_flags               enable row level security;
alter table public.nutrition_profiles             enable row level security;
alter table public.contaminant_tests              enable row level security;
alter table public.recall_events                  enable row level security;
alter table public.manufacturer_quality_profiles  enable row level security;
alter table public.food_scans                     enable row level security;
alter table public.food_logs                      enable row level security;
alter table public.food_scores                    enable row level security;
alter table public.food_recommendations           enable row level security;
alter table public.evidence_sources               enable row level security;
alter table public.user_corrections               enable row level security;

-- profiles: a user only sees/edits their own row.
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- pet_profiles: owner-scoped.
create policy pets_owner on public.pet_profiles
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Pet child tables: owned via the parent pet.
create policy pet_conditions_owner on public.pet_conditions
  for all using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));
create policy pet_allergies_owner on public.pet_allergies
  for all using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));
create policy pet_medications_owner on public.pet_medications
  for all using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));
create policy care_tasks_owner on public.care_tasks
  for all using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));
create policy reminders_owner on public.reminders
  for all using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id));

-- Owner-scoped activity tables.
create policy health_logs_owner on public.health_logs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy timeline_events_owner on public.timeline_events
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy symptom_sessions_owner on public.symptom_sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy triage_results_owner on public.triage_results
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy scan_records_owner on public.scan_records
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy vet_records_owner on public.vet_records
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy document_uploads_owner on public.document_uploads
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy vet_reports_owner on public.vet_reports
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy food_scans_owner on public.food_scans
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy food_logs_owner on public.food_logs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy food_recommendations_owner on public.food_recommendations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy user_corrections_owner on public.user_corrections
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Children owned via session / scan.
create policy symptom_answers_owner on public.symptom_answers
  for all
  using (exists (select 1 from public.symptom_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.symptom_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy scan_images_owner on public.scan_images
  for all
  using (exists (select 1 from public.scan_records sr where sr.id = scan_id and sr.owner_id = auth.uid()))
  with check (exists (select 1 from public.scan_records sr where sr.id = scan_id and sr.owner_id = auth.uid()));

-- food_scores: catalog rows (owner null) are world-readable; users may only
-- write their own scan-linked rows.
create policy food_scores_read on public.food_scores for select using (true);
create policy food_scores_insert on public.food_scores for insert with check (owner_id = auth.uid());
create policy food_scores_update on public.food_scores for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy food_scores_delete on public.food_scores for delete using (owner_id = auth.uid());

-- Reference catalog: world-readable, service-role-writable only.
create policy food_brands_read on public.food_brands for select using (true);
create policy food_products_read on public.food_products for select using (true);
create policy food_ingredients_read on public.food_ingredients for select using (true);
create policy food_product_ingredients_read on public.food_product_ingredients for select using (true);
create policy ingredient_flags_read on public.ingredient_flags for select using (true);
create policy nutrition_profiles_read on public.nutrition_profiles for select using (true);
create policy contaminant_tests_read on public.contaminant_tests for select using (true);
create policy recall_events_read on public.recall_events for select using (true);
create policy manufacturer_quality_profiles_read on public.manufacturer_quality_profiles for select using (true);
create policy evidence_sources_read on public.evidence_sources for select using (true);
