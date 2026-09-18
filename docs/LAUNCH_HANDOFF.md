# Petwell — launch handoff

**Everything left before Petwell can ship, in the order it should be done.** Each
item is here because it needs an account, a credential, a device, a licensed
professional, or a business decision — not because the code isn't written. Where
a command exists, it's given exactly; run all `bun`/`npx` commands from `expo/`
unless the item says otherwise.

Last updated 2026-09-18.

---

## Where things actually stand

| | |
| --- | --- |
| Live backend | Supabase project **`dxcuuguorvbqoiybefes`** — schema at migration 0036, 11,227 food products, 1,411 brands, 101 verified FDA recalls, 43-entry symptom KB, 52 marketplace products, 20 breed nutrition rows |
| Code gates | typecheck, lint, 9 unit suites (465 checks), secret-hygiene scan, Playwright browser smoke test — all green in CI |
| Users | **0.** Nobody has signed up yet, including you (item 1) |
| Biggest remaining risk | Nothing has run on a real iPhone or Android device (item 8) |

Two things are true at once: the app is code-complete and well-tested, and it has
never been installed on a phone. Item 8 is the one that can still surprise you.

---

## Blocking — do these in order

### 1. Create your own account in the app

Everything else is easier once a real account exists, and the admin surfaces need
one. Your email `brandonbright@gmail.com` is already wired as the admin
identity (migration 0025 derives `is_admin` from `auth.users.email` — the flag
cannot be set from the client), so signing up with that address gives you the
admin screens automatically.

**Do not** create a test user with that address from the Supabase dashboard — it
would occupy the email and block your real signup.

### 2. Point a build at the live backend

```bash
cd expo
cat > .env <<'ENV'
EXPO_PUBLIC_SUPABASE_URL=https://dxcuuguorvbqoiybefes.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase → Settings → API>
ENV
bun run verify-env     # must print PASS before you go further
```

For real builds the same values go in EAS, never in the repo:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://dxcuuguorvbqoiybefes.supabase.co"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>"
eas secret:create --name EXPO_PUBLIC_SENTRY_DSN --value "<sentry dsn>"          # optional
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "<rc ios key>"   # item 5
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "<rc key>"   # item 5
```

`verify-env` runs automatically on every EAS build (`eas-build-post-install`), so
a production build with missing, placeholder, or server-side keys **fails at
build time** instead of shipping.

> Only the anon/publishable key belongs in `EXPO_PUBLIC_*`. The service-role key
> goes in GitHub Actions (item 4) and Supabase Edge Function env vars (item 3) —
> never in the app. CI enforces this: `./scripts/check-secret-hygiene.sh`.

### 3. Set the importer secret on the edge function

The `bulk-import` edge function is deployed and **inert** until `IMPORT_SECRET` is
set — without it every request is rejected, which is why it's safe to leave
deployed. Set it when you next want to run a large import:

Supabase dashboard → Edge Functions → `bulk-import` → Secrets → add
`IMPORT_SECRET` = a long random string. Generate one with `openssl rand -hex 32`.

### 4. GitHub Actions secrets, so the data keeps refreshing

`.github/workflows/data-refresh.yml` re-imports FDA recalls weekly and Open Pet
Food Facts monthly. Both jobs **skip silently** until these exist:

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://dxcuuguorvbqoiybefes.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key |

Everything those jobs import lands in `admin_review_queue` — nothing reaches
users unreviewed.

### 5. RevenueCat + store products (only needed to charge money)

The purchase code is complete and inert without keys. You need:

1. Apple Developer ($99/yr) and Google Play ($25 once) accounts.
2. Subscription products created in App Store Connect and Play Console.
3. A RevenueCat project with an entitlement and offerings mapped to those
   products. The app looks for an entitlement called **`Petwell Pro`** by
   default; to use a different name, set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT`
   to match what you created in RevenueCat.
4. The RevenueCat API keys as EAS secrets (item 2).

Then test purchases on a **real device** with a sandbox Apple ID / a Play
license-tested account. Sandbox IAP cannot be tested in Expo Go, on web, or in
CI — only on a device.

The free tier, including full data export, works without any of this.

### 6. Email delivery (SMTP) and the confirm-email decision

Supabase's built-in mailer is rate-limited and not for production. Configure
custom SMTP (Resend, Postmark, SendGrid, or SES) under Authentication → Emails →
SMTP, then turn **Confirm email ON** before a public launch — without it anyone
can register an address they don't own. The app already handles both states.

### 7. Host the legal pages and fill in the store URLs

The pages are generated from the same source the in-app screens render, so they
can't drift:

```bash
cd expo && bun run export:legal     # → web-legal/{privacy,terms,support,delete-account}.html
```

Host `web-legal/` anywhere static, then put the URLs into `docs/STORE_LISTING.md`
§6 and the store consoles. Apple requires the Terms/EULA URL for auto-renewing
subscriptions; Google requires the account-deletion URL.

### 8. Device QA — the real risk

Build a development client and use the app on a real phone for an hour:

```bash
cd expo
eas build --profile development --platform ios      # or android
```

Nothing in this repo has run on a device. Specifically check:

- **Notifications**: reminders fire, and a recall alert opens the FDA page when
  tapped (the tap handler is wired but has only been tested in a browser).
- **Camera and photo picker**: the permission strings are set; the flow itself
  needs a device.
- **In-app purchase sandbox** (item 5).
- **Dynamic Type at the largest setting** and VoiceOver on the Today, Ask, and
  toxin screens. The labels and roles are in place; how they *read aloud* is a
  judgement call only a person can make.

### 9. Veterinary review — needs your cousin, or any licensed vet

Two datasets ship labelled "pending vet review" and should carry a real
reviewer's name before launch. Both round-trip through a spreadsheet.

**Toxins (57 entries):**

```bash
cd expo
bun run review:export-toxins                      # → docs/review/toxin-review.csv
# vet fills: approve (yes/no), reviewer_name_credentials, review_date (YYYY-MM-DD),
#            requested_edits
bun run review:apply-toxins ../docs/review/toxin-review.filled.csv
```

**Symptom knowledge base (43 entries, lives in the live database):**

```bash
cd expo
SUPABASE_URL=https://dxcuuguorvbqoiybefes.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  bun run review:export-kb                        # → docs/review/symptom-kb-review.csv
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  bun run review:apply-kb ../docs/review/symptom-kb-review.filled.csv
```

Both apply scripts **refuse to approve** a row that has requested edits, a
missing reviewer name, or a missing date, and list what they held back. An
unreviewed entry keeps its honest "not individually vet-reviewed" label — the
app is safe to ship without this, it just claims less.

### 10. Store submission

`docs/STORE_LISTING.md` has the copy, the keyword list, the review notes, and —
filled in for you — the exact Apple App Privacy (§5a) and Play Data Safety (§5b)
answers, plus the age-rating answers to record (§4b, recommending 4+/Everyone).

Screenshots are generated from the running app:

```bash
cd expo
bun run e2e:build
node e2e/serve.mjs dist-web 8099 &
bun run screenshots      # → docs/store-screenshots/<device>/
```

The generator fails if any captured screen contains "cleanest", "safest", a
diagnosis claim, or demo scaffolding. **Curate before uploading** — see
`docs/store-screenshots/README.md`. You only need the phone sets; the build has
`supportsTablet: false`.

One asset gap: the splash image is 512×512 where the icon is 1024×1024. Ask the
designer for a 1024×1024 splash export. It won't fail review; it just looks soft
on large phones.

---

## Business decisions only you can make

### 11. Your affiliate links

You mentioned Standard Process, Integrative Peptides, and Wizard. The columns are
live and empty. Send me the links, or set them directly:

```sql
update public.marketplace_products
   set affiliate_url = '<your link>'
 where slug = '<product-slug>';

update public.food_brands
   set affiliate_url = '<your link>', affiliate_program = '<program name>'
 where name = '<brand>';
```

The link chain is affiliate → the brand's own product page → a retailer
fallback, so every product already has a working link without them. Wherever an
affiliate link renders, the FTC disclosure renders too — enforced by a test, not
by memory. **Rankings are never adjusted for commission**, including for your own
products: PetTides and Wizard sit low precisely because their evidence is
crowdsourced and unverified, and that stays true.

### 12. Telehealth — your cousin

Telehealth is built and deliberately shows "coming soon". It flips to live the
moment one active practitioner row exists — no code change, no deploy:

```sql
insert into public.vet_practitioners
  (display_name, credentials, bio, specialties, species, timezone, booking_url, active)
values
  ('<her name>', 'DVM', '<short bio>',
   array['<e.g. dermatology>'], array['dog','cat'], 'America/New_York',
   '<scheduling link, or null>', true);
```

Before flipping it, decide: scheduling, pricing, what she will and won't advise
on, and how a request reaches her. Scheduling fields are locked to the
practitioner side (migration 0033) so an owner can't set their own appointment
time or meeting link.

### 13. Retire the old Supabase project

Project **`iwrqvrfklmyppfhrikfb`** (org "The Holistic Approach") is active again
and holds an older copy of this schema. Everything of value was ported into the
live project in September and verified by checksum. Two live databases with the
same shape is a split-brain waiting to happen — a future session, or a stale
`.env`, can write to the wrong one.

**Recommendation: pause it** (reversible, keeps the data) and delete it once
you're confident. Dashboard → that project → Settings → General → Pause.

### 14. The four COA sources

`admin_review_queue` has four open items — Open Farm, Stella & Chewy's, Natural
Balance, and Wellness — each with the page, what to pull, and how to grade it.
These are the brands that publish real per-lot or per-product test results, so
they're the fastest route from "no public product-level COA found" to actual
evidence in the app. The URLs are from June and could not be re-verified from the
build environment; each task says to check the link first.

---

## Deliberately deferred (not blockers)

| | Why it waits |
| --- | --- |
| Bundling `expo-camera` for in-app barcode scanning | Needs a development build to verify; the barcode path already works by typing a number, and the label path works by photo or paste |
| Tablet layouts | `supportsTablet: false`; phone-first launch |
| Marketplace "live" flip | Waiting on your affiliate links (item 11) |
| Inbound email handling for `support@petwell.app` | Needs the domain and a mail provider |
| Health-score share card | Nice-to-have, no launch dependency |
| Native OCR text extraction | The label path currently accepts a photo or pasted text; a native OCR adapter is an enhancement, and the code already degrades honestly without one |

---

## Already done — don't redo these

- Schema, RLS, and admin lockdown through migration 0036, applied and verified on
  the live project. Client-side privilege escalation was found and closed.
- All catalog data imported: food products, brands, FDA recalls, symptom KB,
  holistic library, marketplace, Standard Process line.
- Duplicate brand rows merged (1,805 → 1,411) so brand-level recall matching
  actually fires.
- Onboarding dead-end fixed — finishing onboarding used to drop you back at step 1.
- Legal copy, privacy manifest, permission strings, store metadata and answers.
- CI: typecheck, lint, 9 unit suites, secret hygiene, and a browser smoke test
  that drives onboarding → add pet → log symptom → food label → vet report.
