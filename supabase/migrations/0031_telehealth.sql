-- 0031_telehealth.sql
-- Vet telehealth wiring (launches as "coming soon").
--
-- The feature flag is DATA, not code: the app shows the coming-soon state
-- while zero practitioners are active, and flips to bookable the moment an
-- admin activates a practitioner row — no app release needed to launch.
--
-- v1 booking model: a practitioner row carries an optional external
-- booking_url (Calendly-style). When present, "Book" opens it; when null,
-- the app files a telehealth_request the practitioner/admin confirms
-- out-of-band (scheduled_at/meeting_url filled in by the admin side).
-- While the feature is coming-soon, interested users file a `waitlist`
-- request so real demand is visible before any vet commits.
--
-- Scheduling truth (scheduled_at / meeting_url / admin_notes) is maintained
-- through the admin flow; the owner policy technically permits editing those
-- columns on their own row, which can only confuse that owner — revisit with
-- column-level rules if practitioners ever get their own accounts.
--
-- Telehealth requests are between the owner and the practitioner: they are
-- deliberately NOT shared with the Care Circle (no member-read policy) and
-- ARE part of the privacy export/delete set (services/ownedTables.ts).

create table public.vet_practitioners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  credentials text,                            -- e.g. "DVM", "DVM, CVA"
  bio text,
  photo_url text,
  specialties text[] not null default '{}',
  species text not null default 'both' check (species in ('dog', 'cat', 'both')),
  timezone text,
  booking_url text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vet_practitioners_updated before update on public.vet_practitioners
  for each row execute function public.set_updated_at();

create table public.telehealth_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pet_profiles(id) on delete set null,
  practitioner_id uuid references public.vet_practitioners(id) on delete set null,
  kind text not null default 'appointment' check (kind in ('waitlist', 'appointment')),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'completed', 'cancelled')),
  reason text,
  preferred_times text,
  scheduled_at timestamptz,
  meeting_url text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger telehealth_requests_updated before update on public.telehealth_requests
  for each row execute function public.set_updated_at();
create index telehealth_requests_user_idx on public.telehealth_requests (user_id);
-- One standing waitlist entry per user (service checks before insert; the
-- index is the backstop — partial, so it can't be an upsert conflict target).
create unique index telehealth_waitlist_once
  on public.telehealth_requests (user_id) where kind = 'waitlist';

alter table public.vet_practitioners enable row level security;
alter table public.telehealth_requests enable row level security;

-- Practitioner directory: everyone sees active rows; admins see and manage all.
create policy vet_practitioners_public_read on public.vet_practitioners
  for select using (active or private.is_admin());
create policy vet_practitioners_admin_write on public.vet_practitioners
  for all using (private.is_admin()) with check (private.is_admin());

-- Requests: strictly the requesting owner, plus the admin operations view.
create policy telehealth_requests_owner on public.telehealth_requests
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy telehealth_requests_admin on public.telehealth_requests
  for all using (private.is_admin()) with check (private.is_admin());
