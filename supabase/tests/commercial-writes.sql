begin;
insert into auth.users(id,email) values ('f0e0d0c0-b0a0-4000-8000-000000000001','petwell-rollback-1@example.invalid'), ('f0e0d0c0-b0a0-4000-8000-000000000002','petwell-rollback-2@example.invalid');
insert into public.profiles(id) values ('f0e0d0c0-b0a0-4000-8000-000000000001'), ('f0e0d0c0-b0a0-4000-8000-000000000002') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000001","role":"authenticated"}',true);
do $$
declare p jsonb; t public.timeline_events; n int;
begin
 p := public.create_pet_with_conditions('{"name":"Rollback test","species":"dog","conditions":["test condition"]}');
 if jsonb_array_length(p->'pet_conditions') <> 1 then raise exception 'Condition missing'; end if;
 t := public.add_timeline_event((p->>'id')::uuid,'{"category":"weight","title":"Test weight","value":40,"date":"2026-11-19","time":"12:00"}');
 if not exists(select 1 from public.health_logs where pet_id=t.pet_id and value=40 and logged_at::date='2026-11-19') then raise exception 'Metric missing'; end if;
 select count(*) into n from public.pet_profiles;
 begin
  perform public.create_pet_with_conditions('{"name":"Must roll back","species":"dog","conditions":{}}');
  raise exception 'Invalid conditions should fail';
 exception when invalid_parameter_value then null;
 end;
 if (select count(*) from public.pet_profiles) <> n then raise exception 'Partial pet save'; end if;
 t := public.add_timeline_event((p->>'id')::uuid,'{"category":"food","title":"Meal","date":"2026-11-19","time":"12:00","food":{"label":"Test meal"}}');
 if not exists(select 1 from public.food_logs where pet_id=t.pet_id and label='Test meal') then raise exception 'Food log missing'; end if;
 select count(*) into n from public.timeline_events;
 begin
  perform public.add_timeline_event((p->>'id')::uuid,'{"category":"food","title":"Must roll back","date":"2026-11-19","time":"12:00","food":{"label":null}}');
  raise exception 'Invalid food log should fail';
 exception when not_null_violation then null;
 end;
 if (select count(*) from public.timeline_events) <> n then raise exception 'Partial timeline save'; end if;
 perform set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000002","role":"authenticated"}',true);
 begin
  perform public.add_timeline_event((p->>'id')::uuid,'{"category":"weight","title":"Forbidden","value":99,"date":"2026-11-19","time":"12:00"}');
  raise exception 'Cross-user write should fail';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: atomic saves, metric date, child rollback, cross-account denial; all test data rolled back' as result;
