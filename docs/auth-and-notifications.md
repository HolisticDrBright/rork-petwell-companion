# Accounts & notifications — setup notes

## Email + password accounts

- Auth is email + password via Supabase (`lib/backend.ts`). Sessions persist in
  AsyncStorage, so users stay signed in across launches.
- **Account continuity:** if the device is on an anonymous identity (the default),
  creating an account **converts that user in place** (`updateUser({ email, password })`)
  so the same user id — and therefore all existing pets/logs/scans/reports — carries
  over. On a fresh device, sign-in pulls the account's data (RLS-scoped). Locally
  created pets (local mode) are best-effort migrated to the account on first auth.
- **Email confirmation** is a Supabase project setting (Authentication → Providers →
  Email → "Confirm email"). The app handles both:
  - Confirmation **off** → account is usable immediately after sign-up.
  - Confirmation **on** → the UI shows "check your email to confirm, then sign in."
  For a low-friction beta, turning confirmation off is common; for production, leave
  it on and ensure SMTP is configured.
- The backend must be configured (`EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY`). With no
  backend the app runs in local mode and the Account screen says so.

> Note: auth flows can't be exercised from the CI sandbox (outbound calls to the
> Supabase auth host are proxied/blocked there). Verify sign-up / sign-in / sign-out
> on a device or local machine with network access.

## Local notifications (reminders)

- `expo-notifications` (installed) powers daily local reminders. Toggling a reminder
  on schedules a daily notification at its time; toggling off cancels it
  (`services/notificationsService.ts`). Web degrades to a no-op.
- **Runtime requirements:** local notifications need a **dev/prod build**
  (`npx expo run:ios` / `npx expo run:android`) — they do not fully work in Expo Go
  on iOS. The `expo-notifications` config plugin is already in `app.json`.
- No push server or API keys are required — these are on-device local notifications.

## CI

`.github/workflows/ci.yml` runs `tsc --noEmit`, `eslint .`, and **all** test suites
(`tests/safety.test.ts`, `tests/data.test.ts`, `tests/toxins.test.ts`) on every push/PR.
Locally: `bun test` (or `npm test`) runs the same three suites; `npm run typecheck` /
`npm run lint` mirror CI. If you install with npm instead of bun, use
`npm install --legacy-peer-deps` (the repo's lockfile is `bun.lock`).
