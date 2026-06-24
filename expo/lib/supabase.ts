import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabaseConfig";

export { isSupabaseConfigured };

/**
 * Typed Supabase client. Sessions persist in AsyncStorage (works on web too,
 * backed by localStorage). We do not parse sessions from the URL — Petwell uses
 * anonymous auth, not magic links.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
