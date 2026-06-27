# Petwell — RevenueCat Setup

Petwell Pro is backed entirely by **RevenueCat** (`react-native-purchases` v10 +
`react-native-purchases-ui`). The RevenueCat entitlement is the **single source of
truth** for Pro — there is no local "unlock premium" toggle anywhere in the app.

- App glue: `expo/providers/SubscriptionProvider.tsx`,
  `expo/services/subscriptionService.ts`, `expo/lib/purchases/*`,
  `expo/app/premium.tsx`.
- Keys are read in `expo/lib/purchases/config.ts` (and surfaced in
  `expo/lib/config.ts`).

## How it behaves

- On launch, the app configures RevenueCat with the **public SDK key** for the
  platform, identifies the user (RevenueCat app user id ↔ Supabase auth, so
  purchases follow the account across devices and sign-out), and loads entitlement
  + offerings.
- When the `pro` entitlement is active, `isPro` is true and it is mirrored onto the
  app's `premium` gate (`SubscriptionProvider` → `setPremium`). Pro features unlock
  from the entitlement, never from a fake flag.
- **Unavailable state**: on web, or when no key is set for the platform, purchases
  are **disabled** (`isSupported = false`) — the app keeps working and Pro stays
  locked. The paywall shows a graceful "not available" state instead of crashing.

## Keys (client-safe — they ship in the app)

RevenueCat **SDK keys are public** by design: they are embedded in every binary and
only allow what the store + dashboard permit. Each store has its own key.

| EAS env var | RevenueCat key | Where to find it |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Apple App Store key (`appl_…`) | Dashboard → Project → API keys |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Google Play key (`goog_…`) | Dashboard → Project → API keys |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` | entitlement identifier (e.g. `pro`) | Dashboard → Entitlements |

Set these as **EAS environment variables** per profile (`production`, `preview`) —
see `expo/eas.json` and `docs/PRODUCTION_SETUP.md`. **No RevenueCat *secret* API key
goes in the app** — server-side webhook/secret keys (if you add them later) belong
in Supabase/back-end secrets only (see `docs/SECURITY.md`).

> The entitlement id in the dashboard must match `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT`
> exactly. If you name the dashboard entitlement `pro`, set the env var to `pro`.

## One-time dashboard setup

1. **Create a RevenueCat project** (one project, two platform apps).
2. **App Store Connect** (iOS):
   - Create the app + an **auto-renewing subscription group** with your products
     (e.g. monthly / yearly) and, if offered, a **non-consumable** lifetime product.
   - Generate an **App Store Connect API key** and add it to RevenueCat (so it can
     validate receipts), and paste your **App-Specific Shared Secret**.
   - Add the iOS app in RevenueCat; copy its **public SDK key** → `…_IOS_KEY`.
3. **Google Play Console** (Android):
   - Create the subscription products (base plans) for the same SKUs.
   - Set up **Play service-account credentials** and add them to RevenueCat.
   - Add the Android app in RevenueCat; copy its **public SDK key** → `…_ANDROID_KEY`.
4. **Entitlement**: create an entitlement (e.g. `pro`) and **attach all paid
   products** to it. This entitlement is what unlocks Pro.
5. **Offering**: create a default **Offering** with packages (Monthly / Annual /
   Lifetime). The paywall reads the current offering; `expo/lib/purchases/plans.ts`
   maps packages to display rows.
6. Set the three EAS env vars above for the `production` (and `preview`) environment.

## Product / offering expectations

- The in-app paywall (`app/premium.tsx`) renders whatever packages the current
  Offering returns, plus a **Restore** action and a **Manage subscription**
  (customer center) action. Keep package identifiers consistent across stores.
- Honest pricing only — show real store prices, the real renewal cadence, and no
  dark patterns. Export and core safety features stay free (see `docs/STORE_LISTING.md`).

## Testing before submission

EAS dev/preview build on a **real device** (the native SDK does not run in Expo Go
or on web):

- [ ] Paywall loads real products (price/currency from the store).
- [ ] **Sandbox purchase** (iOS Sandbox Apple ID / Play license tester) unlocks Pro;
      `isPro` flips and Pro features unlock.
- [ ] **Restore** re-grants Pro on a fresh install / second device.
- [ ] Entitlement **persists across relaunch**.
- [ ] Sign out → Pro follows the account correctly; anonymous users can still buy.
- [ ] **Web build** shows the graceful no-IAP state (no crash).
- [ ] With the platform key unset, the app runs and Pro stays locked.

See `docs/PRODUCTION_QA.md` §10 for the device sign-off checklist.

## Troubleshooting

- **"Purchases not configured" / Pro never unlocks** — the platform key is missing
  for this build's EAS environment, or you're on web/Expo Go.
- **Products don't load** — products aren't `Ready to Submit` (App Store) / active
  (Play), or aren't attached to the Offering, or store agreements are incomplete.
- **Entitlement active but app still locked** — `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT`
  doesn't match the dashboard entitlement id.
- **Sandbox purchase fails** — use a real device, a Sandbox tester account, and make
  sure paid-apps agreements are signed.
