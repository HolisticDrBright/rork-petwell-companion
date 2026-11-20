begin;
insert into auth.users(id,email) values ('f0e0d0c0-b0a0-4000-8000-000000000003','petwell-rollback-storage@example.invalid');
insert into public.profiles(id) values ('f0e0d0c0-b0a0-4000-8000-000000000003') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f0e0d0c0-b0a0-4000-8000-000000000003","role":"authenticated"}',true);
insert into storage.objects(bucket_id,name) values ('scan-images','f0e0d0c0-b0a0-4000-8000-000000000003/test-only.txt');
reset role;
delete from auth.users where id='f0e0d0c0-b0a0-4000-8000-000000000003';
set local role authenticated;
do $$
begin
 if exists(select 1 from storage.objects where name='f0e0d0c0-b0a0-4000-8000-000000000003/test-only.txt') then raise exception 'Deleted user can still read files'; end if;
 begin
  insert into storage.objects(bucket_id,name) values ('scan-images','f0e0d0c0-b0a0-4000-8000-000000000003/forbidden.txt');
  raise exception 'Deleted user can still upload files';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: active account can upload; deleted account cannot read or upload with old claims; all changes rolled back' as result;
