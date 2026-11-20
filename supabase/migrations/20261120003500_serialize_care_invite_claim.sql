create or replace function public.claim_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_inv public.pet_invites;
  v_member public.pet_members;
  v_pet_name text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  -- Serialize claims on this invite through the end of the transaction.
  select * into v_inv from public.pet_invites where code = v_code for update;
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
