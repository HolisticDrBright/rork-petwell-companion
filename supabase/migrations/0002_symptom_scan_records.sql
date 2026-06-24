-- Petwell · 0002 symptom triage, scans, records, reports
-- The triage flow produces "possible causes" + urgency guidance, never a diagnosis.

create table public.symptom_sessions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  concern text not null,
  concern_label text,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  red_flag_count int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index symptom_sessions_pet_idx on public.symptom_sessions(pet_id);

create table public.symptom_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.symptom_sessions(id) on delete cascade,
  question_id text not null,
  question_text text not null,
  answer_id text,
  answer_label text,
  is_red_flag boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index symptom_answers_session_idx on public.symptom_answers(session_id);

create table public.triage_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.symptom_sessions(id) on delete cascade,
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  urgency text not null check (urgency in ('green','amber','orange','red')),
  confidence text not null check (confidence in ('Low','Moderate','High')),
  causes jsonb not null default '[]',
  supports jsonb not null default '[]',
  changes_urgency jsonb not null default '[]',
  steps jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index triage_results_pet_idx on public.triage_results(pet_id);

create table public.scan_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  scan_type text not null,
  status text not null default 'complete',
  score text,
  score_label text,
  urgency text check (urgency in ('green','amber','orange','red')),
  fields jsonb not null default '[]',
  patterns jsonb not null default '[]',
  follow_ups jsonb not null default '[]',
  correlation text,
  notes text,
  created_at timestamptz not null default now()
);
create index scan_records_pet_idx on public.scan_records(pet_id);

create table public.scan_images (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scan_records(id) on delete cascade,
  storage_path text not null,
  width int,
  height int,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index scan_images_scan_idx on public.scan_images(scan_id);

create table public.vet_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  subtitle text,
  record_date text,
  status text check (status in ('ok','due','overdue')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index vet_records_pet_idx on public.vet_records(pet_id, category);

create table public.document_uploads (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  record_id uuid references public.vet_records(id) on delete set null,
  title text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index document_uploads_pet_idx on public.document_uploads(pet_id);

create table public.vet_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Vet-ready summary',
  concern_summary text,
  payload jsonb not null default '{}',
  pdf_path text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index vet_reports_pet_idx on public.vet_reports(pet_id);
