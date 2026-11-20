# Petwell launch report — P0 and P1

**Date:** 2026-11-20
**Build reviewed:** `fix/commercial-readiness-blockers` at `b56cc91` (draft PR #1; its `verify` and `e2e` checks were green at that commit). Codex added `4c046a2` while this report was being written. It changes two AI server files and nothing cited here, and it is merged into this branch.
**Scope:** store metadata, public pages, high-risk content, and owner testing. App fixes, Supabase and the TestFlight build belong to Codex and were not touched.
**Proposed diff:** [`fix/commercial-readiness-blockers...claude/trusting-euler-mza9p0`](https://github.com/HolisticDrBright/rork-petwell-companion/compare/fix/commercial-readiness-blockers...claude/trusting-euler-mza9p0). It is stacked on the fixed build because the copy describes that build. Merge PR #1 first.

**Priorities.** P0 must be closed before the app is submitted for review or shown to outside testers. P1 must be closed before public release, or carries a real risk of rejection.

**Type** separates three things the handoff asked to keep apart:
*Missing input* — a decision or a fact only the owner has. *Verified defect* — something wrong in the repository, with the line that proves it. *Not verified* — something this lane could not check, and why.

---

## 1. What was not verified

Read this before the tables. Four things could not be checked from here.

| Not verified | Why | What it would take |
| --- | --- | --- |
| **The App Store Connect record** (version status, TestFlight groups, App Privacy, App Information, review metadata) | This lane has no access to App Store Connect or Play Console | 15 minutes with the checklist in §6 |
| **Whether any public URL resolves** | The session's network policy allows two unrelated hosts. Every candidate URL failed at DNS (§5). That says nothing about the sites | Run `scripts/check-public-urls.sh` from any machine with normal internet |
| **Google's three policy pages** (account deletion, Data safety, Health apps) | Same network policy. The Play requirements in §8 come from search summaries of Google's help pages, not from the pages | Read them in Play Console while filling the forms |
| **The live database and a real iPhone** | Database read access was refused in this lane; device testing is the owner's (§9) | The iPhone script |

Four Apple pages were read directly on 2026-11-20 (§12). Where a quotation is verbatim it is in quotation marks. Where the reader returned a summary of a long page, the text says so. The medical-device rule and the age-rating deadline come from search summaries of Apple's pages.

---

## 2. P0 — close before submitting or inviting outside testers

| ID | Item | Type | Owner |
| --- | --- | --- | --- |
| P0-1 | Public pages are not hosted anywhere | Missing input | Brandon |
| P0-2 | Support mailbox is unconfirmed, on a domain not shown to be yours | Missing input | Brandon |
| P0-3 | App Review needs a working reviewer account; none exists | Missing input | Brandon, Codex |
| P0-4 | Review notes described a build that needs no account | Verified defect, fixed here | Brandon to approve |
| P0-5 | Privacy policy and terms described the old app | Verified defect, draft fix here | Brandon, counsel, Codex |
| P0-6 | Six content lines that could mislead an owner about safety | Verified defect | Codex, veterinarian |
| P0-7 | App Store Connect record not inspected | Not verified | Brandon |
| P0-8 | iPhone test of the new build not yet run | Not verified | Brandon, Codex |

### P0-1 · Public pages are not hosted anywhere

- **Status:** Open. The pages are staged and pass every check that can be run without a host. No host is chosen.
- **Evidence:** The repository had no `CNAME`, no Pages workflow and no `gh-pages` branch, and `docs/STORE_LISTING.md` lines 258–263 at `b56cc91` still read `https://<your-domain>/…`. Sixteen candidate URLs on five hosts were tried and none could be reached from here (§5). The staged pages in `web-legal/` were served over local TLS and checked: five pages, HTTP 200 for desktop and phone, all OK. At iPhone 14 size they have no horizontal scroll and 16px body text ([deletion page](launch-report/staged-delete-account-iphone.jpg), [support page](launch-report/staged-support-iphone.jpg)).
- **Next action:** Choose a host and approve publication. The fastest host that is already yours is GitHub Pages, because this repository is public: Settings → Pages → Source "GitHub Actions", then run the "Publish legal pages" workflow once this branch is on `main`. It only runs by hand. Then run `./scripts/check-public-urls.sh <base URL>` and paste its table into §5.
- **Owner:** Brandon for the decision and the publication. Anyone can run the check.

### P0-2 · Support mailbox is unconfirmed, on a domain not shown to be yours

- **Status:** Open. Nothing was changed, because replacing one unverified address with another would not help.
- **Evidence:** `support@petwell.app` is the address in `expo/lib/legal/content.ts`, in `expo/lib/config.ts:97`, and on every staged page. Nothing in the repository or the handoff shows that `petwell.app` is yours, and a search finds several unrelated companies and apps trading as PetWell. The only domain shown to be under your control is `ailongevitypro.app`, which `docs/BLOCKER_FIXES.md` records as a verified *sending* domain. That does not show an inbox exists. This address receives account-deletion requests, so a wrong one sends a user's account email to a stranger.
- **Next action:** Name a mailbox a person reads. Send it a message from an outside account and wait for a human reply. Then change the address in `content.ts` and `config.ts` (they are separate today and can disagree), check the `EXPO_PUBLIC_SUPPORT_EMAIL` build variable, and re-run `bun run export:legal`.
- **Owner:** Brandon. Codex for the `config.ts` line, which is app code.

### P0-3 · App Review needs a working reviewer account; none exists

- **Status:** Open. Not created, because the handoff requires your authorization first.
- **Evidence:** The production build shows a sign-in gate instead of the tabs (`expo/app/(tabs)/_layout.tsx:43,46`; [screenshot](launch-report/app-1-account-required-iphone.jpg)). Guideline 2.1(a) says: "include demo account info (and turn on your back-end service!) if your app includes a login." Sign-up sends a confirmation link by email, and a reviewer is not expected to use their own mailbox, so the review account has to be confirmed in advance. The demo-profile shortcut is off in production (`expo/lib/config.ts:68`), so there is no route in without an account.
- **Next action:** Authorize a dedicated account on an address you control. Confirm it, add one sample pet with a few logs, and check that it signs in on the TestFlight build. Type the password only into App Store Connect → App Review Information → Sign-in required. Reviewers test account deletion, which destroys the account, so check it still exists before every resubmission.
- **Owner:** Brandon to authorize and enter the password. Codex to create and seed it.

### P0-4 · Review notes described a build that needs no account

- **Status:** Fixed on this branch; needs your approval before pasting.
- **Evidence:** `docs/STORE_LISTING.md:295` at `b56cc91` told reviewers "No account is required to explore" and to use "Try a demo profile". Both are false for this build. Line 307 invited a demo password to be written into a file in a public repository.
- **Next action:** Read `docs/STORE_LISTING.md` §8b. Paste it once P0-3 is closed. Include the telehealth paragraph only if P1-4 is not done.
- **Owner:** Claude wrote it. Brandon approves and pastes.

### P0-5 · Privacy policy and terms described the old app

- **Status:** Draft fix on this branch. Four facts need your confirmation (§3, Q2–Q5), and counsel has not reviewed either document.
- **Evidence**, all in `expo/lib/legal/content.ts` at `b56cc91`:

| Line | The policy or terms said | The build does |
| --- | --- | --- |
| 58 | "Without an account, the app can run in local mode" | Requires an account |
| 58 | "Scan photos are stored only if you allow it" | Stores them by default (`expo/services/privacyService.ts:24`) |
| 71 | Users can "opt out of model/photo training, and turn off personalized insights or research sharing" | Settings has one privacy toggle, for photo storage (`expo/app/settings.tsx:47`) |
| 52 | No training "when you opt out of training" | There is no such setting, so the sentence implied training by default |
| 136 | "Petwell Pro is offered … monthly or yearly … or a one-time lifetime purchase" | Sells nothing (`PRO_SALES_ENABLED = false`) |
| 28 | Closing line: "a general template … should be reviewed by qualified counsel before public launch" | Printed in the app and on both staged pages |
| — | Named two providers | Also uses Sentry, RevenueCat and Resend, and sends barcodes to Open Pet Food Facts from the device (`expo/lib/food/barcode.ts:17`) |
| — | No section on retention or deletion | Guideline 5.1.1(i), as summarised by the reader, requires the policy to say how a user can request deletion |

- **Next action:** Answer Q2–Q5. Have counsel read the new text. Codex merges `content.ts` with the app build, so the in-app screens and the hosted pages stay identical.
- **Owner:** Brandon and counsel. Codex for the merge.

### P0-6 · Six content lines that could mislead an owner about safety

- **Status:** Open. Findings and proposed edits are in §7.
- **Evidence:** Six lines, each verified at `b56cc91`: a treat checker that reports "Okay occasionally" whenever nothing matched its list; a protocols screen subtitled "vet-safe" with no veterinary review behind it; two toxin entries that imply a safe amount; a fasting instruction given to every species; and a triage result that shows "insulin dysregulation" for a low-energy pet.
- **Next action:** Apply the proposed edits. Each one only makes the copy more cautious, so none has to wait for a veterinarian. Review by a veterinarian follows (P1-1).
- **Owner:** Codex for the edits. A licensed veterinarian for sign-off.

### P0-7 · App Store Connect record not inspected

- **Status:** Not verified.
- **Evidence:** The only App Store Connect facts available here are in the repository: app ID `6786129678` in `expo/eas.json`, bundle ID `com.holisticdrbright.petwell`, version `1.0.0`, and build numbers managed remotely by EAS.
- **Next action:** Walk the checklist in §6 and fill in the blanks. Change nothing while looking.
- **Owner:** Brandon, or anyone you give access.

### P0-8 · iPhone test of the new build not yet run

- **Status:** Not verified.
- **Evidence:** PR #1's checks cover the web build only. `docs/BLOCKER_FIXES.md` lists native QA on the next TestFlight build as outstanding. Email links, the camera, notifications and store purchases behave differently on a phone.
- **Next action:** Run the script in §9 on the next TestFlight build and record the results in its table.
- **Owner:** Brandon. Codex supplies the build.

---

## 3. Questions for Brandon

These are facts and decisions nobody else can supply. Each blocks the row shown.

| # | Question | Blocks |
| --- | --- | --- |
| Q1 | Which mailbox is the real support address, and who reads it? Do you own `petwell.app`? | P0-2 |
| Q2 | Does Petwell use, or plan to use, users' photos, records or AI conversations to train models? The draft policy says it does not, without conditions. | P0-5 |
| Q3 | Can you meet "we will delete the account within 30 days" for emailed requests? | P0-5, P1-7 |
| Q4 | How long does your Supabase plan keep backups? The drafts say "up to 30 days". | P0-5 |
| Q5 | Are the Sentry DSN and the RevenueCat key set in the production build environment? Each one switches privacy answers on or off. | P0-5, P1-6 |
| Q6 | Where should the pages live: GitHub Pages now, or a domain of your own? | P0-1 |
| Q7 | May a dedicated reviewer account be created, and on which address? | P0-3 |
| Q8 | What is the seller's legal name, for the copyright line and the developer account? Has counsel seen the policy and terms? | P0-5, §10 |
| Q9 | Category (Lifestyle is recommended over Medical) and the age-rating answer of "Frequent"? | P1-5 |
| Q10 | Which licensed veterinarian will review the clinical content? | P1-1 |
| Q11 | Is Android part of this launch? Is the Play developer account personal or an organization? | §8 |

---

## 4. P1 — close before public release

| ID | Item | Type | Owner |
| --- | --- | --- | --- |
| P1-1 | No veterinary sign-off exists for any clinical dataset | Missing input | Brandon, veterinarian |
| P1-2 | Sign-up screen has no link to the Privacy Policy or the Terms | Verified defect | Codex |
| P1-3 | Developer-facing text ships on the barcode screen | Verified defect | Codex |
| P1-4 | "Coming soon" and "not available yet" screens in a 1.0 build | Verified defect, decision | Brandon, Codex |
| P1-5 | Age rating and category guidance was out of date | Verified defect, fixed here | Brandon |
| P1-6 | Privacy declarations under-declare three data types | Verified defect | Codex, Brandon |
| P1-7 | No operator procedure for deletion requested by email | Missing input | Codex, Brandon |
| P1-8 | About thirty content lines need softening | Verified defect | Codex, veterinarian |
| P1-9 | Account emails come from a domain unrelated to the brand | Decision | Brandon |
| P1-10 | `scripts/prod-bootstrap.sh` still pushes every migration blindly | Verified defect | Codex |
| P1-11 | Other App Store apps are already named PetWell | Not verified | Brandon, counsel |

### P1-1 · No veterinary sign-off exists for any clinical dataset

- **Status:** Open. Nothing here has been marked reviewed, and nothing should be until a veterinarian has done it.
- **Evidence:** `expo/lib/toxins/reviewStatus.ts:21` holds an empty sign-off map with the comment "No entries have completed veterinary review yet." Every bundled symptom entry is `needs_vet_review`. Two recording paths are unsafe for a real review: any admin can mark an entry "vet-reviewed" under their own user ID with no credential check (`expo/services/symptomKbService.ts:177`), and the import script demands a reviewer's name, then stores only the status and the date (`expo/scripts/apply-symptom-kb-review.ts:91–101`).
- **Scope for the reviewer:**

| Dataset | Size | File |
| --- | --- | --- |
| Toxin entries | 57 | `expo/lib/toxins/data.ts` |
| Triage modules | 10, plus a generic one | `expo/lib/triage/modules.ts` |
| Condition protocols | 10 | `expo/lib/integrative/conditions.ts` |
| Programs | 7 | `expo/lib/integrative/programs.ts` |
| Symptom knowledge entries | 43 | `expo/lib/symptomKb/data.ts` |
| Graded products | 72 | `expo/lib/protocols/productCatalog.ts` |
| Product safety rules | 10 | `expo/lib/protocols/productSafety.ts` |

- **Next action:** Engage a licensed veterinarian. Record each sign-off with a name, a licence number and a date. Fix the two recording paths first. Until then no screen may say "reviewed" or "vet-safe".
- **Owner:** Brandon to engage the reviewer. Codex for the recording paths.

### P1-2 · Sign-up screen has no link to the Privacy Policy or the Terms

- **Status:** Open.
- **Evidence:** `expo/app/account.tsx:198–201` ends "see our Privacy Policy." as plain text. In the production build the screen contains no link with that text and no mention of the Terms ([screenshot](launch-report/app-2-sign-in-iphone.jpg)). The only route to either document is Settings, which sits behind the sign-in gate; its sole entry point is the gear on the Records tab (`expo/app/(tabs)/records.tsx:257`). Guideline 5.1.1(i), as summarised by the reader, requires the policy link "within the app".
- **Next action:** Link "Privacy Policy" to `/privacy-policy` and add "By creating an account you agree to the Terms of Use", linked to `/terms`. Both routes already render for a signed-out user; that was checked on the production web build.
- **Owner:** Codex.

### P1-3 · Developer-facing text ships on the barcode screen

- **Status:** Open.
- **Evidence:** `expo/app/food-scan.tsx:264–266` shows every user: "Live camera barcode scanning needs a dev build with expo-camera (see README)." The camera permission text in `expo/app.json` also says the camera is used to "scan barcodes", which this build cannot do.
- **Next action:** Replace the hint with "Type the barcode number printed on the package." Remove "and scan barcodes" from the camera permission text, or ship the scanner.
- **Owner:** Codex.

### P1-4 · "Coming soon" and "not available yet" screens in a 1.0 build

- **Status:** Open; needs a decision.
- **Evidence:** The Today tab lists "Vet telehealth — Coming soon" (`expo/app/(tabs)/index.tsx:75`). Settings lists "Vet telehealth (coming soon)" and, under Support, "Talk to a vet" (`expo/app/settings.tsx:386,411`). Both open a screen with a "COMING SOON" badge and a "Notify me when booking opens" button. Settings also offers "See Petwell Pro plans" (line 270), which opens "Pro plans are not available yet" ([screenshot](launch-report/app-3-pro-paused-iphone.jpg)).
- **Why it matters:** Unfinished features are a common reason for rejection under Guideline 2.1, App Completeness. That is an assessment from experience, not a quoted rule. Separately, "Talk to a vet" under Support promises a service that does not exist.
- **Next action:** Recommended: remove the telehealth entries from this version, and rename the Pro row so it does not promise plans. Whatever is decided, attach no in-app purchase product to this version's submission.
- **Owner:** Brandon decides. Codex changes the build.

### P1-5 · Age rating and category guidance was out of date

- **Status:** Fixed in `docs/STORE_LISTING.md` §4; the console has the final word.
- **Evidence:** The listing targeted 4+ and recommended the Medical category (lines 126 and 130 at `b56cc91`). Apple's current age-ratings reference, as returned by a summarising reader, defines Medical or Treatment Information as "content that provides diagnoses or guidance around the management of medical conditions or health and wellness" and maps *infrequent* to 13+ and *frequent* to 16+. Since March 2026 Apple also asks apps in the Health & Fitness or Medical categories, or with frequent medical information, to declare whether they are a regulated medical device ([Apple's notice](https://developer.apple.com/news/?id=nyqbfz1y)).
- **Next action:** Answer "Frequent" and expect 16+. Record the rating the console computes. Decide the category. Answer the medical-device question "No".
- **Owner:** Brandon.

### P1-6 · Privacy declarations under-declare three data types

- **Status:** The answers are corrected in `docs/STORE_LISTING.md` §5. The binary's privacy manifest is not, because `expo/app.json` is build configuration.
- **Evidence:** The manifest declares five collected types. The build also assigns every user an account ID, which Apple's definition of *User ID* covers. Sentry is initialised with `tracesSampleRate: 0.1` (`expo/lib/sentry.ts:28`), which is *Performance Data*, and it sends non-crash errors, which is *Other Diagnostic Data*. Separately, `expo-location` is a dependency (`expo/package.json:59`) that no file imports, so location code is linked into a binary whose label says location is not collected.
- **Next action:** Add the three entries in §11 to the manifest. Remove `expo-location`. Answer Q5, then file the label from §5a.
- **Owner:** Codex for the manifest and the dependency. Brandon files the label.

### P1-7 · No operator procedure for deletion requested by email

- **Status:** Open.
- **Evidence:** The deletion function deletes only the signed-in caller; its own comment says "Never accept an owner ID from the body" (`supabase/functions/delete-account/handler.ts:20`). The staged public page promises deletion by email to anyone who cannot open the app. File cleanup across four storage buckets lives inside that function (`index.ts:9`), so deleting a user from the Supabase dashboard may leave files behind. Whether the storage-guard migration covers that case was not verified.
- **Next action:** Write a short operator procedure, or an admin script that reuses the same cleanup. Confirm the 30-day commitment (Q3).
- **Owner:** Codex. Brandon for the commitment.

### P1-8 · About thirty content lines need softening

- **Status:** Open. The list is in §7.
- **Evidence:** Each line is quoted with its file and line number. Six of them are in the product catalogue added in October, including "which is why it can be given alongside antibiotics" and "Fine on a surface graze".
- **Next action:** Apply the proposed edits, then include these files in the veterinary review.
- **Owner:** Codex. A licensed veterinarian.

### P1-9 · Account emails come from a domain unrelated to the brand

- **Status:** Open; needs a decision.
- **Evidence:** `docs/BLOCKER_FIXES.md` records that Resend verified `ailongevitypro.app`, and the handoff gives the sender as Petwell at that domain. A new user's confirmation email therefore arrives from a name they know and a domain they do not.
- **Next action:** Either keep it, and keep the sentence on the staged support page that tells users what to expect, or plan a move to a Petwell domain. The iPhone test records whether the email reaches the inbox or the spam folder.
- **Owner:** Brandon.

### P1-10 · `scripts/prod-bootstrap.sh` still pushes every migration blindly

- **Status:** Open. Not changed here, because Supabase tooling is outside this lane.
- **Evidence:** Line 44 runs `supabase db push`. The migrations folder now mixes numbered files (`0001`–`0038`) with three timestamped ones, and `docs/BLOCKER_FIXES.md` warns against pushing the numbered set.
- **Next action:** Guard or retire the script.
- **Owner:** Codex.

### P1-11 · Other App Store apps are already named PetWell

- **Status:** Not verified.
- **Evidence:** A search returns several live listings, among them "Pet Well: AI Vet Health Tracker", "PetWell AI: Pets Health & Care" and "PetWell HK", and companies trading under the name.
- **Next action:** Record the exact name App Store Connect accepted. Decide with counsel whether the name needs something to distinguish it.
- **Owner:** Brandon and counsel.

---

## 5. Public URLs tested

**Result: nothing could be tested from here.** Every lookup failed with `getaddrinfo ENOTFOUND`, which is how this session's network policy refuses a host. It is not evidence that a site is missing.

| Host | Paths tried | Result |
| --- | --- | --- |
| `petwell.app`, `www.petwell.app` | `/`, `/privacy`, `/terms`, `/support`, `/delete-account` | No DNS answer |
| `ailongevitypro.app`, `www.ailongevitypro.app` | `/`, `/privacy`, `/support`, `/delete-account` | No DNS answer |
| `holisticdrbright.github.io` | `/`, `/rork-petwell-companion/`, three guessed page paths | No DNS answer |

A separate environment that allows these hosts exists for this repository, but a running session cannot move to it. Start a new session there, or run the checker yourself.

**Staged pages, checked locally** with `scripts/check-public-urls.sh` against a local TLS server:

| Page | HTTP (desktop / phone) | Result |
| --- | --- | --- |
| Site root | 200 / 200 | OK |
| Privacy | 200 / 200 | OK |
| Terms | 200 / 200 | OK |
| Support | 200 / 200 | OK |
| Delete account | 200 / 200 | OK |

The same checker fails the pages as they stand on `main`: the privacy and terms pages for the template line, and the deletion page for not saying what is kept. That is the proof the checker can fail.

**Paste the live result here once a host exists:**

```
(output of ./scripts/check-public-urls.sh <base URL>)
```

---

## 6. App Store Connect — inspection checklist

Look, record, change nothing. Leave existing listings and tester assignments as they are.

| Where | Field | Record |
| --- | --- | --- |
| App Information | Name as accepted · Subtitle · Primary language | |
| App Information | Primary and secondary category | |
| App Information | Content Rights answer | |
| App Information | Age Rating: are the 2025 questions answered? Rating shown | |
| App Information | App Store Regulations & Permits: regulated medical device status | |
| App Information | Licence agreement: Apple's standard, or custom | |
| App Privacy | Privacy Policy URL · label published? data types listed | |
| Pricing and Availability | Price · countries and regions | |
| Version page | Status (for example Prepare for Submission) | |
| Version page | Screenshots present for the 6.9-inch iPhone | |
| Version page | Description · Keywords · Support URL · Marketing URL · Copyright | |
| Version page | Build selected, and its number | |
| Version page | In-app purchases attached (should be none) | |
| App Review Information | Sign-in required ticked · user name present · contact name, phone, email · Notes | |
| TestFlight | Latest build number, status, expiry date | |
| TestFlight | Internal groups and tester count | |
| TestFlight | External groups (expected: none) · Beta App Review state | |
| TestFlight → Test Information | Feedback email · beta description · privacy URL · sign-in details | |
| Agreements | Any agreement awaiting acceptance | |
| Email | Any message from Apple about the last upload, especially one headed ITMS-90683 | |

---

## 7. High-risk content findings

Scope: symptom triage, toxic exposure, supplement protocols, health scores and store copy. Every line was located again at `b56cc91`. Severity is this report's triage; clinical judgment belongs to the veterinarian. The proposed edits make copy more cautious and assert nothing new.

**What the app already gets right.** The toxin screens say "Not on this list does NOT mean it's safe" (`expo/lib/toxins/contacts.ts:46`). The triage result says causes are "not a diagnosis" (`expo/app/triage-result.tsx:199`). Every toxin entry shows "Pending vet review".

### P0

| # | Route / file | Evidence | Proposed safe edit |
| --- | --- | --- | --- |
| C1 | Treat audit · `expo/lib/integrative/treats.ts:151`, `expo/app/treat-audit.tsx:15` | When nothing in the toxin list matches, the verdict is `ok`: a green tick, "Okay occasionally", and "This is okay occasionally, but should count toward the daily calorie budget." No match is shown as a safety verdict. | Badge: "No listed concerns found". Text: "We didn't find a known toxin or allergen in what you entered. That doesn't mean it's safe. Ask your vet if you're unsure." |
| C2 | Natural support library · `expo/app/protocols.tsx:30` | Subtitle "Food-first, vet-safe protocols". Four lines below, the same screen says the content is "not individually vet-reviewed". | "Food-first supportive protocols — discuss with your vet" |
| C3 | Toxin: chocolate · `expo/lib/toxins/data.ts:115` | "Darker and baking chocolate carry the most risk; large amounts can be an emergency." Implies small amounts are not. | "Darker and baking chocolate carry the most risk. Even small amounts can be dangerous for a small pet — call your vet or a poison hotline." |
| C4 | Toxin: acetaminophen · `expo/lib/toxins/data.ts:708` | "There is no safe at-home amount for cats." Implies there is one for dogs. | "Never give acetaminophen to a cat or a dog unless your vet prescribes it. A single tablet can kill a cat." |
| C5 | Triage: vomiting · `expo/lib/triage/modules.ts:173–174` | "Rest the stomach: remove food for a few hours…" and "If vomiting stops, reintroduce small bland meals." Given to every species and age. `expo/lib/integrative/conditions.ts:97` says "Never withhold food from a cat without veterinary advice". | "Ask your vet before withholding any food, especially for cats, puppies, kittens or diabetic pets. Note what and when {name} last ate." |
| C6 | Triage result plan · `expo/lib/integrative/catalog.ts:23–28`, `expo/components/IntegrativePlan.tsx:146` | Low energy maps to "metabolic", and eye or generic concerns to "immune". The header prints the system and its pattern, for example "Endocrine & metabolic · Weight / insulin dysregulation". It reads as naming the pet's condition. | Header: "{system} · general support ideas". Show a pattern only as "Patterns sometimes linked to this area (not a diagnosis)". Map energy, eye and generic to a neutral template. |

### P1

| # | Route / file | Evidence | Proposed safe edit |
| --- | --- | --- | --- |
| C7 | Toxin detail · `expo/app/toxin-detail.tsx:190` | "Reviewed 2026-06-25" on every entry. The date is a constant (`data.ts:14`) for when the text was written; nobody reviewed it. | "Summary written 2026-06-25 · not yet vet-reviewed" |
| C8 | Meal planner · `expo/app/meal-planner.tsx:196` | "Check if a food is safe — toxin lookup" | "Check a food against our toxin list (not a complete list)" |
| C9 | AI prompts · `supabase/functions/_shared/prompts.ts:22` | The only rule about "safe" covers food purity. Nothing forbids "a small amount is fine" or treating "not in our list" as safe, and no output filter catches it. | Add: "Never say a food, plant, product or medicine is safe, non-toxic or fine in small amounts. Never treat 'not in Petwell's list' as safe. Direct to a vet or poison control." Add a matching output filter. |
| C10 | Toxins · `data.ts:248`, `:278`, `:786` | "cooked ripe flesh is generally fine." · "In dogs, true lilies usually cause only mild stomach upset." · "Plain pet vitamins are usually low-risk." | Remove each reassurance; end each with "call your vet if eaten." |
| C11 | Toxin badge · `expo/lib/toxins/safety.ts:13` | A "Usually safe" level exists and renders green. No entry uses it today. | "Low known risk — not the same as safe" |
| C12 | Food result · `expo/lib/food/engine.ts:121` | "A good nutritional and safety match for {pet}." Nothing behind "safety". | "A good fit on the nutrition and label data we have — not a safety guarantee." |
| C13 | Food picks · `expo/lib/food/recommend.ts:88` | "Free of {pet}'s known allergens". Only the printed label is checked. | "No listed ingredient matches {pet}'s known allergens" |
| C14 | Food result · `expo/app/food-result.tsx:525` | "Food as medicine" | "Traditional food energetics" |
| C15 | Support plan · `expo/components/IntegrativePlan.tsx:200` | "Only species-safe options are shown." | "Options are screened against our species-caution list. Ask your vet before starting any." |
| C16 | Support plan · `expo/lib/integrative/engine.ts:61` | "If you see no response in a few weeks…" Implies weeks of a supplement with no vet. | "Ask your vet before starting, and stop and call them if anything new appears." |
| C17 | Triage · `expo/lib/triage/modules.ts:55` | "Feed a bland meal (plain rice with a simple cooked protein) in small portions." | "Ask your vet whether a bland diet is right for {name} before changing food." |
| C18 | Triage result · `expo/app/triage-result.tsx:158` | "{High / Moderate / Low} confidence". It counts answers; it is not a validated confidence. | "Based on {n} answers" |
| C19 | Meals · `expo/lib/integrative/meals.ts:75` | "Add 1 tsp–1 tbsp plain pumpkin by size". An amount. | "Ask your vet whether to add plain pumpkin, and how much." |
| C20 | Home preview · `expo/lib/integrative/patterns.ts:226` | "Pancreatitis concern" shown on the home screen with no disclaimer. | "Possible fat-sensitivity signs — ask your vet" |
| C21 | Protocols · `expo/lib/integrative/conditions.ts:166`, `:223`, `:279` | One evidence grade "A" covers a whole protocol, including steps graded lower. | Grade each step only, or label the protocol "Mixed evidence — see each step". |
| C22 | Hydration tips · `conditions.ts:69`, `:233`; `programs.ts:113` | "low-sodium broth" with no warning. Shop broth often contains onion or garlic. | "…plain low-sodium broth with no onion or garlic (check the label)" |
| C23 | Medicine timing · `expo/lib/integrative/catalog.ts:165`, `expo/lib/protocols/productSafety.ts:176` | "Give 1–2 h apart from oral medications" | "It can slow absorption of oral medicines. Ask your vet how to time it." |
| C24 | Product notes · `expo/lib/protocols/productCatalog.ts:402`, `:433`, `:633`, `:784`, `:800` | "…which is why it can be given alongside antibiotics." · "cheap and sensible to try before anything more involved." · "deciding whether a visit is urgent." · "Low-cost and low-risk on intact skin" · "Fine on a surface graze" | Replace each with a plain "ask your vet" sentence. A normal test strip does not rule a problem out; a wound that is deep or not healing needs to be seen. |
| C25 | Treat audit · `expo/lib/integrative/treats.ts:58` | Propylene glycol counts only as one "additive". A cat treat containing it alone gets "Okay occasionally". | For cats, verdict "avoid": "Contains propylene glycol, which is not recommended for cats." |
| C26 | Health score · `expo/lib/health/score.ts:325` | The "Senior & chronic risk" system shows score 92, band "great" and "Low age-related risk" for any pet that is not senior and has no conditions listed. It comes from age and an empty list, with no log behind it. | "No chronic conditions on file — keep up wellness visits." Give no score from profile data alone. |
| C27 | Health score · `expo/app/health-score.tsx:127` | "{score} / 100" with a grade reads as a clinical measure. | Add "Not a medical score" beside it. |
| C28 | Marketplace · `expo/app/marketplace.tsx:116`, `:172`; `expo/lib/integrative/marketplace.ts:89` | "the most transparent foods" · a "Lab tested" badge on rows named "(example)" · "Reviewed catalog" | "ranked highest on the transparency data we have" · hide the badge on example rows · "Petwell-researched catalog (not vet-reviewed)" |

**Store copy.** The listing said the app "never names a diagnosis or doses medication". Triage does list named conditions as possible causes (`modules.ts:71`: "Pancreatitis, toxin, or obstruction"), and C19 is an amount. The descriptions in `docs/STORE_LISTING.md` now say it "does not confirm a diagnosis and does not give medication doses", and mention the supplement library, which the old copy left out.

---

## 8. Android — reported separately

**Status: unknown whether Android is in this launch (Q11).** `expo/eas.json` configures store submission for iOS only. None of this affects the TestFlight path.

Everything below comes from search summaries of Google's help pages, which could not be opened from here. Confirm each in Play Console.

| Step | What Google asks | State here | Owner |
| --- | --- | --- | --- |
| Account deletion | An app that creates accounts must offer deletion in the app and at a web link entered in the Data safety form. The page must name the app and show the steps clearly | In-app deletion exists. The staged deletion page names the app, gives steps, a route without app access, and what is kept. Blocked on P0-1 | Brandon |
| Data safety form | Every app completes it; the privacy policy must cover more than the form does | Answers drafted in `docs/STORE_LISTING.md` §5b. Blocked on Q5 | Brandon |
| Health apps declaration | Every published app completes it, including apps with no health features | Not started. From prior knowledge of the form, its categories are built around human health; say plainly that Petwell covers animal health | Brandon |
| App access | Reviewer credentials go in Play Console → App content → App access | Blocked on P0-3 | Brandon |
| Closed test | A personal developer account created after 13 November 2023 needs 12 testers opted in for 14 days before production access | Unknown account type. This can add two weeks | Brandon |
| Content rating | A separate questionnaire from Apple's | Not checked | Brandon |

---

## 9. iPhone test script

About 30 minutes. Run it on the new TestFlight build, in this order, because deletion comes last.

**Before you start**

- A mailbox you can open **on this iPhone**, never used for a Petwell account. Do not write the address or any password in this file.
- A pet photo in your photo library, and a bag or can of pet food with a label.
- Delete any older copy of Petwell from the phone first. If it holds records saved only on the device, export them before deleting.
- In the TestFlight app, open Petwell and note the line "Version 1.0.0 (N)". **N is the build number.**

**Record:** build number `____` · iOS version `____` · iPhone model `____` · date `____`

| # | Do this | Expect | Result |
| --- | --- | --- | --- |
| 1 | Open Petwell and go through the three intro screens | A screen titled "Keep your pet's records together" with one button, "Sign in or create account" | |
| 2 | Tap the button, choose **Create account**, enter the email and a password of 8 or more characters, tap **Create account** | "Check your email to confirm your account, then sign in." | |
| 3 | Open Mail on the iPhone | An email from "Petwell" within a minute. Record whether it is in the inbox or spam, and the sender's domain | |
| 4 | Tap the confirmation link | The phone returns to Petwell on the Account screen. **Fail** if a web page shows an error or the app does not open | |
| 5 | Sign in | A first-pet screen with **Add a pet** | |
| 6 | Tap **Add a pet**, enter a name, tap **Add a pet photo** and choose a photo | The photo appears and the control now reads "Change pet photo". No permission prompt is expected here | |
| 7 | Tap **Save pet** | "Saving…", then the Today tab showing the pet's name and photo | |
| 8 | Open the **Timeline** tab, add a log (**Stool**, any values) and save | The log is at the top of the timeline | |
| 9 | Swipe the app away to close it, then reopen it | Still signed in. The pet, its photo and the log are all there | |
| 10 | On Timeline, look at the trend labels | "Not enough data" | |
| 11 | Open the health score from the Today tab | "Not enough recent logs to score {name} yet." and no number. **Record it** if a number or a grade appears after one log | |
| 12 | Records tab → gear icon → **Export all my data** | The share sheet offers `petwell-data-export.json`. Save it to Files and check it contains the pet's name | |
| 13 | Settings → **Build a vet-ready report** | A screen headed "Vet-ready summary". Record whether it can be shared or saved as a PDF | |
| 14 | Settings → the **Petwell Pro** banner at the top (it reads "New Pro subscriptions are paused") | A screen saying "Pro plans are not available yet". **Fail** if a price or a buy button appears | |
| 15 | If **Restore purchases** is shown, tap it; then tap **Manage subscription** | "No previous purchases found.", then either Apple's subscriptions screen or a clear message. If the page instead says to "use the app on the device where you subscribed", record that: purchases are not configured in this build (Q5) | |
| 16 | **Scan** tab → **Food Intelligence** → **Photo** → take a photo | iOS asks for the camera. Record the sentence it shows. Tap **Don't Allow** first | |
| 17 | After refusing | A clear message in the app, no crash and no dead end | |
| 18 | iOS Settings → Petwell → turn Camera on, return, photograph the label | The app reads the label and shows a result | |
| 19 | In the same screen choose **Barcode** and read the hint under "Look up product" | Known defect P1-3: it mentions a "dev build". Record the exact text | |
| 20 | Settings → **Reminders** → **Add a reminder**, text "Test", a time two minutes from now (for example `8:02a`), **Add reminder** | iOS asks to allow notifications. Allow | |
| 21 | Lock the phone and wait | A notification at that time. Tapping it opens Petwell | |
| 22 | Settings → **Account** → **Sign out** | The "Keep your pet's records together" screen | |
| 23 | **Sign in or create account** → **Forgot password?** → enter the email → **Send reset link** | "If this email has an account, you will receive a reset link. Open it on this device." | |
| 24 | Open the reset email on the iPhone and tap the link | Petwell opens on "Reset password": first "Checking reset link…", then "Choose a new password". **Fail** if it says to open the link "on the device where you requested it" | |
| 25 | Enter a new password twice, tap **Update password** | "Password updated", then **Continue to Petwell** | |
| 26 | Sign out. Try the old password, then the new one | The old one fails. The new one works and the pet is still there | |
| 27 | Records tab → gear icon → scroll to the bottom → **Delete account & data** | A warning that this "permanently deletes your account, pets, logs, scans, reports, and stored files" and that store subscriptions are cancelled separately | |
| 28 | Tap **Delete everything** | The app returns to the intro. Record how long it took. **Fail** if "Deletion did not finish" stays on screen | |
| 29 | Try to sign in with the same email and password | Refused | |
| 30 | Create an account again with the same email | Record what happens. A new, empty account is acceptable; the old pet reappearing is a **fail** | |

**For any failure,** write the step number, what you saw word for word, and attach a screenshot with no password in it. A failure at steps 4, 24, 28 or 29 blocks submission.

---

## 10. Approvals, export compliance and agreements

Kept apart from the copy edits, as the handoff asks. None of these can be answered from the repository alone.

| Item | Status | Evidence | Next action | Owner |
| --- | --- | --- | --- | --- |
| Export compliance | Declared exempt in the build; needs your confirmation | `expo/app.json` sets `ITSAppUsesNonExemptEncryption: false`. The only encryption in the code is HTTPS and the sign-in library's standard functions | Confirm the app adds no encryption of its own, and answer any console question the same way | Brandon |
| Regulated medical device | Not verified | Apple requires the answer for the categories recommended here | Answer "No" (P1-5). Account Holder or Admin only | Brandon |
| Content rights | Needs an answer | The build shows data from Open Pet Food Facts (`expo/app/food-trust.tsx:56` names it), FDA recall data, and product names and links from three brand stores | Answer the Content Rights question truthfully. Have counsel confirm the open-database licence terms are met by the in-app wording | Brandon, counsel |
| Legal review | Not done | The policy and terms said so themselves until this branch. `docs/PRIVACY_POLICY.md` and `docs/TERMS.md` are older templates with `[INSERT …]` gaps and are not what the app shows | Counsel reviews the text in `expo/lib/legal/content.ts` | Brandon, counsel |
| Paid apps agreement | Not needed for this version | Pro sales are paused and no purchase is submitted | Nothing now. It must be active before Pro returns | Brandon |
| Pending agreements | Not verified | No console access | Look for an agreement banner in App Store Connect | Brandon |
| EU trader status | Not verified | From prior knowledge, not re-read today: Apple asks for a trader declaration before distributing in the EU | Check the Business section, or exclude the EU for now | Brandon |

---

## 11. Ready to paste

**Store listing, review notes, privacy answers, age-rating answers:** `docs/STORE_LISTING.md`. Character counts were checked against each limit:

| Field | Length | Limit |
| --- | --- | --- |
| App Store description | 3,957 | 4,000 |
| Google Play description | 3,303 | 4,000 |
| Review notes | 2,940 | 4,000 |
| Subtitle | 29 | 30 |
| Promotional text | 161 | 170 |
| Keywords | 98 | 100 |

**Privacy policy, terms, support and deletion pages:** `expo/lib/legal/content.ts` and `web-legal/`.

**For Codex — three entries to add to `ios.privacyManifests.NSPrivacyCollectedDataTypes` in `expo/app.json`** (P1-6):

```json
{
  "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeLinked": true,
  "NSPrivacyCollectedDataTypeTracking": false,
  "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
},
{
  "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypePerformanceData",
  "NSPrivacyCollectedDataTypeLinked": false,
  "NSPrivacyCollectedDataTypeTracking": false,
  "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
},
{
  "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeOtherDiagnosticData",
  "NSPrivacyCollectedDataTypeLinked": false,
  "NSPrivacyCollectedDataTypeTracking": false,
  "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"]
}
```

**For Codex — sign-up screen** (P1-2), replacing the plain sentence at `expo/app/account.tsx:198`:

> By creating an account you agree to the **Terms of Use** and acknowledge the **Privacy Policy**.

with each name linked to `/terms` and `/privacy-policy`.

**For Codex — barcode hint** (P1-3):

> Type the barcode number printed on the package.

---

## 12. Sources

Apple, read directly on 2026-11-20:
[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) ·
[Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) ·
[App privacy details](https://developer.apple.com/app-store/app-privacy-details/) ·
[Age ratings reference](https://developer.apple.com/help/app-store-connect/reference/age-ratings/)

Apple, through search summaries only:
[Regulated medical device status](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status) ·
[Apple's notice on medical device status](https://developer.apple.com/news/?id=nyqbfz1y) ·
[Age rating updates](https://developer.apple.com/news/upcoming-requirements?id=07242025a)

Google, through search summaries only:
[Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111) ·
[Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) ·
[Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291) ·
[Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)

Two things rest on prior knowledge rather than on a page read today. Apple's privacy-manifest documentation returned only its title, so the manifest keys in §11 follow the format of the five entries already in `expo/app.json`. The reader's report of the App privacy details page did not include the Identifiers section, so the statement that *User ID* covers a developer-assigned account ID should be confirmed against the wording in the console.
