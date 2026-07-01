-- Petwell · 0023 attach photos to timeline events. Additive column; the app
-- stores an owner-scoped storage path (documents bucket) in remote mode. Photos
-- make the timeline + vet report materially more useful and, with consent,
-- become the future labeled image dataset.
alter table public.timeline_events add column if not exists image_path text;
