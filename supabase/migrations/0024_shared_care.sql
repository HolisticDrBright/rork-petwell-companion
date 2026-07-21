-- Petwell · 0024 Shared Care Access (Care Circle)
--
-- Owners share a pet via a single-use Pet ID invite. Members hold a role
-- (owner | co_owner | caregiver | viewer) plus per-section share toggles the
-- owner controls and can change at any time with immediate effect. Caregivers
-- check off care tasks (attributed, timestamped); the owner sees a live feed
-- and can revoke access in one tap. Logged care history SURVIVES revocation —
-- access is removed, attribution and data are not.
--
-- Section toggles → tables in this repo (canonical keys):
--   care_protocol          (default ON)  → care_tasks, reminders, care_task_events
--   feeding_plan           (default ON)  → food_logs
--   medication_details     (default ON)  → pet_medications
--   vet_emergency_contacts (default ON)  → pet_conditions, pet_allergies
--   medical_history        (default OFF) → vet_records
--   symptom_photos         (default OFF) → scan_records, scan_images
--   wearable_vitals        (default OFF) → reserved (no wearable tables yet)
--   activity_history       (default OFF) → timeline_events, health_logs
--
-- NEVER shared, under any toggle combination: other pets in the account,
-- document_uploads, vet_reports, food scans, AI tables, Care Circle management.
-- Owners and co-owners bypass toggles entirely.
--
-- Storage note: shared rows may reference photos (image_path/storage_path).
-- Storage objects stay owner-folder-scoped in this migration; serving shared
-- photo BYTES to caregivers is part of the client slice, not this schema slice.

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.pet_members (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','co_owner','caregiver','viewer')),
  -- 'expired' exists for bookkeeping; enforcement treats a past expires_at as
  -- inactive even while status still reads 'active'.
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz,                -- null = open-ended
  -- Per-section share toggles, owner-controlled, per member (see header map).
  shared_sections jsonb not null default '{
    "care_protocol": true, "feeding_plan": true, "medication_details": true,
    "vet_emergency_contacts": true, "medical_history": false,
    "symptom_photos": false, "wearable_vitals": false, "activity_history": false
  }'::jsonb,
  -- Who granted access is bookkeeping: if that account is deleted the
  -- membership must survive (identity erased), never block the deletion.
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (pet_id, user_id)
);
create index if not exists idx_pet_members_user on public.pet_members(user_id);
create index if not exists idx_pet_members_pet on public.pet_members(pet_id);

create table if not exists public.pet_invites (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  code text not null unique,             -- 8 chars, unambiguous alphabet, single-use
  role text not null check (role in ('co_owner','caregiver','viewer')),
  shared_sections jsonb not null,        -- chosen at invite time; copied to membership on claim
  access_expires_at timestamptz,         -- expiry of the resulting membership
  invite_expires_at timestamptz not null default now() + interval '48 hours',
  -- Invites die with either party's account: a pending invite from a deleted
  -- inviter is useless, and a claimed invite is a spent artifact (SET NULL on
  -- claimed_by would make the code look unused again).
  created_by uuid not null references auth.users(id) on delete cascade,
  claimed_by uuid references auth.users(id) on delete cascade,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_pet_invites_pet on public.pet_invites(pet_id);

-- Task completions (check-offs), attributed. The repo has three schedule
-- sources, so the spec's schedule_item_id becomes (source_kind, source_id).
create table if not exists public.care_task_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  source_kind text not null check (source_kind in ('care_task','reminder','medication')),
  source_id uuid not null,
  occurrence_date date not null default current_date,
  -- Care history survives the author's ACCOUNT deletion with identity erased
  -- (revocation never touches these rows at all).
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now(),
  client_completed_at timestamptz,       -- offline sync: when the tap happened on-device
  note text,
  photo_url text,
  created_at timestamptz not null default now(),
  -- One canonical event per (task, occurrence): duplicate/offline check-offs
  -- collapse, last write wins.
  unique (pet_id, source_kind, source_id, occurrence_date)
);
create index if not exists idx_care_task_events_pet
  on public.care_task_events(pet_id, occurrence_date desc);

-- Audit trail. pet_id is deliberately NOT a foreign key: the log outlives the
-- pet ("deleting a pet cascades memberships and invites; access log is retained").
create table if not exists public.pet_access_log (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null,
  actor_id uuid not null,
  action text not null,  -- invite_created | invite_claimed | access_revoked | sections_updated | task_completed
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pet_access_log_pet
  on public.pet_access_log(pet_id, created_at desc);

-- ── Private helpers (non-API schema; SECURITY DEFINER like owns_pet/is_admin) ─

-- Canonical section keys + caregiver defaults, used by validation.
create or replace function private.care_section_defaults() returns jsonb
language sql immutable set search_path = public as $$
  select '{
    "care_protocol": true, "feeding_plan": true, "medication_details": true,
    "vet_emergency_contacts": true, "medical_history": false,
    "symptom_photos": false, "wearable_vitals": false, "activity_history": false
  }'::jsonb;
$$;

-- Reject unknown keys / non-boolean values; fill missing keys from defaults.
create or replace function private.normalize_shared_sections(p jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  k text;
  result jsonb := private.care_section_defaults();
begin
  if p is null then
    return result;
  end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'shared_sections must be an object';
  end if;
  for k in select jsonb_object_keys(p) loop
    if not (result ? k) then
      raise exception 'Unknown section key: %', k;
    end if;
    if jsonb_typeof(p->k) <> 'boolean' then
      raise exception 'Section % must be true or false', k;
    end if;
    result := jsonb_set(result, array[k], p->k);
  end loop;
  return result;
end;
$$;

-- The caller's effective role for a pet, or null. Active + unexpired only —
-- expiry is enforced HERE (i.e. in RLS), not just in app code.
create or replace function private.pet_role(p uuid) returns text
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select 'owner' from public.pet_profiles pp where pp.id = p and pp.owner_id = auth.uid()),
    (select m.role from public.pet_members m
      where m.pet_id = p and m.user_id = auth.uid()
        and m.status = 'active'
        and (m.expires_at is null or m.expires_at > now())
      limit 1)
  );
$$;

create or replace function private.is_pet_member(p uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select private.pet_role(p) is not null;
$$;

-- Section gate: owners/co-owners bypass toggles; caregivers/viewers get a
-- section only while its toggle is on. Toggle changes apply on the next query.
create or replace function private.member_section_ok(p uuid, section text) returns boolean
language sql security definer set search_path = public stable as $$
  select case
    when exists (select 1 from public.pet_profiles pp
                 where pp.id = p and pp.owner_id = auth.uid()) then true
    else coalesce((
      select case
        when m.role in ('owner','co_owner') then true
        else coalesce((m.shared_sections->>section)::boolean, false)
      end
      from public.pet_members m
      where m.pet_id = p and m.user_id = auth.uid()
        and m.status = 'active'
        and (m.expires_at is null or m.expires_at > now())
      limit 1), false)
  end;
$$;

-- Who may log care: owner/co_owner always; caregiver only with care_protocol
-- on. Viewers never write, regardless of toggles. coalesce makes the answer
-- for a NON-member an explicit false — never NULL, which a plpgsql `if not …`
-- guard would silently treat as pass.
create or replace function private.member_can_log(p uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce(
    private.pet_role(p) in ('owner','co_owner')
      or (private.pet_role(p) = 'caregiver'
          and private.member_section_ok(p, 'care_protocol')),
    false);
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'pet_role(uuid)','is_pet_member(uuid)','member_section_ok(uuid, text)','member_can_log(uuid)'
  ] loop
    execute format('revoke all on function private.%s from public', f);
    execute format('grant execute on function private.%s to anon, authenticated, service_role', f);
  end loop;
end $$;

-- ── Owner membership: trigger for new pets + backfill for existing ────────────

create or replace function private.add_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.pet_members (pet_id, user_id, role, created_by)
  values (new.id, new.owner_id, 'owner', new.owner_id)
  on conflict (pet_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists pet_profiles_owner_membership on public.pet_profiles;
create trigger pet_profiles_owner_membership
  after insert on public.pet_profiles
  for each row execute function private.add_owner_membership();

insert into public.pet_members (pet_id, user_id, role, created_by)
select pp.id, pp.owner_id, 'owner', pp.owner_id
from public.pet_profiles pp
on conflict (pet_id, user_id) do nothing;

-- ── RLS: new tables ──────────────────────────────────────────────────────────

alter table public.pet_members    enable row level security;
alter table public.pet_invites    enable row level security;
alter table public.care_task_events enable row level security;
alter table public.pet_access_log enable row level security;

-- Members see their own membership; owner/co_owner see the whole circle.
-- All writes go through the SECURITY DEFINER RPCs below (no write policies).
drop policy if exists pet_members_read on public.pet_members;
create policy pet_members_read on public.pet_members for select
  using (user_id = auth.uid() or private.pet_role(pet_id) in ('owner','co_owner'));

-- Invites: owner-only (create/list/cancel). Claims read via definer RPC.
drop policy if exists pet_invites_owner on public.pet_invites;
create policy pet_invites_owner on public.pet_invites for all
  using (private.pet_role(pet_id) = 'owner')
  with check (private.pet_role(pet_id) = 'owner');

-- Check-offs: visible with the care_protocol section; writable by loggers.
-- Update (not just insert) is allowed so offline last-write-wins upserts work.
-- No delete policy: care history is permanent (cascades only with the pet).
drop policy if exists care_task_events_member_read on public.care_task_events;
create policy care_task_events_member_read on public.care_task_events for select
  using (private.member_section_ok(pet_id, 'care_protocol'));
drop policy if exists care_task_events_log_insert on public.care_task_events;
create policy care_task_events_log_insert on public.care_task_events for insert
  with check (private.member_can_log(pet_id) and completed_by = auth.uid());
drop policy if exists care_task_events_log_update on public.care_task_events;
create policy care_task_events_log_update on public.care_task_events for update
  using (private.member_can_log(pet_id))
  with check (private.member_can_log(pet_id) and completed_by = auth.uid());

-- Audit trail: owner + co_owner read; rows are written only by definer RPCs.
drop policy if exists pet_access_log_owner_read on public.pet_access_log;
create policy pet_access_log_owner_read on public.pet_access_log for select
  using (private.pet_role(pet_id) in ('owner','co_owner'));

-- ── RLS: additive member-read policies on shared sections ────────────────────
-- Existing owner policies stay untouched; these are OR'd alongside them.
-- Per-pet scoping means a caregiver of pet A sees nothing of the owner's pet B.

drop policy if exists pets_member_read on public.pet_profiles;
create policy pets_member_read on public.pet_profiles for select
  using (private.is_pet_member(id));

drop policy if exists care_tasks_member_read on public.care_tasks;
create policy care_tasks_member_read on public.care_tasks for select
  using (private.member_section_ok(pet_id, 'care_protocol'));

drop policy if exists reminders_member_read on public.reminders;
create policy reminders_member_read on public.reminders for select
  using (private.member_section_ok(pet_id, 'care_protocol'));

drop policy if exists food_logs_member_read on public.food_logs;
create policy food_logs_member_read on public.food_logs for select
  using (private.member_section_ok(pet_id, 'feeding_plan'));

drop policy if exists pet_medications_member_read on public.pet_medications;
create policy pet_medications_member_read on public.pet_medications for select
  using (private.member_section_ok(pet_id, 'medication_details'));

drop policy if exists pet_conditions_member_read on public.pet_conditions;
create policy pet_conditions_member_read on public.pet_conditions for select
  using (private.member_section_ok(pet_id, 'vet_emergency_contacts'));

drop policy if exists pet_allergies_member_read on public.pet_allergies;
create policy pet_allergies_member_read on public.pet_allergies for select
  using (private.member_section_ok(pet_id, 'vet_emergency_contacts'));

drop policy if exists vet_records_member_read on public.vet_records;
create policy vet_records_member_read on public.vet_records for select
  using (private.member_section_ok(pet_id, 'medical_history'));

drop policy if exists scan_records_member_read on public.scan_records;
create policy scan_records_member_read on public.scan_records for select
  using (private.member_section_ok(pet_id, 'symptom_photos'));

drop policy if exists scan_images_member_read on public.scan_images;
create policy scan_images_member_read on public.scan_images for select
  using (exists (
    select 1 from public.scan_records sr
    where sr.id = scan_id and private.member_section_ok(sr.pet_id, 'symptom_photos')
  ));

drop policy if exists timeline_events_member_read on public.timeline_events;
create policy timeline_events_member_read on public.timeline_events for select
  using (private.member_section_ok(pet_id, 'activity_history'));

drop policy if exists health_logs_member_read on public.health_logs;
create policy health_logs_member_read on public.health_logs for select
  using (private.member_section_ok(pet_id, 'activity_history'));

-- ── RPCs (SECURITY DEFINER; the only write path for circle management) ───────

-- 1. Owner creates a single-use invite (8-char code, 48h window).
create or replace function public.create_pet_invite(
  p_pet_id uuid,
  p_role text,
  p_shared_sections jsonb default null,
  p_access_expires_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_sections jsonb;
  v_code text;
  v_invite public.pet_invites;
  i int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if private.pet_role(p_pet_id) is distinct from 'owner' then
    raise exception 'Only the owner can share this pet';
  end if;
  if p_role not in ('co_owner','caregiver','viewer') then
    raise exception 'Invalid role';
  end if;
  v_sections := private.normalize_shared_sections(p_shared_sections);
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.pet_invites (pet_id, code, role, shared_sections, access_expires_at, created_by)
      values (p_pet_id, v_code, p_role, v_sections, p_access_expires_at, auth.uid())
      returning * into v_invite;
      exit;
    exception when unique_violation then
      -- code collision: retry with a fresh one
    end;
  end loop;
  insert into public.pet_access_log (pet_id, actor_id, action, detail)
  values (p_pet_id, auth.uid(), 'invite_created', jsonb_build_object(
    'invite_id', v_invite.id, 'role', p_role,
    'shared_sections', v_sections, 'access_expires_at', p_access_expires_at));
  return jsonb_build_object(
    'code', v_invite.code,
    'role', v_invite.role,
    'shared_sections', v_invite.shared_sections,
    'invite_expires_at', v_invite.invite_expires_at,
    'access_expires_at', v_invite.access_expires_at);
end;
$$;

-- 2. Claim an invite. Single-use, 48h window, idempotent for the claimant.
--    Copies the invite's shared_sections onto the membership; the returned
--    payload is the join screen (pet, role, exact sections granted).
create or replace function public.claim_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inv public.pet_invites;
  v_member public.pet_members;
  v_pet_name text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into v_inv from public.pet_invites where code = v_code;
  if not found then raise exception 'Invite code not found'; end if;

  if v_inv.claimed_by is not null and v_inv.claimed_by = auth.uid() then
    -- Idempotent retry: return the membership this claim already created.
    select * into v_member from public.pet_members
      where pet_id = v_inv.pet_id and user_id = auth.uid();
    if found then
      select name into v_pet_name from public.pet_profiles where id = v_inv.pet_id;
      return jsonb_build_object(
        'pet_id', v_inv.pet_id, 'pet_name', v_pet_name, 'role', v_member.role,
        'shared_sections', v_member.shared_sections, 'already_member', true);
    end if;
  end if;
  if v_inv.claimed_by is not null then raise exception 'This invite was already used'; end if;
  if v_inv.invite_expires_at <= now() then raise exception 'This invite has expired'; end if;
  if private.pet_role(v_inv.pet_id) = 'owner' then
    raise exception 'You already own this pet';
  end if;

  insert into public.pet_members (pet_id, user_id, role, expires_at, shared_sections, created_by)
  values (v_inv.pet_id, auth.uid(), v_inv.role, v_inv.access_expires_at, v_inv.shared_sections, v_inv.created_by)
  on conflict (pet_id, user_id) do update set
    role = excluded.role,
    status = 'active',
    expires_at = excluded.expires_at,
    shared_sections = excluded.shared_sections,
    revoked_at = null
  returning * into v_member;

  update public.pet_invites set claimed_by = auth.uid(), claimed_at = now()
    where id = v_inv.id;

  insert into public.pet_access_log (pet_id, actor_id, action, detail)
  values (v_inv.pet_id, auth.uid(), 'invite_claimed', jsonb_build_object(
    'invite_id', v_inv.id, 'role', v_inv.role, 'shared_sections', v_inv.shared_sections));

  select name into v_pet_name from public.pet_profiles where id = v_inv.pet_id;
  return jsonb_build_object(
    'pet_id', v_inv.pet_id, 'pet_name', v_pet_name, 'role', v_member.role,
    'shared_sections', v_member.shared_sections, 'already_member', false);
end;
$$;

-- 3. Owner edits a member's section toggles. Immediate effect (next query),
--    no re-invite; before/after recorded in the audit trail.
create or replace function public.update_member_sections(
  p_pet_id uuid, p_user_id uuid, p_shared_sections jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_role text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if private.pet_role(p_pet_id) is distinct from 'owner' then
    raise exception 'Only the owner can change sharing';
  end if;
  select role, shared_sections into v_role, v_before
    from public.pet_members where pet_id = p_pet_id and user_id = p_user_id;
  if not found then raise exception 'Not a member of this pet''s Care Circle'; end if;
  if v_role = 'owner' then raise exception 'The owner''s access cannot be edited'; end if;
  v_after := private.normalize_shared_sections(p_shared_sections);
  update public.pet_members set shared_sections = v_after
    where pet_id = p_pet_id and user_id = p_user_id;
  insert into public.pet_access_log (pet_id, actor_id, action, detail)
  values (p_pet_id, auth.uid(), 'sections_updated', jsonb_build_object(
    'user_id', p_user_id, 'before', v_before, 'after', v_after));
  return v_after;
end;
$$;

-- 4. Owner revokes a member. Immediate; the member's next query sees nothing.
--    Their care_task_events are intentionally KEPT and stay attributed.
create or replace function public.revoke_member(p_pet_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if private.pet_role(p_pet_id) is distinct from 'owner' then
    raise exception 'Only the owner can manage the Care Circle';
  end if;
  select role into v_role from public.pet_members
    where pet_id = p_pet_id and user_id = p_user_id;
  if not found then raise exception 'Not a member of this pet''s Care Circle'; end if;
  if v_role = 'owner' then raise exception 'The owner cannot be removed'; end if;
  update public.pet_members set status = 'revoked', revoked_at = now()
    where pet_id = p_pet_id and user_id = p_user_id;
  insert into public.pet_access_log (pet_id, actor_id, action, detail)
  values (p_pet_id, auth.uid(), 'access_revoked',
          jsonb_build_object('user_id', p_user_id, 'was_role', v_role));
end;
$$;

-- 5. Check off a task. Requires log rights (owner/co_owner, or caregiver with
--    care_protocol on). Collapses duplicates per occurrence, last write wins;
--    keeps the owner's existing Today checklist in sync for checklist items.
create or replace function public.complete_care_task(
  p_pet_id uuid,
  p_source_kind text,
  p_source_id uuid,
  p_occurrence_date date default null,
  p_client_completed_at timestamptz default null,
  p_note text default null,
  p_photo_url text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_occurrence date := coalesce(p_occurrence_date, current_date);
  v_ok boolean;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not private.member_can_log(p_pet_id) then
    raise exception 'You do not have access to log care for this pet';
  end if;
  if p_source_kind = 'care_task' then
    select exists (select 1 from public.care_tasks where id = p_source_id and pet_id = p_pet_id) into v_ok;
  elsif p_source_kind = 'reminder' then
    select exists (select 1 from public.reminders where id = p_source_id and pet_id = p_pet_id) into v_ok;
  elsif p_source_kind = 'medication' then
    select exists (select 1 from public.pet_medications where id = p_source_id and pet_id = p_pet_id) into v_ok;
  else
    raise exception 'Unknown task kind: %', p_source_kind;
  end if;
  if not v_ok then raise exception 'Task does not belong to this pet'; end if;

  insert into public.care_task_events
    (pet_id, source_kind, source_id, occurrence_date, completed_by, client_completed_at, note, photo_url)
  values
    (p_pet_id, p_source_kind, p_source_id, v_occurrence, auth.uid(), p_client_completed_at, p_note, p_photo_url)
  on conflict (pet_id, source_kind, source_id, occurrence_date) do update set
    completed_by = excluded.completed_by,
    completed_at = now(),
    client_completed_at = excluded.client_completed_at,
    note = coalesce(excluded.note, public.care_task_events.note),
    photo_url = coalesce(excluded.photo_url, public.care_task_events.photo_url)
  returning id into v_id;

  if p_source_kind = 'care_task' and v_occurrence = current_date then
    update public.care_tasks set done = true where id = p_source_id and pet_id = p_pet_id;
  end if;

  insert into public.pet_access_log (pet_id, actor_id, action, detail)
  values (p_pet_id, auth.uid(), 'task_completed', jsonb_build_object(
    'kind', p_source_kind, 'source_id', p_source_id,
    'occurrence_date', v_occurrence, 'event_id', v_id));
  return v_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_pet_invite(uuid, text, jsonb, timestamptz)',
    'claim_invite(text)',
    'update_member_sections(uuid, uuid, jsonb)',
    'revoke_member(uuid, uuid)',
    'complete_care_task(uuid, text, uuid, date, timestamptz, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ── Realtime: the owner's live activity feed subscribes to check-offs ────────
do $$
begin
  alter publication supabase_realtime add table public.care_task_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
