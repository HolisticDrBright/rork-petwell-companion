/**
 * Export the in-app legal copy to the static pages Apple and Google require,
 * so the hosted pages can never drift from what the app shows.
 *
 *   bun scripts/export-legal-pages.ts        # writes ../web-legal/*.html
 *
 * Outputs (staged in web-legal/ — hosting them is the owner's decision, see
 * docs/LAUNCH_REPORT_P0P1.md):
 *   /                ← site root, so the base URL is not a 404
 *   /privacy         ← lib/legal/content.ts (same source as app/privacy-policy.tsx)
 *   /terms           ← lib/legal/content.ts (same source as app/terms.tsx)
 *   /support         ← support contact, sign-in help, what to include
 *   /delete-account  ← the public account-deletion page both stores expect:
 *                      in-app steps, a route for someone who cannot get into
 *                      the app, what is deleted, and what is kept for how long
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { COPYRIGHT_LINE, PRIVACY_POLICY, SUPPORT_EMAIL, TERMS_OF_USE, type LegalDoc } from "../lib/legal/content";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Petwell</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         max-width: 720px; margin: 0 auto; padding: 24px 16px 64px; line-height: 1.6; color: #1F2A2A; background: #FDFBF7; }
  @media (prefers-color-scheme: dark) { body { color: #E8E6E1; background: #171B1B; } a { color: #7FD1C7; } }
  h1 { font-size: 1.7rem; margin-bottom: 4px; }
  h2 { font-size: 1.15rem; margin-top: 28px; margin-bottom: 6px; }
  .updated { color: #7a8483; font-size: .9rem; margin-top: 0; }
  .callout { background: #FBEED3; color: #1F2A2A; border-radius: 10px; padding: 14px 16px; font-weight: 600; margin: 16px 0; }
  footer { margin-top: 48px; font-size: .8rem; color: #7a8483; border-top: 1px solid #7a848333; padding-top: 16px; }
  a { color: #0E7C6E; }
</style>
</head>
<body>
${body}
<footer>
  <p>${esc(COPYRIGHT_LINE)} · <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <p><a href="./privacy.html">Privacy Policy</a> · <a href="./terms.html">Terms of Use</a> · <a href="./support.html">Support</a> · <a href="./delete-account.html">Delete your account</a></p>
</footer>
</body>
</html>
`;
}

function legalBody(doc: LegalDoc): string {
  const parts: string[] = [];
  parts.push(`<h1>${esc(doc.title)}</h1>`);
  parts.push(`<p class="updated">Last updated ${esc(doc.lastUpdated)}</p>`);
  if (doc.callout) parts.push(`<div class="callout">${esc(doc.callout)}</div>`);
  for (const p of doc.intro) parts.push(`<p>${esc(p)}</p>`);
  for (const s of doc.sections) {
    parts.push(`<h2>${esc(s.title)}</h2>`);
    for (const p of s.paragraphs) parts.push(`<p>${esc(p)}</p>`);
  }
  // The in-app screens close with the copyright line; the page footer below
  // already prints it, so only a different closing note is repeated here.
  if (doc.footer && doc.footer !== COPYRIGHT_LINE) parts.push(`<p><em>${esc(doc.footer)}</em></p>`);
  return parts.join("\n");
}

// How to reach Settings is spelled out on every page that mentions it: the
// only entry point in the app is the gear icon on the Records tab, and someone
// reading these pages is by definition not being walked there by the app.
const SETTINGS_PATH = "open the <strong>Records</strong> tab and tap the gear icon";

const supportBody = `
<h1>Petwell Support</h1>
<p>We read everything. Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll get back to you as soon as we can.</p>
<h2>Please include</h2>
<p>What you were doing, what you expected, and what happened instead. A screenshot helps. Your app version is shown at the bottom of Settings (${SETTINGS_PATH}).</p>
<h2>Signing in</h2>
<p>Petwell needs an account. After you sign up we email a confirmation link — open it on the phone where Petwell is installed, then sign in. To reset a password, tap <strong>Forgot password?</strong> on the sign-in screen and open the reset link on that same phone.</p>
<p>Account emails are sent by “Petwell” from an address ending in <strong>@ailongevitypro.app</strong>. If one doesn't arrive within a few minutes, check your spam or junk folder, then request a new link.</p>
<h2>Emergencies</h2>
<p>Petwell is not for emergencies. If your pet shows severe signs or you suspect poisoning, contact your veterinarian, an emergency clinic, the ASPCA Animal Poison Control Center (888-426-4435), or the Pet Poison Helpline (855-764-7661) right away.</p>
<h2>Your data</h2>
<p>You can export all of your data as JSON (always free), delete stored scan photos, or delete your account and data — all in the app under Settings. See the <a href="./privacy.html">Privacy Policy</a> and <a href="./delete-account.html">account deletion</a> pages.</p>
<h2>Petwell Pro</h2>
<p>New Petwell Pro purchases are paused, and the current app features do not require a subscription. If you already have a Petwell Pro subscription, manage or cancel it in your App Store or Google Play account settings.</p>
`;

const deleteBody = `
<h1>Delete your Petwell account</h1>
<p>This page explains how to delete your account and data in <strong>Petwell</strong>, the pet health app. You can do it at any time — in the app, or by email if you can't get into the app.</p>
<h2>In the app (immediate)</h2>
<ol>
<li>Open Petwell and sign in.</li>
<li>To reach Settings, ${SETTINGS_PATH}.</li>
<li>Scroll to the bottom and tap <strong>Delete account &amp; data</strong>.</li>
<li>Tap <strong>Delete everything</strong> to confirm.</li>
</ol>
<p>Deletion is permanent and starts right away. You are signed out, and the same sign-in no longer works.</p>
<h2>If you can't access the app</h2>
<p>Email <a href="mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account">${SUPPORT_EMAIL}</a> from the address on the account with the subject "Delete my account". We will delete the account within 30 days and reply to confirm. We may ask you to reply from the account's email address, so that nobody else can delete your account.</p>
<h2>What is deleted</h2>
<p>Your account email, pet profiles, health logs, symptom sessions, scans and photos, records and documents, reports, reminders, Care Circle memberships, telehealth requests, purchases metadata held by Petwell, and AI history.</p>
<h2>What is kept, and for how long</h2>
<p>We do not keep a copy of your account data after deletion, apart from the following. Routine backups and service logs can persist for up to 30 days before they are purged. Crash reports are not linked to your account and follow our diagnostics provider's own retention schedule. Reference catalogs (food products, toxin references) are shared, non-personal data and are unaffected.</p>
<p>Apple and Google keep their own records of any purchase you made through them. Deleting your Petwell account does <strong>not</strong> cancel a store subscription — cancel that in your App Store or Google Play account settings.</p>
<h2>Delete some data without deleting your account</h2>
<p>In Settings you can delete stored scan photos and delete your AI history while keeping your account.</p>
<h2>Export first (optional, free)</h2>
<p>Before deleting you can export everything as JSON from <strong>Settings → Export all my data</strong>.</p>
`;

// The site root. Without it the base URL is a 404, and both stores accept a
// base URL as the marketing or developer website.
const indexBody = `
<h1>Petwell</h1>
<p>Petwell is a pet health companion app: daily care and reminders, symptom guidance, a health timeline, food evidence lookups, and vet-ready reports.</p>
<p>Petwell offers information and guidance only. It is not veterinary advice, it does not diagnose, and it is not for emergencies.</p>
<ul>
<li><a href="./support.html">Support</a></li>
<li><a href="./privacy.html">Privacy Policy</a></li>
<li><a href="./terms.html">Terms of Use</a></li>
<li><a href="./delete-account.html">Delete your account</a></li>
</ul>
`;

const outDir = join(__dirname, "..", "..", "web-legal");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), page("Petwell", indexBody));
writeFileSync(join(outDir, "privacy.html"), page(PRIVACY_POLICY.title, legalBody(PRIVACY_POLICY)));
writeFileSync(join(outDir, "terms.html"), page(TERMS_OF_USE.title, legalBody(TERMS_OF_USE)));
writeFileSync(join(outDir, "support.html"), page("Support", supportBody));
writeFileSync(join(outDir, "delete-account.html"), page("Delete your account", deleteBody));
console.log(`Wrote 5 pages to ${outDir} (index, privacy, terms, support, delete-account).`);
console.log("These are staged, not published. Publishing them is the owner's decision —");
console.log("see docs/LAUNCH_REPORT_P0P1.md, then verify with scripts/check-public-urls.sh.");
