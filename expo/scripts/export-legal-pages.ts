/**
 * Export the in-app legal copy to the four static pages Apple and Google
 * require, so the hosted pages can never drift from what the app shows.
 *
 *   bun scripts/export-legal-pages.ts        # writes ../web-legal/*.html
 *
 * Outputs (host these at your domain — see docs/LAUNCH_HANDOFF.md):
 *   /privacy         ← lib/legal/content.ts (same source as app/privacy-policy.tsx)
 *   /terms           ← lib/legal/content.ts (same source as app/terms.tsx;
 *                      Apple requires a public Terms/EULA URL for subscriptions)
 *   /support         ← support contact + what to include
 *   /delete-account  ← Google Play's required public account-deletion path
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
  parts.push(`<p><em>${esc(doc.footer)}</em></p>`);
  return parts.join("\n");
}

const supportBody = `
<h1>Petwell Support</h1>
<p>We read everything. Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we'll get back to you as soon as we can.</p>
<h2>Please include</h2>
<p>What you were doing, what you expected, and what happened instead. A screenshot helps. Your app version is shown at the bottom of Settings.</p>
<h2>Emergencies</h2>
<p>Petwell is not for emergencies. If your pet shows severe signs or you suspect poisoning, contact your veterinarian, an emergency clinic, the ASPCA Animal Poison Control Center (888-426-4435), or the Pet Poison Helpline (855-764-7661) right away.</p>
<h2>Your data</h2>
<p>You can export all of your data as JSON (always free), delete stored scan photos, or delete your account and data — all in the app under Settings. See the <a href="./privacy.html">Privacy Policy</a> and <a href="./delete-account.html">account deletion</a> pages.</p>
`;

const deleteBody = `
<h1>Delete your Petwell account</h1>
<p>You can permanently delete your Petwell account and its data at any time — no email or waiting period required.</p>
<h2>In the app (immediate)</h2>
<p>Open <strong>Settings → Delete account &amp; data</strong>, then confirm. This permanently removes your account, your pets, and every log, photo, record, report, and AI conversation tied to it. Reference catalogs (food products, toxin references) are shared, non-personal data and are unaffected.</p>
<h2>If you can't access the app</h2>
<p>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> from the address on the account with the subject "Delete my account" and we will delete it and confirm.</p>
<h2>What is deleted</h2>
<p>Your account email, pet profiles, health logs, symptom sessions, scans and photos, records and documents, reports, reminders, Care Circle memberships, telehealth requests, purchases metadata held by Petwell, and AI history. Subscription billing itself is managed by Apple/Google — cancel an active subscription in your store account settings (deleting the account does not auto-cancel a store subscription).</p>
<h2>Export first (optional, free)</h2>
<p>Before deleting you can export everything as JSON from <strong>Settings → Export all my data</strong>.</p>
`;

const outDir = join(__dirname, "..", "..", "web-legal");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "privacy.html"), page(PRIVACY_POLICY.title, legalBody(PRIVACY_POLICY)));
writeFileSync(join(outDir, "terms.html"), page(TERMS_OF_USE.title, legalBody(TERMS_OF_USE)));
writeFileSync(join(outDir, "support.html"), page("Support", supportBody));
writeFileSync(join(outDir, "delete-account.html"), page("Delete your account", deleteBody));
console.log(`Wrote 4 pages to ${outDir} (privacy, terms, support, delete-account).`);
console.log("Host them at /privacy, /terms, /support, /delete-account on your domain, then");
console.log("fill the placeholder URLs in docs/STORE_LISTING.md §6.");
