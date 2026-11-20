-- Rollback-only check of the normal owner -> caregiver flow after migration.
begin;
insert into auth.users(id,email) values
  ('f0e0d0c0-b0a0-4000-8000-000000000011','petwell-invite-owner@example.invalid'),
  ('f0e0d0c0-b0a0-4000-8000-000000000012','petwell-invite-caregiver@example.invalid');
set local role authenticated;
do $$
declare
  owner_id constant uuid := 'f0e0d0c0-b0a0-4000-8000-000000000011';
  caregiver_id constant uuid := 'f0e0d0c0-b0a0-4000-8000-000000000012';
  pet jsonb;
  invite jsonb;
  membership jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  pet := public.create_pet_with_conditions('{"name":"Invite test","species":"dog"}');
  invite := public.create_pet_invite((pet->>'id')::uuid, 'caregiver');
  perform set_config('request.jwt.claims', json_build_object('sub', caregiver_id, 'role', 'authenticated')::text, true);
  membership := public.claim_invite(invite->>'code');
  if membership->>'role' is distinct from 'caregiver'
    or membership->>'pet_id' is distinct from pet->>'id'
    or (membership->>'already_member')::boolean is distinct from false then
    raise exception 'Invite did not grant the expected caregiver membership';
  end if;
  membership := public.claim_invite(invite->>'code');
  if (membership->>'already_member')::boolean is distinct from true then
    raise exception 'A retry by the same caregiver should return the existing membership';
  end if;
end;
$$;
rollback;
