/**
 * Supabase connection config.
 *
 * Production posture: the backend is driven ENTIRELY by environment variables.
 * If they aren't set, the app runs in local/demo mode (AsyncStorage) instead of
 * silently pointing at a shared project. A shared demo project can still be used
 * for local development by opting in explicitly with EXPO_PUBLIC_USE_DEMO_SUPABASE=1.
 *
 * The anon / publishable key is SAFE to ship in a client app — it only grants
 * the access that Row Level Security allows. Every table is owner-scoped via RLS,
 * so this key cannot read another user's data.
 *
 *   EXPO_PUBLIC_SUPABASE_URL       your project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  your anon/publishable key
 *   EXPO_PUBLIC_USE_DEMO_SUPABASE  set to "1" to use the shared demo project (dev only)
 */

const ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ENV_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Shared demo project — used ONLY when a developer explicitly opts in. Never the
// default, so a production build without env vars can't accidentally use it.
const DEMO_OPT_IN = process.env.EXPO_PUBLIC_USE_DEMO_SUPABASE === "1";
const DEMO_URL = "https://iwrqvrfklmyppfhrikfb.supabase.co";
const DEMO_ANON_KEY = "sb_publishable_jxzFL6hguLM7yIgpLwXTXQ_IS3rXCdh";

export const SUPABASE_URL = ENV_URL ?? (DEMO_OPT_IN ? DEMO_URL : "");
export const SUPABASE_ANON_KEY = ENV_ANON_KEY ?? (DEMO_OPT_IN ? DEMO_ANON_KEY : "");

export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Developer-facing warning so it's never a mystery why the backend is off.
if (!ENV_URL || !ENV_ANON_KEY) {
  if (DEMO_OPT_IN) {
    console.warn(
      "[petwell] Using the SHARED DEMO Supabase project (EXPO_PUBLIC_USE_DEMO_SUPABASE=1). " +
        "For development only — set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY for your own project.",
    );
  } else {
    console.warn(
      "[petwell] No EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY set — running in local/demo mode " +
        "(AsyncStorage). Set them in .env to enable the Supabase backend.",
    );
  }
}
