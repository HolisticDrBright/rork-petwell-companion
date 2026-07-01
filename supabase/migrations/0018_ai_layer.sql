-- Petwell server-side AI layer: generation logs, chat threads/messages, and
-- AI-extracted records. The AI provider is called ONLY from Edge Functions
-- (service role); the client never holds a model API key. Every AI output is
-- logged here with token/cost accounting and a review_status so nothing
-- AI-generated is trusted until reviewed. User AI data is owner-scoped via RLS;
-- nothing here is world-readable.

-- ── ai_generations ───────────────────────────────────────────
-- One row per AI call (any feature). input_refs holds IDs/paths, never raw PII
-- where avoidable. user_visible_text is what the app showed the user.
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pet_profiles(id) on delete set null,
  feature text not null check (feature in (
    'chat','explanation','food_label_vision','record_summary',
    'coa_extraction','care_plan','vet_report_rewrite'
  )),
  model text,
  provider text not null default 'openai' check (provider in ('openai','anthropic')),
  prompt_version text,
  input_refs jsonb,
  output jsonb,
  user_visible_text text,
  safety_flags jsonb,
  review_status text not null default 'generated'
    check (review_status in ('generated','needs_review','approved','rejected')),
  token_input int not null default 0,
  token_output int not null default 0,
  estimated_cost_cents numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_generations_owner on public.ai_generations(owner_id, created_at desc);
create index if not exists idx_ai_generations_feature on public.ai_generations(feature);

-- ── ai_chat_threads ──────────────────────────────────────────
create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pet_profiles(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ai_chat_threads_owner on public.ai_chat_threads(owner_id, updated_at desc);

-- ── ai_chat_messages ─────────────────────────────────────────
create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text,
  tool_name text,
  tool_payload jsonb,
  safety_flags jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_chat_messages_thread on public.ai_chat_messages(thread_id, created_at);

-- ── ai_extracted_records ─────────────────────────────────────
-- Structured extractions from uploaded docs / COAs. Default needs_review; an
-- admin/vet must approve before anything is trusted or surfaced as evidence.
create table if not exists public.ai_extracted_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pet_id uuid references public.pet_profiles(id) on delete set null,
  source_document_id uuid,
  generation_id uuid references public.ai_generations(id) on delete set null,
  record_type text not null check (record_type in (
    'vet_record','lab_result','coa','invoice','discharge','prescription'
  )),
  extracted jsonb,
  review_status text not null default 'needs_review'
    check (review_status in ('generated','needs_review','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_extracted_owner on public.ai_extracted_records(owner_id, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.ai_generations enable row level security;
alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.ai_extracted_records enable row level security;

-- ai_generations: owner can read + delete their own history; writes come from the
-- Edge Function (service role bypasses RLS). No client INSERT/UPDATE — logs can't
-- be forged, but a user can clear their history.
drop policy if exists ai_generations_select on public.ai_generations;
create policy ai_generations_select on public.ai_generations for select using (owner_id = auth.uid());
drop policy if exists ai_generations_delete on public.ai_generations;
create policy ai_generations_delete on public.ai_generations for delete using (owner_id = auth.uid());

-- ai_chat_threads: owner-scoped full control (rename / delete).
drop policy if exists ai_chat_threads_owner on public.ai_chat_threads;
create policy ai_chat_threads_owner on public.ai_chat_threads for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ai_chat_messages: visible/removable when the parent thread belongs to the user.
drop policy if exists ai_chat_messages_owner on public.ai_chat_messages;
create policy ai_chat_messages_owner on public.ai_chat_messages for all
  using (exists (select 1 from public.ai_chat_threads t where t.id = thread_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.ai_chat_threads t where t.id = thread_id and t.owner_id = auth.uid()));

-- ai_extracted_records: owner can read + delete; review_status changes come from
-- the admin/service path (admins can also read all for the review queue).
drop policy if exists ai_extracted_select on public.ai_extracted_records;
create policy ai_extracted_select on public.ai_extracted_records for select
  using (owner_id = auth.uid() or private.is_admin());
drop policy if exists ai_extracted_delete on public.ai_extracted_records;
create policy ai_extracted_delete on public.ai_extracted_records for delete using (owner_id = auth.uid());
