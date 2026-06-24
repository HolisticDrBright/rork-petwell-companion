-- Petwell · 0011 privacy & data-ownership preferences
-- Per-user data permissions, surfaced on the Settings privacy screen. Defaults
-- are privacy-forward: training opt-out defaults to opted-IN to product use only,
-- research sharing defaults OFF, and the user controls each toggle.

alter table public.profiles
  add column if not exists training_opt_out boolean not null default false,
  add column if not exists store_photos boolean not null default true,
  add column if not exists personalized_insights boolean not null default true,
  add column if not exists share_research boolean not null default false;
