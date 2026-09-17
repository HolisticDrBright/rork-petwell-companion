-- 0033_telehealth_column_lock.sql
-- 0031 noted that the owner RLS policy on telehealth_requests technically lets
-- an owner edit scheduled_at / meeting_url / admin_notes on their own row.
-- Those columns are scheduling truth maintained by the admin/practitioner
-- flow, so lock them now (before practitioners go live) with a BEFORE UPDATE
-- trigger that rejects client changes. Admin sessions and server-side (service
-- role / dashboard) writes pass through, mirroring the 0025 auth.role() rule.

create or replace function private.telehealth_lock_admin_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), 'service_role') in ('anon', 'authenticated')
     and not private.is_admin()
     and (new.scheduled_at  is distinct from old.scheduled_at
       or new.meeting_url   is distinct from old.meeting_url
       or new.admin_notes   is distinct from old.admin_notes) then
    raise exception 'Scheduling details are managed by the practitioner side.';
  end if;
  return new;
end $$;

revoke all on function private.telehealth_lock_admin_columns() from public, anon, authenticated;

drop trigger if exists telehealth_requests_lock_admin_columns on public.telehealth_requests;
create trigger telehealth_requests_lock_admin_columns
  before update on public.telehealth_requests
  for each row execute function private.telehealth_lock_admin_columns();
