/**
 * Legal copy — the single source of truth for the in-app Privacy Policy and
 * Terms of Use screens AND the static web pages Apple/Google require
 * (privacy / terms / support / delete-account). The screens render these
 * structures; `scripts/export-legal-pages.ts` exports them to static HTML in
 * web-legal/, so the hosted pages can never drift from what the app shows.
 */

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDoc {
  title: string;
  lastUpdated: string;
  /** Highlighted warning box rendered before the sections (terms only). */
  callout?: string;
  /** Untitled lead-in paragraphs. */
  intro: string[];
  sections: LegalSection[];
  footer: string;
}

// PENDING OWNER CONFIRMATION — do not publish the hosted pages until these are
// settled (tracked in docs/LAUNCH_REPORT_P0P1.md, "Questions for Brandon"):
//   1. SUPPORT_EMAIL must be a mailbox someone reads. `petwell.app` has not
//      been confirmed as a domain the owner controls. Deletion requests land
//      here, so a wrong address sends a user's account email to a stranger.
//      (expo/lib/config.ts has its own default for the in-app "Contact us"
//      row — change both, or the app and the pages will disagree.)
//   2. The "within 30 days" and "up to 30 days" figures below are drafted
//      upper bounds, not measured facts.
//   3. Counsel review of both documents has not happened. That is a launch
//      task, not something to tell users, so it is no longer printed on the
//      page.
export const SUPPORT_EMAIL = "support@petwell.app";
export const COPYRIGHT_LINE = "© 2026 Petwell. All rights reserved.";

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  lastUpdated: "November 20, 2026",
  intro: [
    "Petwell helps you track and understand your pet's health. This policy explains what we collect, how it is used, who helps us process it, and the control you have. It is written to be read by a person, not just a lawyer.",
  ],
  sections: [
    {
      title: "Information you provide",
      paragraphs: [
        "Your account: Petwell requires an account, so we collect your email address and a password. The password is handled by our sign-in provider and is never visible to us in readable form.",
        "Your pet's records: pet profiles (name, species, breed, age, weight, conditions, allergies, and an optional photo), the logs you add (food, stool, skin, weight, activity, medications, symptoms), triage answers, reminders, and the photos, documents, and notes you choose to attach or scan. You decide what to enter.",
      ],
    },
    {
      title: "Information collected automatically",
      paragraphs: [
        "Diagnostics: when the app crashes or hits an error, it sends a crash and performance report (for example the error, the app version, and the device model and operating system) to our error-monitoring provider. These reports are configured not to include your email, account ID, pet records, or AI content.",
        "Service logs: like any online service, our backend records routine technical logs (such as IP address and the time of a request) to keep the service secure and working.",
        "Purchases: if you have ever bought Petwell Pro, the App Store or Google Play and our subscription provider tell the app whether that purchase is still active. We never see your card or payment details.",
        "We do not use advertising identifiers, and we do not track you across other companies' apps or websites.",
      ],
    },
    {
      title: "How we use it",
      paragraphs: [
        "To provide the app's features: triage guidance, food reviews, the health score, patterns to watch, integrative support plans, programs, reminders, and vet-ready reports. Insights are generated from your own logs to help you and your veterinarian — never to diagnose.",
        "We use your email address to sign you in and to send account emails such as the confirmation link and the password-reset link.",
      ],
    },
    {
      title: "Who helps us run Petwell",
      paragraphs: [
        "We use a small number of service providers that process data on our behalf: Supabase (database, file storage, sign-in, and server functions), Resend (delivery of account emails), Sentry (crash and performance diagnostics), RevenueCat together with Apple and Google (purchase status), and OpenAI (only if you turn on AI features — see below).",
        "When you look up a product by barcode, the barcode is sent to Open Pet Food Facts, a public product database, to identify it. Your account and your pet's records are not sent with it.",
        "If you invite someone to a pet's Care Circle, that person can see the records you share for that pet until you remove them.",
        "Links to stores, hotlines, and reference sites open outside Petwell, and those sites' own privacy policies apply.",
      ],
    },
    {
      title: "What we do NOT do",
      paragraphs: [
        "We do not sell your personal information, your pet's photos, or your pet's health data. We do not use your pet's photos, records, or AI conversations to train AI models. We do not show ads or pay-to-rank product recommendations.",
      ],
    },
    {
      title: "Storage & security",
      paragraphs: [
        "Your data is stored in our backend (Supabase) and isolated to your account by row-level security, so other users cannot read your records unless you share a pet with them through Care Circle. Data travels between the app and our backend over encrypted connections (HTTPS).",
        "Scan photos are stored in your account by default so they appear in your pet's timeline. You can turn cloud storage of scan photos off, or delete the stored photos, in Settings.",
        "If an earlier version of Petwell saved records only on your device, they stay on that device until you export or delete them there.",
      ],
    },
    {
      title: "AI features",
      paragraphs: [
        "AI features are OFF by default. If you turn them on in Settings → AI, the text or files you submit for a given feature (for example a chat message, a vet report, or an uploaded record or food-label photo) are sent to our AI provider (OpenAI) through Petwell's secure backend to generate a response. We never put a model API key in the app, and document processing is a separate opt-in you control.",
        "AI output can be wrong and is informational only — not veterinary advice — and should be reviewed before you rely on or share it. AI never diagnoses, prescribes, or overrides our emergency and safety guidance. We log AI requests to operate and protect the service; you can delete your AI conversations and history anytime in Settings → AI. We do not use your content to train AI models.",
      ],
    },
    {
      title: "Your choices & rights",
      paragraphs: [
        "In Settings you can: export all of your data as JSON (always free), turn cloud storage of scan photos on or off, delete stored scan images, delete your AI history, and delete your account and data. Reference catalog data (e.g. ingredient or protocol libraries) is not personal data and is not part of your export.",
      ],
    },
    {
      title: "Keeping and deleting your data",
      paragraphs: [
        "We keep your account and your pet's records until you delete them or delete your account. To delete your account, open Settings → Delete account & data in the app and confirm. This permanently removes your account, pets, logs, scans, photos, documents, reports, reminders, and AI history from our backend.",
        `If you cannot access the app, email ${SUPPORT_EMAIL} from the address on the account with the subject "Delete my account". We will delete the account within 30 days and confirm by email.`,
        "After deletion, routine backups and service logs can persist for up to 30 days before they are purged, and crash reports that are not linked to your account are kept by our diagnostics provider under its own retention schedule. Deleting your account does not cancel a subscription bought through Apple or Google — cancel that in your store account settings.",
      ],
    },
    {
      title: "Children",
      paragraphs: ["Petwell is intended for adults caring for their pets and is not directed at children under 13."],
    },
    {
      title: "Changes",
      paragraphs: [
        'We may update this policy as the app evolves. Material changes will be reflected here with a new "last updated" date.',
      ],
    },
    {
      title: "Contact",
      paragraphs: [`Questions about privacy? Email ${SUPPORT_EMAIL}.`],
    },
  ],
  footer: COPYRIGHT_LINE,
};

export const TERMS_OF_USE: LegalDoc = {
  title: "Terms of Use",
  lastUpdated: "November 20, 2026",
  callout:
    "Petwell is not a veterinarian and does not diagnose, cure, or treat disease. Its guidance is informational and supportive only. For an emergency, or before changing diet, supplements, or medication, contact a licensed veterinarian.",
  intro: [],
  sections: [
    {
      title: "Acceptance",
      paragraphs: ["By using Petwell, you agree to these terms. If you don't agree, please don't use the app."],
    },
    {
      title: "Not veterinary advice",
      paragraphs: [
        "Triage urgency, food reviews, health scores, patterns, and integrative support plans are educational tools to help you observe trends and prepare for veterinary visits. They are not a diagnosis and are not a substitute for professional veterinary care. Always defer to your veterinarian, especially when red-flag signs appear.",
        "The toxin reference is not a complete list: a food, plant, or product that does not appear in it is not thereby safe. Product and supplement grades describe the public evidence we found for a product. They are educational and are not an instruction to give a product to your pet — ask your veterinarian first.",
      ],
    },
    {
      title: "Emergencies",
      paragraphs: [
        "Do not use Petwell to manage an emergency. If your pet shows severe signs (trouble breathing, collapse, seizures, pale gums, repeated vomiting, inability to urinate, suspected toxin exposure, or trauma), seek emergency veterinary care immediately.",
      ],
    },
    {
      title: "AI features",
      paragraphs: [
        "Optional AI features (assistant chat, explanations, label reading, record and COA summaries) are informational only and are not veterinary advice. AI can be wrong or incomplete; review its output and confirm anything important with your veterinarian before relying on it. AI does not diagnose or prescribe and never overrides the emergency guidance above — urgent symptoms or suspected poisoning require a veterinarian or emergency clinic. AI-extracted data (labels, records, lab results) is unverified until reviewed.",
      ],
    },
    {
      title: "Your account & responsibility",
      paragraphs: [
        "You need a Petwell account to use the app. You are responsible for the accuracy of what you log and for keeping your account credentials secure. You can export your data, or delete your account and data, at any time from Settings.",
      ],
    },
    {
      title: "Acceptable use",
      paragraphs: [
        "Use Petwell for your own pets' care. Don't misuse the service, attempt to access other users' data, or rely on it as a sole source of medical decisions.",
      ],
    },
    {
      title: "Purchases & subscriptions",
      paragraphs: [
        "New purchases of Petwell Pro are currently paused. The current app features, including data export, do not require a subscription.",
        "If you already hold a Petwell Pro purchase made through the App Store or Google Play, it keeps working. Payment and renewal are handled by your store account: a subscription renews automatically unless cancelled at least 24 hours before the end of the period, and you can manage or cancel it in your store account settings. You can restore a previous purchase from Settings in the app. If paid plans return, the price and terms will be shown in the app before you buy.",
      ],
    },
    {
      title: "Affiliate links",
      paragraphs: [
        "Some outbound product links are affiliate links: if you buy through one, Petwell may earn a commission at no extra cost to you. Rankings and recommendations are scored on evidence, known safety flags, and transparency alone and are never influenced by commissions, payment, or sponsorship.",
      ],
    },
    {
      title: "Privacy",
      paragraphs: ["Your data is handled as described in our Privacy Policy."],
    },
    {
      title: "Disclaimers & limitation of liability",
      paragraphs: [
        'Petwell is provided "as is," without warranties. To the fullest extent permitted by law, Petwell and its makers are not liable for decisions made based on the app\'s guidance. Veterinary judgment always takes precedence.',
      ],
    },
    {
      title: "Changes",
      paragraphs: ['We may update these terms as the app evolves; the "last updated" date will change accordingly.'],
    },
    {
      title: "Contact",
      paragraphs: [`Questions? Email ${SUPPORT_EMAIL}.`],
    },
  ],
  footer: COPYRIGHT_LINE,
};
