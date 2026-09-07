-- 0025_admin_bootstrap.sql
-- Admin bootstrap + is_admin lockdown.
--
-- Two gaps this closes:
--   1. profiles_self (0004) is FOR ALL with no column guard, so any signed-in
--      user could UPDATE their own row to is_admin = true. The flag gates six
--      admin policies (0016/0017) plus the in-app admin screens and the
--      ai-coa-extract function, so it must never be client-writable. A BEFORE
--      trigger now pins it server-side.
--   2. The app owner had no path to admin at all on a fresh database. Signups
--      whose *auth* email is the owner's address are flagged automatically.
--      Deriving from auth.users — never from profiles.email, which is a
--      client-writable text column; keying on it would let anyone rename
--      themselves into admin.
--
-- Also creates the profile row at signup so the flag exists before the app's
-- own ensureProfile() upsert runs. Every path is idempotent.

create schema if not exists private;

-- Replace the earlier hand-applied variants (2026-09-07 research session) if
-- present: they lived in the API-exposed public schema and trusted
-- profiles.email. No-ops on databases that never had them.
drop trigger if exists trg_bootstrap_admin_flag on public.profiles;
drop function if exists public.bootstrap_admin_flag();
drop trigger if exists trg_handle_new_auth_user on auth.users;
drop function if exists public.handle_new_auth_user();

create or replace function private.enforce_admin_flag()
returns trigger language plpgsql security definer set search_path = public as $$
declare auth_email text;
begin
  select lower(coalesce(u.email, '')) into auth_email
    from auth.users u where u.id = new.id;
  if auth_email = 'brandonbright@gmail.com' then
    new.is_admin := true;
  elsif coalesce(auth.role(), 'service_role') in ('anon', 'authenticated') then
    -- Client sessions never change the flag; service/dashboard writes pass.
    if tg_op = 'INSERT' then
      new.is_admin := false;
    else
      new.is_admin := coalesce(old.is_admin, false);
    end if;
  end if;
  return new;
end $$;

revoke all on function private.enforce_admin_flag() from public, anon, authenticated;

drop trigger if exists profiles_enforce_admin_flag on public.profiles;
create trigger profiles_enforce_admin_flag
  before insert or update on public.profiles
  for each row execute function private.enforce_admin_flag();

-- Create the profile row at signup (coexists with the app's own upsert; the
-- BEFORE trigger above derives is_admin for the new row).
create or replace function private.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Backfill for databases where the owner signed up before this migration.
update public.profiles p
   set is_admin = true
  from auth.users u
 where u.id = p.id and lower(coalesce(u.email, '')) = 'brandonbright@gmail.com';
