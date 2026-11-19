-- Revoking refresh tokens does not expire issued access tokens. Require a
-- surviving profile as well as the existing ownership policies for app files.
create policy "petwell active account storage"
on storage.objects as restrictive for all to authenticated
using (
  bucket_id not in ('pet-photos','scan-images','documents','reports')
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()))
)
with check (
  bucket_id not in ('pet-photos','scan-images','documents','reports')
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()))
);
