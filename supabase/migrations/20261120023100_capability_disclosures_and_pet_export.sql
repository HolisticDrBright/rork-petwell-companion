create table public.capability_disclosures (
  feature text primary key check (feature in ('scan','score','chat')),
  available text not null,
  limits text not null,
  last_reviewed date not null,
  version integer not null check (version > 0)
);
alter table public.capability_disclosures enable row level security;
revoke all on public.capability_disclosures from public, anon, authenticated;
grant select on public.capability_disclosures to authenticated;
grant all on public.capability_disclosures to service_role;
create policy capability_read on public.capability_disclosures for select to authenticated using (true);
insert into public.capability_disclosures values
 ('scan','A photo can help you record visible changes to share with your vet.','Photo observations cannot diagnose illness or measure contaminants. Check urgent symptoms with a veterinarian.','2026-11-19',1),
 ('score','Petwell summarizes recent logs and shows the inputs and coverage for each score.','The score is a tracking aid. It cannot assess whether a pet is healthy or predict illness.','2026-11-19',1),
 ('chat','Petwell provides general information when it can cite a retrieved veterinary source.','Chat cannot examine your pet, diagnose illness, or recommend treatment. Contact your vet for urgent concerns.','2026-11-19',1);

create function public.export_pet_data(p_pet_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
  rows jsonb;
  table_key text;
begin
  if auth.uid() is null or private.pet_role(p_pet_id) is distinct from 'owner' then raise insufficient_privilege; end if;
  select jsonb_build_object('version',1,'exported_at',now(),'pet',to_jsonb(p))
    into strict result from public.pet_profiles p where p.id = p_pet_id and p.owner_id = auth.uid();
  foreach table_key in array array[
    'pet_conditions','pet_allergies','pet_medications','care_tasks','reminders','timeline_events','health_logs',
    'care_schedules','care_task_events','symptom_sessions','triage_results','scan_records','vet_records','document_uploads',
    'record_ingestions','vet_reports','food_scans','food_logs','food_recommendations','protocol_recommendations',
    'health_scores','ai_chat_threads','detected_patterns','treat_audits','environment_checklists','progress_programs','product_recommendations',
    'telehealth_requests'
  ]
  loop
    if exists (select from information_schema.columns
        where table_schema = 'public' and table_name = table_key and column_name = 'pet_id') then
      execute format('select coalesce(jsonb_agg(to_jsonb(r)),''[]'') from public.%I r where r.pet_id = $1', table_key)
        into rows using p_pet_id;
      result := result || jsonb_build_object(table_key,rows);
    end if;
  end loop;
  result := result || jsonb_build_object(
    'symptom_answers', (select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.symptom_answers a
      join public.symptom_sessions s on a.session_id = s.id where s.pet_id = p_pet_id),
    'scan_images', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.scan_images i
      join public.scan_records s on i.scan_id = s.id where s.pet_id = p_pet_id),
    'system_scores', (select coalesce(jsonb_agg(to_jsonb(s)), '[]') from public.system_scores s
      join public.health_scores h on s.health_score_id = h.id where h.pet_id = p_pet_id),
    'food_scores', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.food_scores f
      join public.food_scans s on f.food_scan_id = s.id where s.pet_id = p_pet_id and f.owner_id = auth.uid()),
    'program_logs', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.program_logs l
      join public.progress_programs p on l.program_id = p.id where p.pet_id = p_pet_id and l.owner_id = auth.uid()),
    'ai_chat_messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.ai_chat_messages m
      join public.ai_chat_threads t on m.thread_id = t.id where t.pet_id = p_pet_id and t.owner_id = auth.uid()),
    'care_schedule_occurrences',(select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.care_schedule_occurrences o
      join public.care_schedules s on o.schedule_id = s.id where s.pet_id = p_pet_id),
    'care_schedule_completions',(select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.care_schedule_completions c
      join public.care_schedule_occurrences o on c.occurrence_id = o.id
      join public.care_schedules s on o.schedule_id = s.id where s.pet_id = p_pet_id),
    'vet_visit_links', (select coalesce(jsonb_agg(to_jsonb(v) - 'token_hash' - 'summary'), '[]')
      from public.vet_visit_packages v where v.pet_id = p_pet_id)
  );
  return result;
end;
$$;
revoke all on function public.export_pet_data(uuid) from public, anon;
grant execute on function public.export_pet_data(uuid) to authenticated;
