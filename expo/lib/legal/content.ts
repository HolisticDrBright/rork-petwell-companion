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

export const SUPPORT_EMAIL = "support@petwell.app";
export const COPYRIGHT_LINE = "© 2026 Petwell. All rights reserved.";
const COUNSEL_FOOTER =
  "This document is a general template provided for transparency and should be reviewed by qualified counsel before public launch.";

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  lastUpdated: "June 26, 2026",
  intro: [
    "Petwell helps you track and understand your pet's health. This policy explains what we collect, how it is used, and the control you have. It is written to be read by a person, not just a lawyer.",
  ],
  sections: [
    {
      title: "Information you provide",
      paragraphs: [
        "Pet profiles (name, species, breed, age, weight, conditions, allergies), the logs you add (food, stool, skin, weight, activity, medications, symptoms), photos you choose to scan, triage answers, and — if you create an account — your email address. You decide what to enter.",
      ],
    },
    {
      title: "How we use it",
      paragraphs: [
        "To provide the app's features: triage guidance, food reviews, the health score, patterns to watch, integrative support plans, programs, and vet-ready reports. Insights are generated from your own logs to help you and your veterinarian — never to diagnose.",
      ],
    },
    {
      title: "What we do NOT do",
      paragraphs: [
        "We do not sell your pet's photos or health data. We do not use your pet's photos or data to train models when you opt out of training in Settings. We do not show pay-to-rank product recommendations.",
      ],
    },
    {
      title: "Storage & security",
      paragraphs: [
        "With an account, your data is stored in our backend (Supabase) and isolated to you by row-level security, so your records are not accessible to other users. Without an account, the app can run in local mode where your data stays on your device. Scan photos are stored only if you allow it in Settings.",
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
        "From Settings & privacy you can: export all of your data as JSON (always free), delete stored scan images, delete your account and data, opt out of model/photo training, and turn off personalized insights or research sharing. Reference catalog data (e.g. ingredient or protocol libraries) is not personal data and is not part of your export.",
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
  footer: COUNSEL_FOOTER,
};

export const TERMS_OF_USE: LegalDoc = {
  title: "Terms of Use",
  lastUpdated: "June 26, 2026",
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
        "You are responsible for the accuracy of what you log and for keeping your account credentials secure. You can export or delete your data at any time from Settings.",
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
        "Petwell Pro is offered through the App Store and Google Play as an auto-renewing subscription (monthly or yearly) or a one-time lifetime purchase. Payment is charged to your store account; subscriptions renew automatically unless cancelled at least 24 hours before the end of the period, and can be managed or cancelled in your store account settings. The core app — including data export — remains free.",
      ],
    },
    {
      title: "Affiliate links",
      paragraphs: [
        "Some outbound product links are affiliate links: if you buy through one, Petwell may earn a commission at no extra cost to you. Rankings and recommendations are scored on evidence, safety, and transparency alone and are never influenced by commissions, payment, or sponsorship.",
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
  footer: COUNSEL_FOOTER,
};
