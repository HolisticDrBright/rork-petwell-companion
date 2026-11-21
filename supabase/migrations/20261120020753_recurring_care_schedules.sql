-- Supported RRULE subset: FREQ with optional INTERVAL. The local start sets
-- the weekday, month day, or clock position. Skipped DST times are omitted.
create table public.care_schedules (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('med','meal','walk','water','litter','grooming','custom')),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  instructions text check (char_length(instructions) <= 500),
  dose_portion jsonb,
  rrule text not null check (rrule = 'FREQ=DAILY;COUNT=1' or rrule ~ '^FREQ=(HOURLY|DAILY|WEEKLY|MONTHLY)(;INTERVAL=([1-9]|1[0-9]|2[0-4]))?$'),
  start_local timestamp not null,
  timezone text not null check (char_length(timezone) between 1 and 80),
  active boolean not null default true,
  effective_from timestamptz not null default statement_timestamp(),
  effective_until timestamptz check (effective_until >= effective_from)
);
create index care_schedules_pet_lookup on public.care_schedules(pet_id, effective_from);
create unique index care_schedules_current_revision on public.care_schedules(series_id) where effective_until is null;

create function private.validate_schedule_timezone() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Select a valid time zone.';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_schedule_timezone() from public, anon, authenticated;
create trigger validate_schedule_timezone before insert on public.care_schedules
for each row execute function private.validate_schedule_timezone();

create table public.care_schedule_occurrences (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.care_schedules(id) on delete cascade,
  scheduled_at timestamptz not null,
  unique(schedule_id, scheduled_at)
);
create table public.care_schedule_completions (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null unique references public.care_schedule_occurrences(id) on delete cascade,
  completed_by uuid default auth.uid() references auth.users(id) on delete set null,
  completed_at timestamptz not null default statement_timestamp()
);
create index care_schedule_completions_actor on public.care_schedule_completions(completed_by);

create function private.schedule_section_ok(pet uuid, kind text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.member_section_ok(pet, 'care_protocol') and
    (case kind when 'med' then private.member_section_ok(pet, 'medication_details')
      when 'meal' then private.member_section_ok(pet, 'feeding_plan') else true end);
$$;
revoke all on function private.schedule_section_ok(uuid,text) from public, anon;
grant execute on function private.schedule_section_ok(uuid,text) to authenticated;

create function private.expand_care_schedule(s public.care_schedules, after_at timestamptz, before_at timestamptz)
returns setof timestamptz language sql stable security invoker set search_path = '' as $$
  with settings as (
    select split_part(split_part(s.rrule, ';', 1), '=', 2) as freq,
      coalesce(nullif(split_part(s.rrule, 'INTERVAL=', 2), '')::int, 1) as gap
  ),
  candidates as (
    select wall, freq, gap
    from settings, lateral generate_series(
      (after_at at time zone s.timezone)::date::timestamp - interval '1 day' +
        case when freq = 'HOURLY' then s.start_local - date_trunc('hour', s.start_local)
          else s.start_local::time - time '00:00' end,
      (before_at at time zone s.timezone)::date::timestamp + interval '2 days',
      case when freq = 'HOURLY' then interval '1 hour' else interval '1 day' end
    ) as g(wall)
    where wall >= s.start_local and s.active
      and (s.rrule <> 'FREQ=DAILY;COUNT=1' or wall = s.start_local)
      and before_at > after_at and before_at - after_at <= interval '31 days'
      and case freq
        when 'HOURLY' then mod((extract(epoch from (wall - s.start_local)) / 3600)::bigint, gap) = 0
        when 'DAILY' then mod(wall::date - s.start_local::date, gap) = 0
        when 'WEEKLY' then mod(wall::date - s.start_local::date, 7 * gap) = 0
        when 'MONTHLY' then extract(day from wall) = extract(day from s.start_local)
          and mod(((extract(year from wall) - extract(year from s.start_local)) * 12
                  + extract(month from wall) - extract(month from s.start_local))::int, gap) = 0
        else false end
  )
  select chosen.instant
  from candidates c, lateral (
    -- On an ambiguous fall-back wall clock use the first valid instance.
    select min(i) as instant from (values
      (c.wall at time zone s.timezone),
      (((c.wall - interval '1 day') at time zone s.timezone) + interval '24 hours')
    ) v(i) where i at time zone s.timezone = c.wall
  ) chosen
  where chosen.instant >= greatest(after_at, s.effective_from)
    and chosen.instant < least(before_at, coalesce(s.effective_until, 'infinity'))
  order by chosen.instant;
$$;
revoke all on function private.expand_care_schedule(public.care_schedules,timestamptz,timestamptz) from public, anon;
grant execute on function private.expand_care_schedule(public.care_schedules,timestamptz,timestamptz) to authenticated;

alter table public.care_schedules enable row level security;
alter table public.care_schedule_occurrences enable row level security;
alter table public.care_schedule_completions enable row level security;
revoke all on public.care_schedules, public.care_schedule_occurrences, public.care_schedule_completions from public, anon, authenticated;
grant select on public.care_schedules, public.care_schedule_occurrences, public.care_schedule_completions to authenticated;
grant insert (series_id,pet_id,kind,title,instructions,dose_portion,rrule,start_local,timezone,active)
  on public.care_schedules to authenticated;
grant update (effective_until) on public.care_schedules to authenticated;
grant insert (schedule_id,scheduled_at) on public.care_schedule_occurrences to authenticated;
grant insert (occurrence_id) on public.care_schedule_completions to authenticated;

create policy schedule_read on public.care_schedules for select to authenticated using (private.schedule_section_ok(pet_id, kind));
create policy schedule_owner_insert on public.care_schedules for insert to authenticated
  with check (created_by = (select auth.uid()) and private.pet_role(pet_id) = 'owner');
create policy schedule_owner_close on public.care_schedules for update to authenticated
  using (effective_until is null and private.pet_role(pet_id) = 'owner')
  with check (effective_until = statement_timestamp() and private.pet_role(pet_id) = 'owner');
create policy care_occurrence_read on public.care_schedule_occurrences for select to authenticated using (
  exists (select from public.care_schedules s where s.id = schedule_id)
);
create policy care_occurrence_insert on public.care_schedule_occurrences for insert to authenticated with check (
  exists (
    select from public.care_schedules s
    where s.id = schedule_id
      and (private.pet_role(s.pet_id) = 'owner'
        or (scheduled_at <= statement_timestamp() and private.member_can_log(s.pet_id)))
      and scheduled_at in (select private.expand_care_schedule(s, scheduled_at, scheduled_at + interval '1 second'))
  )
);
create policy care_completion_read on public.care_schedule_completions for select to authenticated using (
  exists (select from public.care_schedule_occurrences o where o.id = occurrence_id)
);
create policy care_completion_insert on public.care_schedule_completions for insert to authenticated with check (
  completed_by = (select auth.uid()) and exists (
    select from public.care_schedule_occurrences o join public.care_schedules s on s.id = o.schedule_id
    where o.id = occurrence_id and private.member_can_log(s.pet_id)
      and o.scheduled_at <= statement_timestamp()
      and o.scheduled_at < coalesce(s.effective_until, 'infinity')
  )
);

create function public.save_care_schedule(p_pet_id uuid, p_fields jsonb, p_previous uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare series uuid; saved public.care_schedules;
begin
  if private.pet_role(p_pet_id) is distinct from 'owner' then raise insufficient_privilege; end if;
  if p_previous is not null then
    update public.care_schedules set effective_until = statement_timestamp()
    where id = p_previous and pet_id = p_pet_id and effective_until is null returning series_id into series;
    if not found then raise exception 'This schedule changed. Refresh and try again.'; end if;
  end if;
  insert into public.care_schedules (series_id,pet_id,kind,title,instructions,dose_portion,rrule,start_local,timezone,active)
  values (coalesce(series,gen_random_uuid()),p_pet_id,p_fields->>'kind',p_fields->>'title',
    nullif(p_fields->>'instructions',''),p_fields->'dose_portion',p_fields->>'rrule',
    (p_fields->>'start_local')::timestamp,p_fields->>'timezone',coalesce((p_fields->>'active')::boolean,true))
  returning * into saved;
  insert into public.care_schedule_occurrences (schedule_id,scheduled_at)
    select saved.id, day from private.expand_care_schedule(saved, statement_timestamp(), statement_timestamp() + interval '14 days') day
    on conflict do nothing;
  return saved.id;
end;
$$;

create function public.list_care_schedule_occurrences(p_pet_id uuid, p_after timestamptz, p_before timestamptz)
returns table(schedule_id uuid, kind text, title text, instructions text, amount text, scheduled_at timestamptz, completed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.kind, s.title, s.instructions, s.dose_portion->>'amount', slot.at, c.completed_at
  from public.care_schedules s
  cross join lateral private.expand_care_schedule(s, p_after, p_before) as slot(at)
  left join public.care_schedule_occurrences o on o.schedule_id = s.id and o.scheduled_at = slot.at
  left join public.care_schedule_completions c on c.occurrence_id = o.id
  where s.pet_id = p_pet_id and s.effective_from < p_before
    and coalesce(s.effective_until,'infinity') > p_after
  order by slot.at, s.id;
$$;

create function public.complete_care_schedule(p_schedule_id uuid, p_scheduled_at timestamptz)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare found_occurrence uuid; result uuid;
begin
  insert into public.care_schedule_occurrences(schedule_id,scheduled_at) values (p_schedule_id,p_scheduled_at) on conflict do nothing;
  select id into strict found_occurrence from public.care_schedule_occurrences
    where schedule_id = p_schedule_id and scheduled_at = p_scheduled_at;
  insert into public.care_schedule_completions(occurrence_id) values (found_occurrence) on conflict do nothing;
  select id into strict result from public.care_schedule_completions where occurrence_id = found_occurrence;
  return result;
end;
$$;

revoke all on function public.save_care_schedule(uuid,jsonb,uuid), public.list_care_schedule_occurrences(uuid,timestamptz,timestamptz),
  public.complete_care_schedule(uuid,timestamptz) from public, anon;
grant execute on function public.save_care_schedule(uuid,jsonb,uuid), public.list_care_schedule_occurrences(uuid,timestamptz,timestamptz),
  public.complete_care_schedule(uuid,timestamptz) to authenticated;

-- The rolling horizon also has a computed read path, so a missed worker run
-- cannot make an otherwise valid task disappear from a caregiver checklist.
create function private.refresh_care_schedule_horizon() returns void
language sql security invoker set search_path = '' as $$
  insert into public.care_schedule_occurrences(schedule_id,scheduled_at)
  select s.id, slots.at from public.care_schedules s
  cross join lateral private.expand_care_schedule(s, statement_timestamp(), statement_timestamp() + interval '14 days') slots(at)
  where s.effective_until is null and s.active
  on conflict do nothing;
$$;
revoke all on function private.refresh_care_schedule_horizon() from public, anon, authenticated;
do $$
begin
  if exists (select from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('petwell-care-schedule-horizon', '15 * * * *', 'select private.refresh_care_schedule_horizon()');
  end if;
end;
$$;
