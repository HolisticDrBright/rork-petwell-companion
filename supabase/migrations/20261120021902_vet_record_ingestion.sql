create table public.record_ingestions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  image_path text not null unique,
  ocr_text text not null check (char_length(ocr_text) <= 30000),
  extraction jsonb not null check (jsonb_typeof(extraction) = 'array'),
  status text not null default 'pending_review' check (status in ('pending_review','confirmed','rejected')),
  confirmed_fields jsonb,
  record_id uuid references public.vet_records(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index record_ingestions_review on public.record_ingestions(uploaded_by,pet_id,status,created_at desc);
alter table public.record_ingestions enable row level security;
revoke all on public.record_ingestions from public, anon, authenticated;
grant select on public.record_ingestions to authenticated;
grant all on public.record_ingestions to service_role;
create policy ingestion_owner_read on public.record_ingestions for select to authenticated
  using (uploaded_by = (select auth.uid()) and private.pet_role(pet_id) = 'owner');

-- This protected transition is the only path from a proposal to health records.
create function private.review_record_ingestion(p_id uuid, p_fields jsonb, p_accept boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  proposal public.record_ingestions;
  confirmed uuid;
  document_title text;
  document_date text;
  clinic text;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select * into proposal from public.record_ingestions
  where id = p_id and uploaded_by = auth.uid() and private.pet_role(pet_id) = 'owner'
  for update;
  if not found then raise insufficient_privilege; end if;
  if proposal.status = 'confirmed' and p_accept then return proposal.record_id; end if;
  if proposal.status <> 'pending_review' then raise exception 'Proposal already reviewed.'; end if;

  if not p_accept then
    update public.record_ingestions set status = 'rejected', reviewed_at = now() where id = p_id;
    return null;
  end if;

  if jsonb_typeof(p_fields) is distinct from 'array' or jsonb_array_length(p_fields) not between 1 and 160 then
    raise exception 'Review at least one field before saving.';
  end if;
  if exists (
    select from jsonb_array_elements(p_fields) f
    where jsonb_typeof(f->'value') is distinct from 'string'
      or char_length(btrim(f->>'value')) not between 1 and 500
      or coalesce(f->>'key','') not in (
        'document_type','document_date','clinic','veterinarian','diagnosis','weight',
        'vaccine_name','vaccine_date','vaccine_due','medication_name','medication_dose','medication_schedule',
        'lab_analyte','lab_value','lab_unit','lab_reference')
      or coalesce(f->>'group','') !~ '^(0|[1-9][0-9]?)$'
  ) then raise exception 'Check the reviewed fields.'; end if;

  select f->>'value' into document_title from jsonb_array_elements(p_fields) f where f->>'key' = 'document_type' limit 1;
  select f->>'value' into document_date from jsonb_array_elements(p_fields) f where f->>'key' = 'document_date' limit 1;
  select f->>'value' into clinic from jsonb_array_elements(p_fields) f where f->>'key' = 'clinic' limit 1;
  insert into public.vet_records(pet_id,owner_id,category,title,subtitle,record_date)
    values (proposal.pet_id,proposal.uploaded_by,'Documents',coalesce(document_title,'Imported vet document'),clinic,document_date)
    returning id into confirmed;
  insert into public.document_uploads(pet_id,owner_id,record_id,title,storage_path,mime_type)
    values (proposal.pet_id,proposal.uploaded_by,confirmed,coalesce(document_title,'Imported vet document'),proposal.image_path,'image/jpeg');

  with fields as (select value as field from jsonb_array_elements(p_fields))
  insert into public.vet_records(pet_id,owner_id,category,title,subtitle,record_date)
  select proposal.pet_id,proposal.uploaded_by,
    case name.field->>'key' when 'vaccine_name' then 'Vaccines' when 'medication_name' then 'Medications'
      when 'lab_analyte' then 'Lab results' when 'diagnosis' then 'Conditions' else 'Documents' end,
    case name.field->>'key' when 'weight' then 'Recorded weight: ' || (name.field->>'value')
      else name.field->>'value' end,
    (select string_agg(
      (case detail.field->>'key' when 'vaccine_due' then 'Due: ' when 'lab_reference' then 'Range: ' else '' end) ||
      (detail.field->>'value'), ' · ' order by detail.field->>'key')
     from fields detail where detail.field->>'group' = name.field->>'group'
       and (case name.field->>'key'
          when 'vaccine_name' then detail.field->>'key' = 'vaccine_due'
          when 'medication_name' then detail.field->>'key' in ('medication_dose','medication_schedule')
          when 'lab_analyte' then detail.field->>'key' in ('lab_value','lab_unit','lab_reference')
          else false end)),
    coalesce((select detail.field->>'value' from fields detail
      where name.field->>'key' = 'vaccine_name' and detail.field->>'group' = name.field->>'group'
        and detail.field->>'key' = 'vaccine_date' limit 1),document_date)
  from fields name where name.field->>'key' in ('vaccine_name','medication_name','lab_analyte','diagnosis','weight');

  update public.record_ingestions set status = 'confirmed', record_id = confirmed, confirmed_fields = p_fields, reviewed_at = now()
    where id = p_id;
  return confirmed;
end;
$$;
revoke all on function private.review_record_ingestion(uuid,jsonb,boolean) from public, anon;
grant execute on function private.review_record_ingestion(uuid,jsonb,boolean) to authenticated;
create function public.review_record_ingestion(p_id uuid,p_fields jsonb,p_accept boolean)
returns uuid language sql security invoker set search_path = '' as $$
  select private.review_record_ingestion(p_id,p_fields,p_accept);
$$;
revoke all on function public.review_record_ingestion(uuid,jsonb,boolean) from public, anon;
grant execute on function public.review_record_ingestion(uuid,jsonb,boolean) to authenticated;
