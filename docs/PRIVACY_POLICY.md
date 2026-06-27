# Petwell Privacy Policy

**Effective date: _[INSERT DATE]_**

> **This is a template for your team and legal counsel to review — it is not legal advice.**
> It is written to honestly describe how the Petwell app is built and how it handles your
> data. Before you publish it, have qualified counsel review it for your jurisdiction(s),
> confirm every statement still matches the shipped product, and fill in the placeholders
> (effective date, company/legal entity name, contact details, and any region-specific
> rights such as GDPR/CCPA disclosures).

---

## Who this is for

Petwell is a pet-health companion app for **adults caring for their pets**. This policy
explains, in plain English, what information Petwell collects, how it is stored and
secured, what we will never do with it, the third parties we rely on, and the control you
have over your own data.

Petwell helps you track and understand your pet's health — food, stool, skin, weight,
activity, medications, symptoms, vet records, and more. The insights it produces are
generated from your own logs to help you and your veterinarian. **Petwell never provides a
diagnosis.**

---

## The short version

- Your pet's data belongs to you.
- **We never sell your pet's photos or health data.**
- Opting **out** of photo and model training is **ON by default** — we do not use your
  pet's photos or data to train models.
- Sharing anonymized data for research is **OFF by default** — it only happens if you turn
  it on.
- AI features are **OFF by default** and only run when you turn them on.
- You can **export all of your data** (as JSON) and **delete your account and data** at any
  time, for free, from **Settings**. No subscription is required for either.

---

## Information we collect

You decide what to enter. Petwell collects only what it needs to provide its features.

### Account / identity

- **Anonymous device identity (default).** By default, each device is signed in
  anonymously so you get a private, secured account with no login screen and nothing to
  remember. This gives your records a stable owner without asking for your name or email.
- **Optional email and password.** If you choose to create an account (to back up and sync
  your pets across devices), we collect your email address and an authentication credential.
  Creating an account is optional.
- **Local mode.** In some development and demo builds, the app can run entirely on your
  device without a backend account, in which case your data stays on that device. Production
  builds require a backend account.

### Pet and health data

- **Pet profiles** — name, species, breed, age, weight, conditions, and allergies.
- **Daily logs** — food, stool, skin, weight, activity, medications, symptoms, and other
  entries you add over time.
- **Vet records** — visit records and related details you save.
- **Uploaded documents and photos** — files you choose to upload, such as scanned vet
  records, lab results, and pet or food-label photos.
- **Symptom and food scans** — symptom triage sessions and answers, scan records, and any
  scan photos you choose to save.
- **Food logs** — the foods you log for your pets and related scoring inputs.
- **AI generations** — created **only if you enable AI features** (see "AI features"
  below): your AI chat threads and messages, AI-generated summaries and explanations, and a
  record of AI requests we keep to operate and protect the service.
- **Subscription status** — whether you have an active Petwell Pro subscription. (See
  "Third parties and subprocessors.")

### Reference catalog data is not personal data

Petwell ships and uses reference libraries (for example, ingredient and protocol catalogs).
This catalog data is not personal to you, is not derived from your account, and is not
included in your data export.

---

## How we use your information

We use the information above to provide the app's features, including triage guidance,
food reviews, the health score, patterns to watch, integrative support plans, programs, and
vet-ready reports. Insights are generated from **your own logs**, for **you and your
veterinarian** — never to diagnose, and never to rank products by who paid us (we do not
show pay-to-rank product recommendations).

---

## How your data is stored and secured

When you use an account, your data is stored in our backend, which is built on **Supabase
(PostgreSQL and object storage)**.

- **Row Level Security (RLS).** Every table that holds user data enforces row-level
  security: each user can read and write **only their own rows**. Other users cannot see or
  modify your records. Reference catalog data (e.g. ingredient libraries) is read-only to
  the app and is not personal data.
- **Private storage buckets scoped to your user id.** Uploaded files — pet photos, scan
  images, documents, and reports — live in **private** storage buckets, and each object must
  reside under a folder named with your user id. They are not publicly readable.
- **Encrypted in transit.** Communication between the app and our backend is encrypted in
  transit (HTTPS/TLS).
- **Scan photos are stored only with your permission.** Storing scan photos in the cloud is
  a setting you control. Turn it off to keep scan photos on your device only.

We design for data minimization and least privilege, but **no method of storage or
transmission is 100% secure**, and we cannot guarantee absolute security.

---

## What Petwell does NOT do

- **We do not sell your pet's photos or health data.** Ever.
- **We do not use your pet's photos or data to train models** while the photo/model
  training opt-out is on — and that opt-out is **ON by default**.
- **We do not share anonymized data for research unless you opt in.** Research sharing is
  **OFF by default**.
- **We do not show pay-to-rank product recommendations.**
- **We do not use your content to train AI models.**

---

## Your privacy controls (in Settings)

Petwell puts the controls in **Settings → "Settings & privacy."** From there you can:

| Control | Default | What it does |
| --- | --- | --- |
| Store scan photos in the cloud | On | Turn off to keep scan photos on this device only. |
| Use my logs for personalized insights | On | Powers trends and correlations for your pets. Turn off to stop personalized insights. |
| Opt out of photo & model training | **On (opted out)** | We never use your pet's photos or data to train models. |
| Share anonymized data for research | **Off** | Opt in to help improve pet-health insights with anonymized data. |
| Enable AI features | **Off** | Turns the AI assistant and AI explanations on or off (see below). |
| Allow AI to process my documents | **Off** | A separate opt-in needed for AI to summarize uploaded records and read food labels. |

You can change any of these at any time.

---

## AI features

**AI features are OFF by default.** They run only if you turn them on in **Settings → AI**,
and they are designed to be safe, server-side, and under your control.

- **Opt-in, two levels.** Enabling AI is one choice. Allowing AI to process your uploaded
  **documents** (to summarize records or read food labels) is a **separate** opt-in you
  control. Turning the master AI switch off also turns off document processing.
- **Server-side only — the app never holds model keys.** When AI is on, the text or files
  you submit for a given feature (for example a chat message, a vet report, or an uploaded
  record or food-label photo) are sent to our AI/LLM provider **through Petwell's secure
  backend** to generate a response. The provider is currently **OpenAI** (the backend is
  built so an alternate configured LLM provider could be used). **No model API key is ever
  shipped in the app**; all provider calls happen on the server.
- **AI never diagnoses.** AI output is informational only — **not veterinary advice** — can
  be wrong, and should be reviewed before you rely on or share it. AI never diagnoses,
  prescribes, doses, or overrides Petwell's emergency and safety guidance. Emergency or
  suspected-poisoning situations are routed to safety guidance that the model cannot
  weaken.
- **We log AI requests** to operate, debug, budget, and protect the service.
- **We do not use your content to train AI models.**
- **You can delete your AI history at any time.** In **Settings → AI**, "Delete AI history"
  removes your AI chats and history.

---

## Third parties and subprocessors

Petwell relies on a small set of service providers. We share only what each provider needs
to do its job, and only the providers listed here. We do not sell your data to anyone.

| Provider | Purpose | What it receives |
| --- | --- | --- |
| **Supabase** | Backend database, authentication, and file storage | Your account and pet/health data, and your uploaded files, stored under your RLS-scoped account and private buckets. |
| **RevenueCat** | In-app subscription management (Petwell Pro) | Subscription/purchase status. Used on mobile only; on web and where in-app purchases are unavailable, purchases are disabled. |
| **Sentry** | Crash and error reporting | Diagnostic crash/error data **only if a Sentry DSN is configured** for the build. It is configured to avoid personal information: it does not send default PII, and a scrubbing step removes request bodies, user identifiers, breadcrumbs, and any fields that could carry prompts, records, pet medical details, or emails. AI content is never attached to crash reports. If no DSN is set, Sentry is inactive. |
| **AI/LLM provider (OpenAI, or a configured LLM provider)** | Generating AI responses | The text or files you submit for an AI feature — **only when you have enabled AI features**, and only via Petwell's server. The app never holds the provider's API key. |

Each provider processes data under its own terms and privacy practices. We may update this
list as the product evolves; material changes will be reflected here with a new effective
date.

---

## Your rights and choices

- **Export your data (free).** From **Settings → "Export all my data,"** you can export all
  of your data as a **JSON** file at any time. Export is always free and does **not** require
  a subscription. (Reference catalog data is not personal data and is not part of the
  export.)
- **Delete stored scan images.** From **Settings → "Delete stored scan images,"** you can
  remove scan images saved in the cloud.
- **Delete your AI history.** From **Settings → AI → "Delete AI history."**
- **Delete your account and all data (free).** From **Settings → "Delete account & data,"**
  you can permanently delete your pets, logs, scans, reports, and account. This cannot be
  undone, and it does **not** require a subscription.
- **Change your privacy controls** at any time, as described in "Your privacy controls."

Depending on where you live, you may have additional rights (such as access, correction,
portability, or deletion under laws like the GDPR or CCPA). _[Counsel: add the
region-specific rights, the legal bases for processing, and any "Do Not Sell or Share"
disclosures that apply, and confirm how requests are handled.]_

---

## Data retention

We keep your data for as long as your account exists or as needed to provide the app's
features. When you delete your account, or specific items (such as scan images or AI
history), the corresponding data is removed. _[Counsel: state any backup, legal-hold, or
log-retention windows that apply to your deployment.]_

---

## Children

Petwell is intended for **adults caring for their pets** and is **not directed at children
under 13**. We do not knowingly collect personal information from children under 13. If you
believe a child has provided us personal information, please contact us so we can address
it.

---

## Changes to this policy

We may update this policy as the app evolves. Material changes will be reflected here with a
new effective date. The version shown inside the app remains the canonical, user-facing
summary.

---

## Contact us

Questions about privacy? Email **support@petwell.app**.

_(The in-app "Contact us" address is configurable by the operator via the
`EXPO_PUBLIC_SUPPORT_EMAIL` setting and defaults to `support@petwell.app`. Update this
section to match the address your team monitors.)_
