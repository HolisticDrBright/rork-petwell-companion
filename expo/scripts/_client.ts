import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../types/db";

/**
 * Builds a SERVICE-ROLE Supabase client for server-side data jobs.
 *
 * The service-role key bypasses RLS, so it must ONLY ever live server-side
 * (CI secret / your machine's env) and NEVER be shipped in the app bundle.
 * Returns null (with guidance) when the env isn't set, so scripts fail safely.
 */
export function makeServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    console.error(
      "[import] Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.\n" +
        "  The service-role key is server-only — never commit it or ship it in the app.\n" +
        "  Example: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... bun scripts/import-recalls.ts",
    );
    return null;
  }
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
