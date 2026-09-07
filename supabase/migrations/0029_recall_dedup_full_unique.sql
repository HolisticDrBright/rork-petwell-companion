-- 0029_recall_dedup_full_unique.sql
-- The dedup index on recall_events was partial (WHERE dedup_key IS NOT NULL),
-- which PostgREST `on_conflict=dedup_key` upserts cannot target (42P10 —
-- ON CONFLICT inference never matches a partial index without the predicate).
-- A full unique index is equivalent here: Postgres treats NULLs as distinct,
-- so rows without a dedup key remain unconstrained, and keyed rows dedupe.
drop index if exists idx_recall_events_dedup;
create unique index if not exists idx_recall_events_dedup
  on public.recall_events (dedup_key);
