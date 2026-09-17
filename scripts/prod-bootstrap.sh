#!/usr/bin/env bash
#
# Petwell production bootstrap — brings a Supabase project to launch state.
#
#   PROJECT_REF=<ref> DATABASE_URL='postgresql://…' ./scripts/prod-bootstrap.sh
#
# What it does, in order (idempotent — safe to re-run; exits non-zero on any
# failed step):
#   1. Links the Supabase CLI to $PROJECT_REF and pushes every migration in
#      supabase/migrations/ (0001–0034…). Already-applied migrations are
#      skipped by the CLI.
#   2. Applies the June food-evidence dataset
#      (data/food-evidence/import_food_evidence.sql) unless its import marker
#      is already present in data_import_runs.
#   3. Promotes an admin: pass PROMOTE_ADMIN_EMAIL=<email> to flag that
#      account's profile is_admin = true (no-op if the user hasn't signed up
#      yet — migration 0025 auto-flags the owner's own email at signup).
#   4. Prints the RLS verification checklist (docs/PRODUCTION_SETUP.md §4)
#      that must be walked manually before launch.
#
# Requirements: supabase CLI (logged in: `supabase login`), psql, and the
# project's DATABASE_URL (Dashboard → Settings → Database → connection string,
# use the "Transaction" pooler string or the direct connection).
#
# NOTE: the current production project (dxcuuguorvbqoiybefes) was provisioned
# through the Supabase MCP, so its migration history uses timestamp versions.
# This script is for standing up a FRESH project reproducibly (staging,
# disaster recovery, or a future re-home) — don't point it at the live
# project unless you intend to reconcile migration histories first.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${PROJECT_REF:?Set PROJECT_REF=<your supabase project ref>}"
: "${DATABASE_URL:?Set DATABASE_URL=<the postgres connection string for the project>}"

command -v supabase >/dev/null || { echo "✖ supabase CLI not found (npm i -g supabase)"; exit 1; }
command -v psql >/dev/null || { echo "✖ psql not found (install postgresql-client)"; exit 1; }

echo "── 1/4 Linking + pushing migrations to $PROJECT_REF ─────────────────────"
supabase link --project-ref "$PROJECT_REF"
supabase db push

echo "── 2/4 Food-evidence dataset ────────────────────────────────────────────"
ALREADY=$(psql "$DATABASE_URL" -tAc \
  "select count(*) from public.data_import_runs where source in ('manual_compact','food_evidence_bootstrap');" \
  2>/dev/null || echo "0")
if [ "${ALREADY:-0}" -gt 0 ]; then
  echo "✓ Food-evidence import marker found — skipping (idempotent)."
else
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f data/food-evidence/import_food_evidence.sql
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
    "insert into public.data_import_runs (source, started_at, finished_at, status)
     values ('food_evidence_bootstrap', now(), now(), 'success');"
  echo "✓ Food-evidence dataset applied."
fi

echo "── 3/4 Admin promotion ──────────────────────────────────────────────────"
if [ -n "${PROMOTE_ADMIN_EMAIL:-}" ]; then
  PROMOTED=$(psql "$DATABASE_URL" -tAc \
    "update public.profiles p set is_admin = true
       from auth.users u
      where u.id = p.id and lower(u.email) = lower('${PROMOTE_ADMIN_EMAIL}')
      returning p.id;" | wc -l)
  if [ "$PROMOTED" -gt 0 ]; then
    echo "✓ Promoted $PROMOTE_ADMIN_EMAIL to admin."
  else
    echo "⚠ $PROMOTE_ADMIN_EMAIL has no account yet — sign up in the app first, then re-run."
  fi
else
  echo "· PROMOTE_ADMIN_EMAIL not set — skipping. (The owner's email is auto-flagged"
  echo "  admin at signup by migration 0025; use this for additional admins.)"
fi

echo "── 4/4 RLS verification checklist (docs/PRODUCTION_SETUP.md §4) ─────────"
awk '/^## 4\. RLS verification checklist/,/^---$/' docs/PRODUCTION_SETUP.md | sed '$d'

echo ""
echo "✓ Bootstrap complete. Walk the checklist above against this project, then"
echo "  run Supabase Advisors (Dashboard → Advisors) until security lints are"
echo "  clean or understood (the SECURITY DEFINER RPC warnings are by design —"
echo "  see supabase/migrations/0024_shared_care.sql)."
