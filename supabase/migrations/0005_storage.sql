-- Petwell · 0005 storage buckets
-- Private buckets; objects live under a top-level folder named with the user's
-- id (e.g. "<uid>/scan-123.jpg") so policies can scope access by path.

insert into storage.buckets (id, name, public) values
  ('pet-photos',  'pet-photos',  false),
  ('scan-images', 'scan-images', false),
  ('documents',   'documents',   false),
  ('reports',     'reports',     false)
on conflict (id) do nothing;

create policy "petwell storage read" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('pet-photos','scan-images','documents','reports')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "petwell storage insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('pet-photos','scan-images','documents','reports')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "petwell storage update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('pet-photos','scan-images','documents','reports')
    and (storage.foldername(name))[1] = (auth.uid())::text
  )
  with check (
    bucket_id in ('pet-photos','scan-images','documents','reports')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy "petwell storage delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('pet-photos','scan-images','documents','reports')
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
