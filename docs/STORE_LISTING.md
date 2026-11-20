# Petwell — App Store & Google Play store listing

Store-listing copy and metadata for **Petwell** (iOS App Store + Google Play).

**Matches build:** `fix/commercial-readiness-blockers` at `b56cc91`. In that build an
account is required and new Pro purchases are paused. If either changes, this file
changes with it.

**Three things here cannot be filled in from the repository:** the public URLs (§6),
the support mailbox (§6) and the reviewer account (§8). Each needs a decision only the
owner can make, and each is tracked in [`LAUNCH_REPORT_P0P1.md`](LAUNCH_REPORT_P0P1.md).
Do not paste a section into a store console while the report row it depends on is open.

This repository is **public**. Never write a reviewer password, or any other
credential, into this file.

The copy is written to match what the app actually does and to use conservative,
honest language. It avoids diagnosis claims, purity or "safest" claims, and any
"lab-verified" language that public lab evidence does not support.

---

## 1. App name & taglines

- **App name:** Petwell
  - Several other App Store apps use "PetWell" or "Pet Well" in their names. Record the
    exact name App Store Connect accepted, and use that same spelling on the public
    pages — Google checks that the deletion page names the app as the listing does.
- **Subtitle (iOS, ≤30 chars):** `Pet health, tracked with care` (29)
  - Alternates (all ≤30): `Pet care, records & triage` (26) · `Calmer pet health tracking` (26) · `Your pet's health companion` (27)
- **Promotional text (iOS, ≤170 chars):**
  > Track daily care, log symptoms for possible-cause guidance, keep one health timeline, and export a vet-ready report. Honest about what we can and can't tell you.
  - (161 chars. Promotional text can be updated anytime without a new build.)

---

## 2. Descriptions

There is **no Petwell Pro paragraph** in either description. This build sells nothing,
and a first public version has no existing customers to reassure, so a line about
paused purchases would raise a question the listing cannot answer. The paused-Pro
statement lives where a reviewer needs it: in the review notes (§8) and in the app.
If you would rather keep one line, use: *"Petwell is free to use. Paid plans are not
on sale in this version."*

### 2a. App Store — full description (≤4,000 chars)

> **Petwell is a calm, trustworthy companion for your pet's everyday health.** Keep daily care on track, log what you notice, build one clear health history, and walk into your vet visit prepared.
>
> Petwell is built on a simple promise: we tell you what we actually know, and we're honest about what we don't. Petwell offers information and guidance to help you and your veterinarian — it does not diagnose, and it is not a substitute for professional veterinary care or an emergency service.
>
> **DAILY CARE, ORGANIZED**
> A clean "Today" hub shows your pet's care checklist, recent changes, and what's coming up. Set reminders for meals, medications, refills, vaccines, and appointments.
>
> **ADAPTIVE SYMPTOM GUIDANCE (NOT A DIAGNOSIS)**
> Answer a few adaptive questions about a symptom and Petwell walks you through **possible causes** to discuss with your vet and sensible next steps — what to watch, what to log, and when to call. It does not confirm a diagnosis and does not give medication doses. If your answers suggest an emergency or possible poisoning, Petwell stops and routes you straight to professional help.
>
> **ONE HEALTH TIMELINE**
> Every log, photo, record, and reminder builds a history you can use. Track appetite, stool, itching, activity, and weight over time, spot patterns in your own logs, and keep vaccines, documents, and visit notes in one place.
>
> **FOOD INTELLIGENCE, GRADED BY EVIDENCE**
> Look up a pet food and see how strong the evidence behind it really is, on a scale from independent product-level lab reports down to "brand claim" and "no public test found." Petwell checks the FDA's recall data, ingredient transparency, AAFCO life-stage fit, and brand transparency, and separates a brand-level signal from your exact product. Most products have no public product-level lab report, and Petwell says so plainly — "No public product-level COA found" — instead of guessing. We never call a food "cleanest," "purest," or "safest." A label scan reads ingredients; it can't detect heavy metals, pesticides, or contaminants.
>
> **NATURAL-SUPPORT LIBRARY**
> Food-first supportive-care ideas and a graded list of supplements, each with an evidence grade, safety flags, and a plain note on what is and isn't known. It is educational, not a treatment plan — ask your vet before starting any product. Some store links may be affiliate links; rankings are never influenced by commissions.
>
> **VET-READY REPORTS**
> Turn your pet's history into a clear, shareable summary for your veterinarian — what changed, what you've been tracking, and the questions to ask. Exporting your data is free.
>
> **SAFETY THAT KNOWS ITS LIMITS**
> A built-in toxin reference and one-tap hotlines mean an emergency is never "handled in the app." The toxin reference is a starting point, not a complete list. Suspected poisoning or severe signs route you to your vet, an emergency clinic, the ASPCA Animal Poison Control Center, or the Pet Poison Helpline.
>
> **PRIVACY YOU CONTROL**
> Your pet's health data is yours. Export everything as JSON anytime, delete stored scan photos, or delete your account and data in Settings. Your records are isolated to your account. We do not sell your pet's photos or health data, we don't show ads or pay-to-rank recommendations, and we don't use your content to train AI models.
>
> **OPTIONAL AI, OFF BY DEFAULT**
> Petwell's AI helpers are opt-in. When you turn them on in Settings, what you submit is processed by our AI provider (OpenAI) to explain a result in plain language or help summarize a record or report — always as a draft you review, never as a source of truth for urgent safety. Document processing is a separate opt-in.
>
> **YOUR ACCOUNT**
> Petwell needs a free account (email and password) so your records are saved securely and are there when you sign in on another device.
>
> Petwell is for adults caring for their pets. It provides information and guidance only — not veterinary advice — and is not for emergencies. Always consult your veterinarian for diagnosis and treatment.

*(App Store descriptions are plain text: paste without the `**` markers. The character
count is checked in `LAUNCH_REPORT_P0P1.md`.)*

### 2b. Google Play — short description (≤80 chars)

> `Daily pet care, symptom guidance, health records & vet-ready reports.` (69)

Alternate (≤80): `Track your pet's health honestly: care, triage, records & food checks.` (70)

### 2c. Google Play — full description (≤4,000 chars)

> **Petwell is a calm, trustworthy companion for your pet's everyday health.** Stay on top of daily care, log what you notice, build one clear health history, and arrive at the vet prepared.
>
> Petwell gives you information and guidance to share with your veterinarian. It does **not** diagnose and is **not** a substitute for veterinary care or an emergency service.
>
> **Daily care & reminders**
> A simple "Today" hub with your pet's care checklist and what's coming up. Reminders for meals, meds, refills, vaccines, and appointments.
>
> **Adaptive symptom guidance — not a diagnosis**
> Answer a few questions about a symptom to see **possible causes** to discuss with your vet, what to watch, and when to call. Petwell does not confirm a diagnosis and does not give medication doses. Signs of an emergency or poisoning route you straight to professional help.
>
> **One health timeline**
> Logs, photos, records, and reminders build a history you can use — appetite, stool, itching, activity, weight — plus patterns that surface from your own logs, and a home for vaccines and documents.
>
> **Food intelligence, graded by evidence**
> See how strong the evidence behind a pet food really is, on a scale from independent product-level lab reports down to "brand claim" and "no public test found." Petwell checks FDA recall data, ingredient transparency, AAFCO life-stage fit, and brand transparency, and separates a brand-level signal from your exact product. Most products have no public product-level lab report, and we say so plainly. We never call a food "cleanest," "purest," or "safest."
>
> **Natural-support library**
> Food-first supportive-care ideas and a graded list of supplements, each with an evidence grade, safety flags, and a plain note on what is and isn't known. Educational, not a treatment plan — ask your vet before starting any product. Some store links may be affiliate links; rankings are never influenced by commissions.
>
> **Vet-ready reports**
> Turn your pet's history into a clear summary to share with your vet. Exporting your data is free.
>
> **Safety that knows its limits**
> A toxin reference and one-tap hotlines mean emergencies are never "handled in the app." The toxin reference is a starting point, not a complete list. Suspected poisoning or severe signs route you to your vet, an emergency clinic, the ASPCA Animal Poison Control Center, or the Pet Poison Helpline.
>
> **Privacy you control**
> Your pet's data is yours. Export it all as JSON anytime, delete stored scan photos, or delete your account and data in Settings. Your records are isolated to your account. We don't sell your pet's photos or health data, we don't show ads or pay-to-rank recommendations, and we don't use your content to train AI models.
>
> **Optional AI, off by default**
> Petwell's AI helpers are opt-in. When enabled in Settings, what you submit is processed by our AI provider (OpenAI) to explain a result or help summarize a record or report — always a draft you review, never a source of truth for urgent safety. Document processing is a separate opt-in.
>
> **Your account**
> Petwell needs a free account (email and password) so your records are saved securely and are there when you sign in on another device.
>
> Petwell is for adults caring for their pets. It is informational guidance only, not veterinary advice, and not for emergencies. Always consult your veterinarian.

---

## 3. Keywords & tags

### 3a. App Store keywords (≤100 chars, comma-separated, no spaces after commas)

```
pet health,dog,cat,pet care,symptom,vet records,reminders,pet food,wellness,health tracker,pet log
```
*(Avoid competitor names and unsubstantiated terms like "clean" or "toxin-free.")*

### 3b. Google Play

- Play has no keyword field — relevance comes from the title, short description, and full description above.
- **Category:** see §4a. Do not tag the app as a diagnostic or medical-device tool.

---

## 4. Category & age rating

### 4a. Category — recommended: Lifestyle (primary), Health & Fitness (secondary)

This reverses the earlier recommendation of **Medical**. Three reasons:

1. Apple reviews the Medical category against Guideline 1.4.1, which says medical apps
   that "could be used for diagnosing or treating patients may be reviewed with greater
   scrutiny." Petwell's own position is that it does neither.
2. Choosing Medical while the description says "not a medical device" is a
   contradiction a reviewer can see on one screen.
3. Pet-care trackers conventionally sit in Lifestyle, which is where an owner looks.

**Either health category triggers one more declaration.** Since March 2026 Apple asks
any app whose primary or secondary category is Health & Fitness or Medical — or that
answers "frequent" to medical or treatment information in the age rating — to declare
whether it is a regulated medical device before it can be distributed in the US, UK or
EEA. Apple counts an app as one if it has FDA clearance or registration, or UK
self-certification. Nothing in this repository suggests Petwell has any of those, so
the expected answer is **No** — confirm that before declaring. It is answered under
App Information → App Store Regulations & Permits, by the Account Holder or an Admin.

The category is the owner's decision. On Google Play choose the closest equivalent and
keep the "informational guidance, not a diagnosis, not a medical device" framing
identical to the review notes (§8).

### 4b. Age rating — expect 16+ on Apple, not 4+

The earlier target of 4+ was written against the old questionnaire. Apple replaced it
in 2025; the tiers are now 4+, 9+, 13+, 16+ and 18+. The question that decides
Petwell's rating is **Medical or Treatment Information**, which Apple defines as
"content that provides diagnoses or guidance around the management of medical
conditions or health and wellness." *Infrequent* maps to 13+ and *Frequent* to 16+.

Symptom guidance, condition protocols and a toxin reference are what Petwell is for,
so the honest answer is **Frequent**. Petwell already describes itself as an app for
adults, so 16+ costs it nothing. Answering lower risks a rejection under Guideline
2.3.6, which requires the questions to be answered honestly.

*The definition and the tier mapping above were read from Apple's age-ratings reference
on 2026-11-20 through a summarising reader, not copied verbatim. App Store Connect computes the
rating as you answer, so treat the console as the authority and record what it shows.*

**Answers to give (record what you actually submitted):**

| Question area | Answer | Why |
| --- | --- | --- |
| Parental controls · Age assurance | No | The app has neither |
| Unrestricted web access | No | Outbound links open specific pages (FDA notices, brand pages, hotlines); there is no browser |
| User-generated content | No | Care Circle shares one owner's records with people they invite. There is no feed and no public content. If the in-console definition covers any user-to-user sharing, answer Yes — it cannot push the rating above 16+ |
| Messaging and chat | No | No user-to-user messaging. The AI assistant is a user-to-AI helper; read the in-console definition before answering |
| Advertising | No | No ads and no ad SDK. Affiliate store links are disclosed where they appear |
| Violence · Sexual content · Profanity · Horror | None | |
| Alcohol, tobacco or drug use or references | Infrequent | The toxin reference has entries for alcohol, marijuana/THC, nicotine and human medicines, as things that poison pets |
| Medical or treatment information | **Frequent** | Core purpose of the app (see above) |
| Health or wellness topics | Yes | Care checklists, diet and supplement information |
| Gambling, contests, loot boxes | None | |
| In-app purchases | None in this build | Do not attach in-app purchase products to this version's submission while sales are paused |

- **Target audience (Play):** adults. State that the app is **not directed at children
  under 13** (matches the privacy policy) and do **not** opt into "Designed for
  Families."
- **Play content rating:** answer the IARC questionnaire as worded on the day; it is a
  different questionnaire from Apple's and has not been checked for this report.

---

## 5. Privacy declarations

Use this to fill Apple's **App Privacy** questionnaire and Google Play's **Data safety**
form. Petwell does not use any data for tracking or third-party advertising, and shows
no ads.

Two rows depend on how the production build is configured, which the repository does
not record. **Confirm both before filing** (report rows P1-6 and Q5):

- **Purchase History** is collected only if the RevenueCat key is set in the production
  build environment.
- **Diagnostics** are collected only if the Sentry DSN is set there.

### 5a. Apple — App Privacy questionnaire, answer by answer

**"Tracking" is No for every row.** There is no ad SDK, no advertising identifier and
no third-party analytics.

| Apple data category | Collect | Linked | Purposes | What it is in this build |
| --- | --- | --- | --- | --- |
| Contact Info → **Email Address** | Yes | Yes | App Functionality | Every user. An account is required, and the address is also used to send confirmation and reset emails |
| Identifiers → **User ID** | Yes | Yes | App Functionality | The account ID the backend assigns to each user. Apple's definition of this type covers an account ID that a developer assigns |
| User Content → **Photos or Videos** | Yes | Yes | App Functionality | Pet profile photo, scan and label photos, record images |
| User Content → **Other User Content** | Yes | Yes | App Functionality | Pet profiles, logs, records and documents, triage answers, notes, reminders, and what the user submits to AI when AI is on |
| Purchases → **Purchase History** | Yes *(if configured)* | Yes | App Functionality | Whether a Petwell Pro purchase is active. Still collected while sales are paused, because Restore and Manage remain |
| Diagnostics → **Crash Data** | Yes *(if configured)* | **No** | App Functionality | Sentry, with `sendDefaultPii: false` and user, request and content fields stripped before sending |
| Diagnostics → **Performance Data** | Yes *(if configured)* | **No** | App Functionality | Sentry traces at a 10% sample (`tracesSampleRate: 0.1`) |
| Diagnostics → **Other Diagnostic Data** | Yes *(if configured)* | **No** | App Functionality | Sentry error events that are not crashes |

**Not collected — answer No:** Location (precise or coarse), Contacts, Browsing
History, Search History, Device ID or advertising identifier, Financial Info, Sensitive
Info, Audio Data, Usage Data, Gameplay Content.

**Health & Fitness → Health is a judgment call.** Apple defines it as "health and
medical data … or any other user provided health or medical data" and does not mention
animals. Petwell stores the *pet's* health records, not the user's, so they are
declared above as Other User Content. Adding Health as well (linked, App Functionality)
is permitted over-declaration; it would tell users the app collects *their* health
data, which it does not. Decide once and keep the answer.

**The binary must agree.** The iOS privacy manifest (`ios.privacyManifests` in
`expo/app.json`) currently declares five collected types. To match the table it needs
three more — User ID, Performance Data and Other Diagnostic Data. The entries to add
are in the report (row P1-6). The required-reason APIs it lists (UserDefaults `CA92.1`,
file timestamp `C617.1`, disk space `E174.1`) are unchanged.

### 5b. Google Play — Data safety form, answer by answer

| Play question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in the app, and at the deletion URL in §6. The URL is required because the app creates accounts |

None of it is shared with third parties for their own use, and none is used for
advertising. Service providers that process data on Petwell's behalf do not count as
sharing under Play's definition.

| Data type | Collected | Shared | Required or optional | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → **Email address** | Yes | No | Required | Account management |
| Personal info → **User IDs** | Yes | No | Required | Account management |
| Photos and videos → **Photos** | Yes | No | Optional | App functionality |
| App activity → **Other user-generated content** | Yes | No | Optional | App functionality — the pet's records |
| Financial info → **Purchase history** | Yes *(if configured)* | No | Optional — only someone who already holds a purchase | App functionality |
| App info and performance → **Crash logs** | Yes *(if configured)* | No | Required | Analytics |
| App info and performance → **Diagnostics** | Yes *(if configured)* | No | Required | Analytics |

**Health and fitness → Health info:** Play defines it as information about *a user's*
health. Pet records are declared above as other user-generated content. If the form's
wording on the day reads as covering them, declare it as well — over-declaring is safe
and under-declaring is a policy violation.

Key declarations:
- **Data is not used to track users, is not sold, and is not used for advertising.**
- **AI inputs go to the AI provider (OpenAI) only when the user opts in**, through
  Petwell's backend, to return the result. The notice beside the toggle says so.
- **User controls in Settings:** export all data as JSON, turn cloud storage of scan
  photos on or off, delete stored scan photos, delete AI history, delete account and
  data.

---

## 6. URLs & contact

**None of these is live.** The pages are staged in `web-legal/`, generated by
`bun run export:legal` (from `expo/`) out of the same source the in-app screens
render, so the hosted pages and the app cannot drift. What is missing is a host and a
mailbox. Both are owner decisions: report rows P0-1 and P0-2.

| Console field | Page | State |
| --- | --- | --- |
| Support URL *(Apple, required)* | `support.html` | Blocked on a host |
| Privacy Policy URL *(Apple and Play, required)* | `privacy.html` | Blocked on a host |
| Account deletion URL *(Play Data safety, required)* | `delete-account.html` | Blocked on a host |
| Terms of Use | `terms.html` | Blocked on a host. Not a required console field while no subscription is on sale; Apple's standard licence agreement applies by default |
| Marketing URL *(Apple, optional)* | `index.html` | Optional |
| Support email | `support@petwell.app` in the code today | **Unconfirmed.** Do not publish it until someone has received a test message at that address |
| Copyright | `© 2026 Petwell` in the code today | Needs the legal name of the seller as it appears on the developer account |

**Fastest host that is already yours:** this repository is public, so GitHub Pages can
serve `web-legal/` at no cost. `.github/workflows/legal-pages.yml` does it, and only
when someone runs it by hand. The pages would then be at
`https://holisticdrbright.github.io/rork-petwell-companion/` followed by the file names
above. A domain of your own reads better on a store page and can replace it later.

**After the pages are live,** run this and paste its table into the report:

```
./scripts/check-public-urls.sh <the base URL>
```

It fetches each page anonymously as a desktop and as a phone, and fails if a page is
missing, is not HTML, still carries a draft marker, or if the deletion page lacks the
parts Google asks for.

---

## 7. "What's New" (release notes template)

**Version 1.0.0 (initial release)**
> Welcome to Petwell — a calmer way to care for your pet's health.
> - Daily care hub with reminders for meals, meds, refills, vaccines, and appointments
> - Adaptive symptom guidance that shows possible causes and next steps (never a diagnosis)
> - One health timeline: logs, trends, patterns, records, and documents in one place
> - Food intelligence graded by real evidence — honest "no public test found" when that's the truth
> - Vet-ready reports, with free data export
> - Privacy you control: export and delete built in

*(Add a support address to the last line only once the mailbox in §6 is confirmed.)*

**Subsequent updates (template):**
> What's new in this update:
> - <highlight 1 — user-facing benefit, plain language>
> - <highlight 2>
> - Fixes and refinements to make Petwell faster and steadier.
> As always: Petwell offers guidance, not a diagnosis, and is not for emergencies.

---

## 8. App Review notes

### 8a. Where the reviewer's sign-in goes

The build requires an account, and Guideline 2.1 asks for "demo account info" when an
app includes a login.

- **Apple:** App Store Connect → the version → App Review Information → tick *Sign-in
  required* → *User name* and *Password*.
- **Google:** Play Console → App content → App access → *All or some functionality is
  restricted* → add instructions and credentials.
- **TestFlight external testing**, when it is opened later: Test Information → Beta
  App Review Information has its own sign-in fields.

**The password goes in those fields and nowhere else** — not this file, not a chat,
not an issue. This repository is public.

The account must be confirmed in advance (a reviewer cannot receive its confirmation
email) and should hold one sample pet with a few logs, so no screen is empty. It must
not be anyone's real account. Creating it needs the owner's go-ahead: report row P0-3.

Reviewers routinely test account deletion, which destroys the review account. Check
that it still exists before every resubmission.

### 8b. Notes to paste (≤4,000 chars)

> **What Petwell is:** An informational pet-health companion: daily care, reminders, adaptive symptom guidance, a health timeline, food evidence lookup, and vet-ready reports. It provides guidance only. It does not diagnose, is not a medical device, and is not for emergencies. Emergencies and suspected poisoning route out to a veterinarian, an emergency clinic, the ASPCA Animal Poison Control Center (888-426-4435) and the Pet Poison Helpline (855-764-7661) by one-tap calling.
>
> **Sign-in (required):** Petwell requires an account (email and password). A review account is in the Sign-In Information fields. It is already confirmed and holds a sample pet with logs, so every screen has data. To see sign-up instead, create an account with any email address: we send a confirmation link from the sender "Petwell"; open it on the device, then sign in.
>
> **Account deletion (5.1.1(v)):** Records tab → gear icon at the top right → Settings → scroll to the bottom → "Delete account & data" → "Delete everything". Deletion is immediate and permanent: the account, pets, logs, photos, documents and reports are removed and the same sign-in stops working. If you delete the review account and need another, reply to this submission and we will supply one.
>
> **Purchases:** New Petwell Pro purchases are paused. This build offers no in-app purchase and locks nothing behind payment; current features and data export are free. Settings → Petwell Pro offers nothing to buy; it only lets someone who already holds a purchase restore or manage it. No in-app purchase products are submitted with this version.
>
> **AI (optional, off by default):** AI helpers are off until the user turns them on in Settings → AI; document processing is a separate toggle. The notice beside the toggle states that submitted text or files are sent to our AI provider (OpenAI) through our backend. With AI off, AI buttons show "Turn on AI features in Settings → AI to use this." and make no network call. AI never diagnoses or prescribes, and the emergency and poison routing is deterministic and shows regardless of model output. No model API key ships in the app.
>
> **Permissions:** Camera — to photograph a pet-food label (Scan tab → Food Intelligence → Photo). Photos — to choose a pet photo, a label image or a record image. Notifications — local reminders the user creates (Settings → Reminders). There is no push-notification server.
>
> **Privacy:** Users can export all data as JSON, delete stored scan photos, delete AI history, and delete their account in the app. We do not sell data, show ads or track users. Crash reporting runs with personal data stripped.
>
> **Food and supplement claims are intentionally conservative:** Petwell grades foods and supplements by the strength of public evidence and says "No public product-level COA found" when no independent lab report exists. It never labels a product "cleanest," "purest," or "safest." Store links that are affiliate links are labelled as such.

**Add this paragraph only if the telehealth entry is still in the submitted build**
(report row P1-4 recommends removing the entry instead):

> **Vet telehealth:** This entry is labelled "coming soon" and offers only a "Notify me when booking opens" request. No telehealth service is provided in this version.

---

## 9. Assets

### 9a. Screenshots

Generated from the running app — `cd expo && bun run screenshots`. See
`docs/store-screenshots/README.md` for the full command and what it checks. The
generator fails on superlatives, diagnosis claims and demo scaffolding, so a
screenshot can't make a claim the app itself refuses to make.

**Regenerate them from the fixed build before uploading.** The sign-in gate, the Pro
screen and the health score all changed. Do not include a screenshot of the Pro screen
or of anything labelled "coming soon."

You only need the phone sets: the build has `ios.supportsTablet: false`, so Apple won't
ask for iPad screenshots and shouldn't be given them.

Curate before uploading — the floating "Log / Scan / Ask" button overlaps the care
checklist on the Today shot, and Apple shows the first three in search results, so
lead with the strongest.

### 9b. Icon & splash

| Asset | File | Current | Needed |
| --- | --- | --- | --- |
| App icon | `expo/assets/images/icon.png` | 1024×1024 | ✅ correct |
| Android adaptive icon | `expo/assets/images/adaptive-icon.png` | — | foreground art with the safe zone respected (the outer ~18% gets masked) |
| Splash | `expo/assets/images/splash-icon.png` | **512×512** | ⚠️ ask the designer for a **1024×1024** export |

The splash asset is a polish item. At `resizeMode: "contain"` a 512px image is
upscaled on large phones, so it can look soft. It won't fail review.

---

## 10. Pre-submission checklist (metadata)

- [ ] Public pages are live and `./scripts/check-public-urls.sh` passes against them (§6).
- [ ] Someone has received a test message at the support mailbox (§6).
- [ ] The review account exists, is confirmed, holds a sample pet, and its password is only in the console (§8a).
- [ ] No in-app purchase product is attached to this version while sales are paused.
- [ ] Subtitle ≤30, promo text ≤170, App Store keywords ≤100, Play short description ≤80, full descriptions ≤4,000.
- [ ] App Privacy (Apple) and Data safety (Play) match §5 **and** the production build's configuration; Tracking is No.
- [ ] The iOS privacy manifest in `expo/app.json` matches §5a.
- [ ] Category set per §4a, and the regulated-medical-device question answered "No".
- [ ] Age rating answered per §4b; the rating the console computed is recorded here: `____`.
- [ ] Screenshots regenerated from the fixed build (§9a).
- [ ] Copyright carries the seller's legal name.
- [ ] Review notes (§8b) pasted, with the telehealth paragraph included or omitted to match the build.
