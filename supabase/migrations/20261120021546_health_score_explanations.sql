-- Keep the existing history. Only versioned snapshots are authoritative for the
-- new chart, since older rows may not include a saved evidence breakdown.
alter table public.health_scores
  add column score_model text,
  add column inputs jsonb,
  add column data_coverage jsonb,
  add column confidence text check (confidence in ('low','medium','high'));
create unique index health_scores_daily_version
  on public.health_scores(pet_id,generated_at,score_model);
