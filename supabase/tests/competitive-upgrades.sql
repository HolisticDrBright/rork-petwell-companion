-- Run after applying the upgrade migrations. All fixtures are rolled back.
begin;
insert into auth.users(id,email) values
  ('f0e0d0c0-b0a0-4000-8000-000000000021','petwell-upgrade-owner@example.invalid'),
  ('f0e0d0c0-b0a0-4000-8000-000000000022','petwell-upgrade-caregiver@example.invalid'),
  ('f0e0d0c0-b0a0-4000-8000-000000000023','petwell-upgrade-viewer@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000021","role":"authenticated"}',true) is not null;
do $$
declare pet uuid; schedule uuid; code text;
begin
  pet := (public.create_pet_with_conditions('{"name":"Upgrade test","species":"cat"}')->>'id')::uuid;
  perform set_config('petwell.test_pet',pet::text,true);
  schedule := public.save_care_schedule(pet, jsonb_build_object(
    'kind','med','title','Scheduled medication','dose_portion','{"amount":"1 tablet"}'::jsonb,
    'start_local',((date_trunc('day',now() at time zone 'UTC') + interval '1 day 8 hours')::text),
    'timezone','UTC','rrule','FREQ=HOURLY;INTERVAL=8'));
  perform set_config('petwell.test_schedule',schedule::text,true);
  if (select count(*) from public.care_schedule_occurrences where schedule_id=schedule) < 38 then
    raise exception 'Recurring occurrences did not materialize';
  end if;
  if not exists (select 1 from public.list_care_schedule_occurrences(pet,now(),now()+interval '2 days')
    where title='Scheduled medication' and amount='1 tablet' and completed_at is null) then
    raise exception 'Upcoming occurrence missing';
  end if;
  code := public.create_pet_invite(pet,'caregiver')->>'code';
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000022","role":"authenticated"}',true);
  perform public.claim_invite(code);
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000021","role":"authenticated"}',true);
  code := public.create_pet_invite(pet,'viewer')->>'code';
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000023","role":"authenticated"}',true);
  perform public.claim_invite(code);
end $$;
reset role;
insert into public.care_schedules(id,pet_id,created_by,kind,title,rrule,start_local,timezone,effective_from)
values ('f0e0d0c0-b0a0-4000-8000-000000000024',current_setting('petwell.test_pet')::uuid,
  'f0e0d0c0-b0a0-4000-8000-000000000021','water','Older water schedule','FREQ=DAILY',
  date_trunc('day',now() at time zone 'UTC')-interval '2 days','UTC',now()-interval '3 days');
insert into public.record_ingestions(id,pet_id,uploaded_by,image_path,ocr_text,extraction)
values ('f0e0d0c0-b0a0-4000-8000-000000000025',current_setting('petwell.test_pet')::uuid,
 'f0e0d0c0-b0a0-4000-8000-000000000021','f0e0d0c0-b0a0-4000-8000-000000000021/vet-import-test.jpg',
 'Extracted vaccine','[{"key":"vaccine_name","value":"Unconfirmed vaccine","group":1}]');
set local role authenticated;
do $$
declare
  pet uuid := current_setting('petwell.test_pet')::uuid;
  old_schedule constant uuid := 'f0e0d0c0-b0a0-4000-8000-000000000024';
  draft constant uuid := 'f0e0d0c0-b0a0-4000-8000-000000000025';
  slot timestamptz := (date_trunc('day',now() at time zone 'UTC')-interval '1 day') at time zone 'UTC';
  fields constant jsonb := '[{"key":"vaccine_name","value":"Reviewed vaccine","group":1}]';
  completion uuid; replacement uuid; doc uuid; actual jsonb; share jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000022","role":"authenticated"}',true);
  completion := public.complete_care_schedule(old_schedule,slot);
  if completion is null or completion is distinct from public.complete_care_schedule(old_schedule,slot) then
    raise exception 'Caregiver completion is not idempotent';
  end if;
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000023","role":"authenticated"}',true);
  if not exists(select 1 from public.list_care_schedule_occurrences(pet,slot,now()) where completed_at is not null) then
    raise exception 'Viewer cannot see a shared completion';
  end if;
  begin
    perform public.complete_care_schedule(old_schedule,slot-interval '1 day');
    raise exception 'Viewer completion unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.export_pet_data(pet);
    raise exception 'Viewer export unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000021","role":"authenticated"}',true);
  replacement := public.save_care_schedule(pet,jsonb_build_object('kind','water','title','Refill water',
    'rrule','FREQ=DAILY','timezone','UTC','start_local',(now() at time zone 'UTC')+interval '1 hour'),old_schedule);
  if not exists (select 1 from public.list_care_schedule_occurrences(pet,slot,now()) where schedule_id=old_schedule and completed_at is not null)
    or not exists (select 1 from public.list_care_schedule_occurrences(pet,now()+interval '1 second',now()+interval '2 days') where schedule_id=replacement)
    or exists (select 1 from public.list_care_schedule_occurrences(pet,now()+interval '1 second',now()+interval '2 days') where schedule_id=old_schedule) then
    raise exception 'A schedule edit did not preserve only the earlier history';
  end if;
  if exists (select 1 from public.vet_records where pet_id=pet) then raise exception 'OCR draft created a record'; end if;
  doc := public.review_record_ingestion(draft,fields,true);
  if doc is null or doc is distinct from public.review_record_ingestion(draft,fields,true)
    or not exists (select 1 from public.document_uploads where record_id=doc)
    or (select count(*) from public.vet_records where pet_id=pet and title='Reviewed vaccine') <> 1 then
    raise exception 'Confirmation did not save edited OCR fields and attach the photo exactly once';
  end if;
  doc := public.attach_vet_document(pet,auth.uid()::text||'/plain-archive.jpg','Photo-only record',256);
  if not exists(select 1 from public.document_uploads where record_id=doc and title='Photo-only record') then
    raise exception 'Manual photo attachment missing';
  end if;
  share := public.create_vet_visit_package(pet,'{"version":1,"report":{"name":"Upgrade test"},"photos":[]}');
  perform set_config('petwell.test_share_id',share->>'id',true);
  perform set_config('petwell.test_token',share->>'token',true);
  if (share->>'expires_at')::timestamptz <> now()+interval '30 days' then raise exception 'Invalid expiration'; end if;
  share := public.create_vet_visit_package(pet,'{"version":1,"report":{"name":"Expiry test"},"photos":[]}',1);
  perform set_config('petwell.test_expired_id',share->>'id',true);
  perform set_config('petwell.test_expired_token',share->>'token',true);
  actual := public.export_pet_data(pet);
  if jsonb_array_length(actual->'document_uploads') <> 2 or jsonb_array_length(actual->'vet_visit_links') <> 2
    or (actual->'vet_visit_links'->0) ? 'token_hash' then
    raise exception 'Owner export missing records or exposing link credentials';
  end if;
end $$;
reset role;
update public.vet_visit_packages set expires_at=now()-interval '1 hour'
  where id=current_setting('petwell.test_expired_id')::uuid;
set local role anon;
do $$
begin
  if public.get_vet_visit_package(current_setting('petwell.test_token'))->'report'->>'name' is distinct from 'Upgrade test' then
    raise exception 'Valid visit link should be readable';
  end if;
  if public.get_vet_visit_package(current_setting('petwell.test_expired_token')) is not null then
    raise exception 'Expired visit link remained readable';
  end if;
  if has_table_privilege('anon','public.vet_visit_packages','select') then
    raise exception 'Anonymous access to the share table should be denied';
  end if;
end $$;
set local role authenticated;
select public.revoke_vet_visit_package(current_setting('petwell.test_share_id')::uuid);
set local role anon;
do $$
begin
  if public.get_vet_visit_package(current_setting('petwell.test_token')) is not null then
    raise exception 'Revoked visit link remained readable';
  end if;
end $$;
reset role;
rollback;
select 'PASS: schedule revisions and permissions, OCR confirmation, photo attachment, visit sharing and revocation, free pet export' as result;
