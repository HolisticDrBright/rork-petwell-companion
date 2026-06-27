/**
 * Canonical client configuration — one typed accessor for every `EXPO_PUBLIC_*`
 * value the app reads, plus the resolved data-mode booleans (from lib/dataMode).
 *
 * KEY SAFETY (see docs/SECURITY.md):
 *   • Only `EXPO_PUBLIC_*` values appear here — they are inlined into the client
 *     bundle, so ONLY client-safe values belong (Supabase anon/publishable key,
 *     RevenueCat *public* SDK keys, Sentry DSN). All of these are safe to ship.
 *   • Server-only secrets — `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` /
 *     `LLM_API_KEY`, food/recall/email provider keys — MUST NEVER appear in the
 *     app or in any `EXPO_PUBLIC_*` var. They live in Supabase Edge Function
 *     secrets only. This file would be the wrong place for them.
 *
 * Production means real auth + real user data + honest empty states. Demo and
 * mock affordances default OFF in production and are only ever shown after an
 * explicit, user-initiated action (never auto-loaded).
 */
import { dataMode } from "@/lib/dataMode";

/** Parse a boolean env var ("true"/"1" → true). Empty/unset → the default. */
function boolEnv(v: string | undefined, dflt: boolean): boolean {
  if (v == null || v === "") return dflt;
  return v === "true" || v === "1";
}

/** Trimmed string env var, or a default when unset/blank. */
function strEnv(v: string | undefined, dflt = ""): string {
  return (v && v.trim()) || dflt;
}

export interface AppConfig {
  // ── Data mode (resolved in lib/dataMode) ───────────────────────────────────
  mode: "production" | "development" | "demo";
  isProduction: boolean;

  // ── Backend ────────────────────────────────────────────────────────────────
  /** Master switch for using the real backend. Always true in production. */
  useApi: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isBackendConfigured: boolean;

  // ── Demo / mock gates (explicit only; never silent, never in prod by default)
  /** The explicit "Try a demo profile" affordance is visible. */
  demoModeEnabled: boolean;
  /** Illustrative photo-scan scores may be shown. Off in production → honest preview. */
  mockScanEnabled: boolean;
  /** Whether a non-RevenueCat billing fallback is allowed. Always false: Pro only
   *  unlocks via RevenueCat / backend entitlements — there is no fake unlock. */
  billingFallbackEnabled: boolean;

  // ── Payments (RevenueCat public SDK keys — safe to ship) ────────────────────
  revenueCatIosKey: string;
  revenueCatAndroidKey: string;
  revenueCatEntitlement: string;

  // ── Observability + support ────────────────────────────────────────────────
  sentryDsn: string;
  supportEmail: string;
}

const SUPABASE_URL = strEnv(process.env.EXPO_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = strEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Demo + mock affordances follow the data mode: shown in dev/demo builds, and in
// any build only when an operator explicitly opts in. Production defaults to OFF
// (real data only) — and a production build can never be flipped into silent demo.
const demoModeEnabled = dataMode.shouldShowDemoData || boolEnv(process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE, false);
const mockScanEnabled = dataMode.shouldShowDemoData || boolEnv(process.env.EXPO_PUBLIC_ENABLE_MOCK_SCAN, false);

// A production build always uses the API; only non-production may opt out (offline
// dev/testing). This keeps "production = real data" non-negotiable.
const useApi = dataMode.isProductionBuild ? true : boolEnv(process.env.EXPO_PUBLIC_USE_API, true);

// There is no fake-premium path anywhere in the app; this flag exists only so the
// audit surface is explicit. It can never be true in a production build.
const billingFallbackEnabled = !dataMode.isProductionBuild && boolEnv(process.env.EXPO_PUBLIC_ENABLE_BILLING_FALLBACK, false);

export const config: AppConfig = {
  mode: dataMode.mode,
  isProduction: dataMode.isProductionBuild,

  useApi,
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  isBackendConfigured: SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0,

  demoModeEnabled,
  mockScanEnabled,
  billingFallbackEnabled,

  revenueCatIosKey: strEnv(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
  revenueCatAndroidKey: strEnv(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
  revenueCatEntitlement: strEnv(process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT, "Petwell Pro"),

  sentryDsn: strEnv(process.env.EXPO_PUBLIC_SENTRY_DSN),
  supportEmail: strEnv(process.env.EXPO_PUBLIC_SUPPORT_EMAIL, "support@petwell.app"),
};
