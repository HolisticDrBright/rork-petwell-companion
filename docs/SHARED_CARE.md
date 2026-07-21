# Shared Care Access (Care Circle)

Owners share a pet via a single-use Pet ID invite; caregivers (sitters, family,
walkers) get exactly the sections the owner toggles on, check off tasks the
owner sees live, and can be removed in one tap. Backend: migration
`supabase/migrations/0024_shared_care.sql` (applied to the live project).

## Roles

| Role | Sees | Can do |
|---|---|---|
| owner | everything | everything, incl. invites/toggles/revokes |
| co_owner | everything (bypasses toggles) | log care; no circle management (MVP) |
| caregiver | toggled-on sections only | check off tasks, add notes/photos |
| viewer | toggled-on sections only | nothing (read-only) |

## Per-section share toggles (owner-controlled, per member)

Stored as `pet_members.shared_sections` jsonb; changed via
`update_member_sections` with immediate effect (next query) and a before/after
audit entry. Canonical keys and what they gate in this repo:

| Key | Default | Gates |
|---|---|---|
| care_protocol | on | care_tasks, reminders, care_task_events (+ the right to log) |
| feeding_plan | on | food_logs |
| medication_details | on | pet_medications |
| vet_emergency_contacts | on | pet_conditions, pet_allergies |
| medical_history | off | vet_records |
| symptom_photos | off | scan_records, scan_images |
| wearable_vitals | off | reserved (no wearable tables yet) |
| activity_history | off | timeline_events, health_logs |

Never shared under any toggle combination: other pets in the account,
document_uploads, vet_reports, food scans, AI tables, billing (not in DB),
Care Circle management. Shared photo BYTES (storage objects) remain
owner-scoped until the client slice adds shared serving.

## Enforcement (database, not app code)

- RLS everywhere via `private.pet_role / is_pet_member / member_section_ok /
  member_can_log` (SECURITY DEFINER, `private` schema — not REST-exposed).
- Expiry lives in the helper predicate (`status='active' AND (expires_at IS
  NULL OR expires_at > now())`) — an expired membership behaves exactly like a
  revoked one, with zero app-code involvement.
- All circle writes go through SECURITY DEFINER RPCs; owner guards use
  `IS DISTINCT FROM 'owner'` so a non-member's NULL role fails closed.
- Revocation removes access, never data: a revoked member's
  `care_task_events` stay, attributed. Their own membership row remains
  visible to them (status `revoked`) so the app can render "access ended".
- Account deletion: `completed_by` → SET NULL (history survives, identity
  erased); invites die with either party; memberships survive their grantor.

## RPC surface

- `create_pet_invite(pet_id, role, shared_sections?, access_expires_at?)` —
  owner only; 8-char single-use code (no 0/O/1/I/L), 48 h window.
- `claim_invite(code)` — validates window + single use; idempotent per
  claimant; copies invite toggles to the membership; returns the join-screen
  payload (pet, role, exact sections).
- `update_member_sections(pet_id, user_id, sections)` — owner only; rejects
  unknown keys; audited before/after.
- `revoke_member(pet_id, user_id)` — owner only; immediate.
- `complete_care_task(pet_id, kind, source_id, occurrence_date?,
  client_completed_at?, note?, photo_url?)` — one canonical event per
  (task, occurrence): duplicate/offline check-offs collapse, last write wins;
  syncs `care_tasks.done` for today's checklist items; audited.

Realtime: `care_task_events` is in the `supabase_realtime` publication;
subscribe per pet (`careCircleService.subscribeTaskEvents`) for the owner's
live feed. RLS applies to realtime payloads.

## Client

- `lib/careCircle.ts` — pure rules (keys, defaults, labels, code hygiene,
  capability checks). UI gating only; RLS is the boundary.
- `services/careCircleService.ts` — typed RPC + query + realtime wrappers.
- Tests: `bun tests/sharedCare.test.ts` (rules + migration invariants).
  Live RLS acceptance probes (per-section on/off, revoke/expire, single-use,
  offline collapse, account deletion) were run against the production project
  with impersonated JWTs during the 0024 rollout.

## Status

Slices 1–2 (schema + RLS + RPCs, verified) are DONE. Slice 3 (share/join
screens, caregiver Today view, live feed) and slice 4 (missed-task nudges,
audit trail UI) are next. Non-goals per spec: pro-sitter dashboard, boarding
mode, vet access, owner↔sitter payments.
