-- Petwell · 0008 triage result summary
-- The adaptive triage engine produces a vet-ready summary string and a list of
-- red flags that were present; store both alongside the structured result.

alter table public.triage_results
  add column if not exists summary text,
  add column if not exists red_flags jsonb not null default '[]';
