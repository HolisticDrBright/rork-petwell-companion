-- Petwell · 0001 core schema
-- Profiles, pets and their care data, logs, and the timeline feed.
-- Safety note: this app provides triage/"possible causes" guidance, never diagnosis.

create extension if not exists pgcrypto;

-- Keep updated_at fresh on mutable rows.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1:1 with auth.users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  premium boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  demo_key text,
  name text not null,
  species text not null check (species in ('dog','cat')),
  breed text not null default '',
  age_years numeric(4,1) not null default 0,
  sex text check (sex in ('male','female')),
  weight_lb numeric(6,1) not null default 0,
  photo_url text,
  status text not null default 'stable' check (status in ('stable','watch','attention')),
  status_note text not null default 'Stable',
  recent_change text,
  risk_watch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pet_profiles_owner_idx on public.pet_profiles(owner_id);
create trigger pet_profiles_updated before update on public.pet_profiles
  for each row execute function public.set_updated_at();

create table public.pet_conditions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  label text not null,
  detail text,
  since text,
  created_at timestamptz not null default now()
);
create index pet_conditions_pet_idx on public.pet_conditions(pet_id);

create table public.pet_allergies (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  label text not null,
  detail text,
  severity text,
  created_at timestamptz not null default now()
);
create index pet_allergies_pet_idx on public.pet_allergies(pet_id);

create table public.pet_medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  name text not null,
  dosage text,
  schedule text,
  purpose text,
  status text default 'ok' check (status in ('ok','due','overdue')),
  refill_date text,
  created_at timestamptz not null default now()
);
create index pet_medications_pet_idx on public.pet_medications(pet_id);

create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  label text not null,
  detail text,
  icon text not null default 'heart' check (icon in ('bowl','pill','activity','tooth','heart','droplet')),
  done boolean not null default false,
  due_time text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index care_tasks_pet_idx on public.care_tasks(pet_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  label text not null,
  detail text,
  time_label text,
  repeat text default 'Once',
  enabled boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index reminders_pet_idx on public.reminders(pet_id);

-- Structured metric logs (drive charts/trends).
create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  metric text,
  value numeric,
  unit text,
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index health_logs_pet_idx on public.health_logs(pet_id, logged_at desc);

-- Human-readable longitudinal feed shown on the Timeline tab.
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  detail text,
  value numeric,
  urgency text check (urgency in ('green','amber','orange','red')),
  event_date date not null default current_date,
  event_time text,
  source text not null default 'manual',
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index timeline_events_pet_idx
  on public.timeline_events(pet_id, event_date desc, created_at desc);
