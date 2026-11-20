create table public.vet_visit_packages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash bytea not null unique,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);
create index vet_visit_packages_owner on public.vet_visit_packages(owner_id,pet_id,created_at desc);
alter table public.vet_visit_packages enable row level security;
revoke all on public.vet_visit_packages from public, anon, authenticated;
grant select on public.vet_visit_packages to authenticated;
create policy visit_package_owner_read on public.vet_visit_packages for select to authenticated
  using (owner_id = (select auth.uid()) and private.pet_role(pet_id) = 'owner');

create function private.create_vet_visit_package(p_pet_id uuid,p_summary jsonb,p_days integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  token text;
  result public.vet_visit_packages;
begin
  if auth.uid() is null or private.pet_role(p_pet_id) is distinct from 'owner' then raise insufficient_privilege; end if;
  if p_days is null or p_days not between 1 and 30 then raise exception 'Choose an expiry from 1 to 30 days.'; end if;
  if p_summary->>'version' is distinct from '1' or jsonb_typeof(p_summary->'report') is distinct from 'object'
    or jsonb_typeof(p_summary->'photos') is distinct from 'array'
    or pg_column_size(p_summary) > 12000000 then raise exception 'The visit package is incomplete or too large.'; end if;
  token := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  insert into public.vet_visit_packages(pet_id,owner_id,token_hash,summary,expires_at)
    values (p_pet_id,auth.uid(),sha256(convert_to(token,'UTF8')),p_summary,now()+make_interval(days=>p_days))
    returning * into result;
  return jsonb_build_object('id',result.id,'token',token,'expires_at',result.expires_at);
end;
$$;
create function private.get_vet_visit_package(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select summary from public.vet_visit_packages
  where p_token ~ '^[a-f0-9]{64}$' and token_hash = sha256(convert_to(p_token,'UTF8'))
    and revoked_at is null and expires_at > now();
$$;
create function private.revoke_vet_visit_package(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  update public.vet_visit_packages set revoked_at = coalesce(revoked_at, now())
  where id = p_id and owner_id = auth.uid() and private.pet_role(pet_id) = 'owner';
  if not found then raise insufficient_privilege; end if;
end;
$$;

create function public.create_vet_visit_package(p_pet_id uuid,p_summary jsonb,p_days integer default 30)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.create_vet_visit_package(p_pet_id,p_summary,p_days);
$$;
create function public.get_vet_visit_package(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.get_vet_visit_package(p_token);
$$;
create function public.revoke_vet_visit_package(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.revoke_vet_visit_package(p_id);
$$;

revoke all on function private.create_vet_visit_package(uuid,jsonb,integer), private.get_vet_visit_package(text),
  private.revoke_vet_visit_package(uuid), public.create_vet_visit_package(uuid,jsonb,integer),
  public.get_vet_visit_package(text), public.revoke_vet_visit_package(uuid) from public, anon, authenticated;
grant execute on function private.create_vet_visit_package(uuid,jsonb,integer), private.revoke_vet_visit_package(uuid),
  public.create_vet_visit_package(uuid,jsonb,integer), public.revoke_vet_visit_package(uuid) to authenticated;
grant execute on function public.get_vet_visit_package(text) to anon, authenticated;
