-- 0017_secure_is_admin.sql
-- Security hardening (clears two Supabase advisor lints:
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable).
--
-- public.is_admin() is SECURITY DEFINER and lived in the API-exposed `public`
-- schema, so PostgREST published it at /rest/v1/rpc/is_admin — callable by the
-- anon and authenticated roles. It is used inside six admin RLS policies.
--
-- A blanket REVOKE EXECUTE is NOT a valid fix here: an RLS policy that calls a
-- function requires the *querying* role to hold EXECUTE on it, so revoking from
-- authenticated would lock real admins out of every admin table (verified
-- empirically). The correct fix is to move the helper into a non-exposed schema
-- (`private`) — PostgREST does not introspect it, so there is no RPC endpoint —
-- while keeping EXECUTE for the roles so RLS still evaluates it.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- Same definition, relocated to the private (non-API-exposed) schema.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- RLS evaluation requires the querying role to hold EXECUTE; granting it inside a
-- private schema does not re-expose the function via the REST API. Drop the
-- implicit PUBLIC grant first, then grant the specific roles.
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- Repoint the six admin policies from public.is_admin() to private.is_admin().
-- Owner/world-read policies on these tables do not use the helper and are left
-- untouched.
do $$
declare t text;
begin
  foreach t in array array['product_submissions','ocr_label_submissions']
  loop
    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format('create policy %I_admin_read on public.%I for select using (private.is_admin())', t, t);
  end loop;
  foreach t in array array['admin_review_queue','admin_review_actions','data_import_runs','source_snapshots']
  loop
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_admin on public.%I for all using (private.is_admin()) with check (private.is_admin())', t, t);
  end loop;
end $$;

-- Remove the API-exposed version. Plain DROP (no CASCADE) errors loudly if any
-- object still references it — a safety net confirming the repoint above is total.
drop function if exists public.is_admin();
