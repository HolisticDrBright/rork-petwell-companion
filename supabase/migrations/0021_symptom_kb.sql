-- Petwell · 0021 symptom image knowledge base
--
-- Curated, source-backed context that maps OBSERVABLE visual features (from the
-- ai-vision-symptom function, or manual notes) to conservative "may indicate"
-- information + urgency + a triage hand-off. It is NEVER a diagnosis. Every row
-- cites a source and stays `review_status = 'needs_vet_review'` until a licensed
-- vet signs off — mirroring toxin_references / integrative provenance.
--
-- The app is offline-first: the authoritative starter set lives in
-- expo/lib/symptomKb/data.ts. This table carries vet-curated additions/overrides.
-- The seed below is a representative subset to establish the review pipeline.

create table if not exists public.symptom_kb_entries (
  id uuid primary key default gen_random_uuid(),
  species text not null default 'both',        -- dog | cat | both
  area text not null,                           -- poop | skin | ear | eye | teeth
  feature text not null,                        -- stool_color, gum_color, …
  match_tokens text[] not null default '{}',
  title text not null,
  may_indicate text not null,                   -- conservative, hedged; never a diagnosis
  urgency text not null default 'watch',        -- info | watch | vet_soon | emergency
  watch_for text[] not null default '{}',
  related_concern text,                         -- triage module id to hand off to
  source_name text,
  source_url text,
  review_status text not null default 'needs_vet_review',  -- needs_vet_review | vet_reviewed
  reviewed_by uuid,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_symptom_kb_area on public.symptom_kb_entries(area);
create unique index if not exists uq_symptom_kb_feature on public.symptom_kb_entries(area, title);

-- ── RLS: world-readable reference; service-role writes; admins may review ─────
alter table public.symptom_kb_entries enable row level security;
drop policy if exists symptom_kb_read on public.symptom_kb_entries;
create policy symptom_kb_read on public.symptom_kb_entries for select using (true);
drop policy if exists symptom_kb_admin on public.symptom_kb_entries;
create policy symptom_kb_admin on public.symptom_kb_entries
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Seed: representative subset (offline module carries the full set) ─────────
insert into public.symptom_kb_entries (species, area, feature, match_tokens, title, may_indicate, urgency, watch_for, related_concern, source_name, source_url)
values
  ('both','poop','stool_color', array['black','tarry','melena'], 'Black or tarry stool',
   'Very dark, black, or tarry stool can be associated with digested blood from the upper digestive tract. It should be checked promptly.',
   'emergency', array['lethargy','pale gums','vomiting'], 'diarrhea', 'Merck Veterinary Manual', 'https://www.merckvetmanual.com'),
  ('both','poop','stool_blood', array['blood','bloody','red streak'], 'Fresh red blood in stool',
   'Bright red blood or streaks can be associated with irritation or bleeding lower in the digestive tract. Ongoing or large amounts should be checked.',
   'vet_soon', array['straining','diarrhea','lethargy'], 'diarrhea', 'VCA Animal Hospitals', 'https://vcahospitals.com'),
  ('both','teeth','gum_color', array['pale','white'], 'Pale or white gums',
   'Pale or white gums can be associated with poor circulation, blood loss, or anemia and can be urgent — especially with weakness or fast breathing.',
   'emergency', array['weakness','fast breathing','collapse'], 'other', 'VCA Animal Hospitals', 'https://vcahospitals.com'),
  ('both','teeth','gum_color', array['blue','bluish','purple'], 'Blue or purple gums',
   'Bluish or purple gums can be associated with low blood oxygen and is an emergency.',
   'emergency', array['labored breathing','collapse'], 'other', 'Merck Veterinary Manual', 'https://www.merckvetmanual.com'),
  ('both','skin','parasite', array['flea','fleas','flea dirt'], 'Visible fleas or flea dirt',
   'Visible fleas or black specks (flea dirt) usually mean fleas. Treatment is usually straightforward, but a vet visit is worth it if there is a strong reaction or the pet is very young, old, or unwell.',
   'watch', array['scratching','hair loss','red skin'], 'skin', 'Companion Animal Parasite Council', 'https://capcvet.org'),
  ('both','ear','ear_discharge', array['dark','brown','debris'], 'Dark or brown ear discharge',
   'Dark, brown, or black discharge and debris in the ear can be associated with an ear infection or mites and is worth a vet check.',
   'vet_soon', array['head shaking','odor','scratching'], 'ear', 'VCA Animal Hospitals', 'https://vcahospitals.com'),
  ('both','eye','eye_discharge', array['green','yellow','pus'], 'Green or yellow eye discharge',
   'Thick green or yellow eye discharge can be associated with an eye infection and is worth a prompt vet check.',
   'vet_soon', array['squinting','redness','swelling'], 'eye', 'VCA Animal Hospitals', 'https://vcahospitals.com')
on conflict (area, title) do nothing;
