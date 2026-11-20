# Commercial blocker fixes — 2026-11-19

This branch fixes explicit production authentication, evidence-free health scores,
primary record save failures, account deletion, password recovery routing, and
unsupported Pro sales claims. It is not a commercial-release certification.

## Behavior

- Production opens an account gate without requiring anonymous authentication.
  Sign-in/sign-out updates identity and clears account-specific query caches.
  Existing device-only records are retained and can be exported from Account.
- Scores require recent observations in at least two systems. Missing systems
  stay unknown; synthetic trends and future/stale observations cannot create a
  score. The score remains a heuristic, not a validated clinical assessment.
- Pet/condition creation and timeline/metric/food writes are database transactions.
  Save screens wait for confirmation, retain inputs on failure, and prevent duplicate
  taps. Scan saves require successful image upload before recording a cloud path.
- Account deletion verifies the bearer token with Supabase Auth, derives the owner
  from that user, requires explicit confirmation, removes files in all four app
  buckets, revokes sessions, and deletes the user. A restrictive storage policy
  prevents a deleted account's old access token from uploading or reading files.
- Recovery uses a same-device PKCE exchange and requires a recovery event before
  updating a password. Expired/wrong-flow links and email delivery failures are visible.
- New Pro purchases and paywalls are disabled. Existing restore and subscription
  management remain available. Unsupported marketing claims were removed.
- Pet photos upload to a private bucket and use expiring links for display.
  Scan photo uploads follow the cloud-storage preference. The scan image deletion
  action removes both current and legacy files without deleting other documents.
- Reminder and correction saves surface failures. On iOS, account exports are full
  JSON files and vet reports are PDFs. Legacy photo scores no longer appear in reports.

## Deployed backend

Target: `dxcuuguorvbqoiybefes` (the production project used by EAS).

Applied migrations:

- `20261119231508_commercial_readiness_writes.sql`
- `20261119233700_deleted_account_storage_guard.sql`

The remote historical migration names differ from this checkout's old numeric
filenames. These two migrations were applied individually in transactions and
recorded in migration history. Do not replay the entire legacy migration folder
with an unreviewed `db push`.

Deployed `delete-account` with `--no-verify-jwt` after explicit owner approval.
This project issues ES256 tokens; the legacy edge gateway verification is not
compatible. Authentication remains mandatory inside the function via
`_shared/auth.ts` (`auth.getUser(token)`). Preserve that validation on redeploy.

Allowed native redirects now include both two-slash and three-slash forms of
`petwell://reset-password` and `petwell://account`. Signup confirms the email
before returning to Account, where the user signs in with their password.

Resend verified `ailongevitypro.app` and supplies Supabase custom SMTP through a
send-only, domain-scoped key. Petwell sends from `info@AILongevityPro.app`.
Production Auth accepted signup confirmation and recovery requests for disposable
test accounts. Physical iPhone link and mailbox verification are release checks.

## Verification

- TypeScript and ESLint passed.
- All 13 unit/regression suites passed, including recovery session isolation,
  save-error propagation, evidence thresholds, deletion ownership and storage pagination.
- Five development browser journeys passed; two production-mode browser journeys
  passed with a controlled backend (sign-in, save failure/retry/reload, sign-out,
  recovery delivery failure). These are not native-device tests.
- Rollback-only SQL tests covered ownership, atomic writes and stale-token storage.
- Live production tests used two disposable accounts: real password sign-in,
  pet/condition and timeline/metric saves, cross-account denial, deletion of the
  caller and nested files in all four buckets, preservation of the other account,
  and denial of old access/refresh tokens. Test accounts/files were cleaned up.
- Post-deploy security advisor: no errors or new warnings. Six existing warnings
  remain (public pg_trgm and five Care Circle security-definer functions).

## Release work still required

- Verify signup and recovery delivery and links on an installed iPhone build.
- Run native release QA on the next TestFlight build, including PDFs, JSON export,
  photo uploads, reminders, and deletion with a disposable account.
- Check real store entitlements, restore/manage flows, and subscription disclosure
  on device. Pausing purchases in this branch does not alter older installed builds
  or cancel existing subscriptions.
- Complete the broader commercial audit, including clinical content/claim review,
  native media handling and non-primary save flows, and the existing advisor warnings.
