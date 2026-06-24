/**
 * Supabase connection config.
 *
 * Resolution order: EXPO_PUBLIC_* env vars (see .env.example) first, then the
 * committed defaults below so the app works out of the box.
 *
 * The anon / publishable key is SAFE to ship in a client app — it only grants
 * the access that Row Level Security allows. Every table is owner-scoped via
 * RLS, so this key cannot read another user's data. To point the app at your
 * own project, set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.
 */
const DEFAULT_URL = "https://iwrqvrfklmyppfhrikfb.supabase.co";
const DEFAULT_ANON_KEY = "sb_publishable_jxzFL6hguLM7yIgpLwXTXQ_IS3rXCdh";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
