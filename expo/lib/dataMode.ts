/**
 * App data mode — the single source of truth for "are we allowed to show demo /
 * mock / placeholder data, and may we fall back to local mode?"
 *
 * Production builds must use real/live data. They never auto-seed demo pets, never
 * silently fall back to local/demo mode on missing config, and never use the
 * shared demo Supabase project. Demo data is available only in development, or via
 * an explicit "Try demo profile" action.
 *
 * Pure + dependency-free (only reads env / __DEV__) so it can be imported anywhere
 * — including supabaseConfig — and unit-tested via computeDataMode().
 */

export type AppDataMode = "production" | "development" | "demo";

export interface DataModeEnv {
  /** EXPO_PUBLIC_APP_ENV — explicit override: production | development | demo. */
  appEnv?: string;
  /** React Native's __DEV__ (true under `expo start`, false in release builds). */
  isDev?: boolean;
  /** EXPO_PUBLIC_USE_DEMO_SUPABASE — "1" opts into the shared demo project (dev only). */
  useDemoSupabase?: string;
}

export interface DataMode {
  mode: AppDataMode;
  /** A real production build — demo/mock data and local fallback are off. */
  isProductionBuild: boolean;
  /** Demo pets / demo rows may be created or shown. */
  isDemoModeAllowed: boolean;
  /** The app may run in local/AsyncStorage mode when no backend is configured. */
  isLocalFallbackAllowed: boolean;
  /** Demo/mock data may appear in user-facing surfaces. */
  shouldShowDemoData: boolean;
  /** Production requires a configured Supabase backend (no silent fallback). */
  shouldRequireBackend: boolean;
  /** The shared demo Supabase project may be used (explicit opt-in, never in prod). */
  demoSupabaseAllowed: boolean;
}

/** Pure resolver — testable with any env. */
export function computeDataMode(env: DataModeEnv): DataMode {
  const explicit = (env.appEnv ?? "").toLowerCase();
  const mode: AppDataMode =
    explicit === "production"
      ? "production"
      : explicit === "demo"
        ? "demo"
        : explicit === "development"
          ? "development"
          : env.isDev
            ? "development"
            : "production"; // default for a release build with no override

  const isProductionBuild = mode === "production";
  const isDemoModeAllowed = mode === "demo" || mode === "development";

  return {
    mode,
    isProductionBuild,
    isDemoModeAllowed,
    isLocalFallbackAllowed: !isProductionBuild,
    shouldShowDemoData: isDemoModeAllowed,
    shouldRequireBackend: isProductionBuild,
    demoSupabaseAllowed: !isProductionBuild && env.useDemoSupabase === "1",
  };
}

// __DEV__ is a RN/Expo global; it's undefined in the Node test runner (treated as
// non-dev there, but tests exercise computeDataMode() directly with explicit env).
declare const __DEV__: boolean | undefined;
const isDev = typeof __DEV__ !== "undefined" ? !!__DEV__ : false;

export const dataMode: DataMode = computeDataMode({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  isDev,
  useDemoSupabase: process.env.EXPO_PUBLIC_USE_DEMO_SUPABASE,
});

// Convenience named exports (the helpers the rest of the app gates on).
export const {
  isProductionBuild,
  isDemoModeAllowed,
  isLocalFallbackAllowed,
  shouldShowDemoData,
  shouldRequireBackend,
} = dataMode;

/** Short human label for the current mode (admin/debug surfaces). */
export function dataModeLabel(): string {
  return dataMode.mode === "production"
    ? "Production (live data)"
    : dataMode.mode === "demo"
      ? "Demo (sample data)"
      : "Development";
}
