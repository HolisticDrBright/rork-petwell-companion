begin;
do $$
declare
  rule public.care_schedules;
  dates timestamptz[];
begin
  rule.active := true;
  rule.effective_from := '-infinity';
  rule.timezone := 'America/Los_Angeles';
  rule.start_local := '2026-03-07 08:00';
  rule.rrule := 'FREQ=DAILY';
  select array_agg(at) into dates from private.expand_care_schedule(rule, '2026-03-07 00:00Z', '2026-03-10 00:00Z') at;
  if dates is distinct from array['2026-03-07 16:00Z','2026-03-08 15:00Z','2026-03-09 15:00Z']::timestamptz[] then
    raise exception 'Daily local time drifted across daylight saving start: %', dates;
  end if;
  rule.start_local := '2026-03-07 02:30';
  select array_agg(at) into dates from private.expand_care_schedule(rule, '2026-03-07 00:00Z', '2026-03-10 00:00Z') at;
  if cardinality(dates) is distinct from 2 then raise exception 'Skipped local time was scheduled: %', dates; end if;
  rule.start_local := '2026-10-31 01:30';
  select array_agg(at) into dates from private.expand_care_schedule(rule, '2026-11-01 00:00Z', '2026-11-02 00:00Z') at;
  if dates is distinct from array['2026-11-01 08:30Z']::timestamptz[] then raise exception 'Ambiguous time should use its first instance: %', dates; end if;
  rule.timezone := 'UTC';
  rule.start_local := '2026-01-01 06:00';
  rule.rrule := 'FREQ=HOURLY;INTERVAL=8';
  select array_agg(at) into dates from private.expand_care_schedule(rule, '2026-01-02 00:00Z', '2026-01-03 00:00Z') at;
  if dates is distinct from array['2026-01-02 06:00Z','2026-01-02 14:00Z','2026-01-02 22:00Z']::timestamptz[] then raise exception '8-hour recurrence failed: %', dates; end if;
  rule.start_local := '2026-01-31 09:00';
  rule.rrule := 'FREQ=MONTHLY';
  select array_agg(at) into dates from private.expand_care_schedule(rule, '2026-02-01 00:00Z', '2026-03-01 00:00Z') at;
  if dates is not null then raise exception 'Invalid month-day should be skipped: %', dates; end if;
end;
$$;
rollback;
