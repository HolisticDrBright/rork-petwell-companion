/**
 * Production build environment gate — fails an EAS production build when a
 * required secret is missing or still a placeholder, and refuses to build if
 * any EXPO_PUBLIC_* variable carries a server-side key.
 *
 * Wired via package.json `eas-build-post-install` (EAS runs it on the build
 * machine after dependencies install, with the profile's environment
 * variables loaded). Outside EAS it can be run directly:
 *
 *   EAS_BUILD_PROFILE=production bun scripts/verify-env.ts
 *
 * Non-production profiles only run the server-key leak check; local/dev modes
 * intentionally work with no env at all.
 */

const profile = process.env.EAS_BUILD_PROFILE ?? "";
const isProduction = profile === "production" || process.argv.includes("--production");

const errors: string[] = [];
const warnings: string[] = [];

// ── Server keys must never ride an EXPO_PUBLIC_ variable (they'd be inlined
// into the shipped JS bundle). Checked for EVERY profile.
const SERVER_VALUE = /(service_role|sb_secret_|^sk-[A-Za-z0-9_-]{10,})/i;
const SERVER_NAME = /(SERVICE_ROLE|OPENAI|LLM_API|SMTP|POSTGRES|DATABASE_URL)/i;
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith("EXPO_PUBLIC_") || !value) continue;
  if (SERVER_NAME.test(name.slice("EXPO_PUBLIC_".length)) || SERVER_VALUE.test(value)) {
    errors.push(`${name} looks like a SERVER secret — EXPO_PUBLIC_ variables ship in the app bundle. Remove it.`);
  }
}

if (isProduction) {
  const PLACEHOLDER = /(YOUR|xxxx|placeholder|changeme|<.*>|example)/i;

  const required: [string, RegExp][] = [
    ["EXPO_PUBLIC_SUPABASE_URL", /^https:\/\/[a-z0-9]{16,}\.supabase\.co\/?$/],
    ["EXPO_PUBLIC_SUPABASE_ANON_KEY", /^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{20,}\..+)$/],
  ];
  for (const [name, shape] of required) {
    const v = process.env[name] ?? "";
    if (!v) errors.push(`${name} is not set — a production build must point at the production Supabase project.`);
    else if (PLACEHOLDER.test(v) || !shape.test(v)) errors.push(`${name} looks like a placeholder or has the wrong shape: "${v.slice(0, 24)}…"`);
  }

  // Recommended: the app degrades gracefully without these, but a production
  // release should have them — placeholders are always an error.
  const recommended: [string, RegExp | null, string][] = [
    ["EXPO_PUBLIC_SENTRY_DSN", /^https:\/\/[a-f0-9]+@[a-z0-9.]+\/\d+$/i, "crash reporting will be OFF"],
    ["EXPO_PUBLIC_REVENUECAT_IOS_KEY", /^appl_/, "iOS purchases will be disabled"],
    ["EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", /^goog_/, "Android purchases will be disabled"],
  ];
  for (const [name, shape, consequence] of recommended) {
    const v = process.env[name] ?? "";
    if (!v) warnings.push(`${name} is not set — ${consequence}.`);
    else if (PLACEHOLDER.test(v) || v.startsWith("test_") || (shape && !shape.test(v)))
      errors.push(`${name} is set but looks like a placeholder/test value ("${v.slice(0, 12)}…") — set the real key or unset it.`);
  }

  // Flags that must never reach a production binary.
  if (process.env.EXPO_PUBLIC_USE_DEMO_SUPABASE === "1")
    errors.push("EXPO_PUBLIC_USE_DEMO_SUPABASE=1 is set — production must never opt into the shared demo project.");
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "";
  if (appEnv && appEnv !== "production")
    errors.push(`EXPO_PUBLIC_APP_ENV=${appEnv} — leave it unset (or "production") for a production build.`);
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  console.error(`\n✖ Production env verification failed (profile: ${profile || "(none)"}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nFix the EAS environment variables (npx eas env:list --environment production) and rebuild.");
  process.exit(1);
}
console.log(
  isProduction
    ? "✓ Production env verified: required secrets present, no placeholders, no server keys in EXPO_PUBLIC_*."
    : `✓ Env check passed (profile: ${profile || "local"} — full checks run on the production profile).`,
);
