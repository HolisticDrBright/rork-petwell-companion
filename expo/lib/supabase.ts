import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/db";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./supabaseConfig";

export { isSupabaseConfigured };

/**
 * Typed Supabase client. Sessions persist in AsyncStorage (works on web too,
 * backed by localStorage). We don't parse sessions from the URL.
 *
 * When the backend isn't configured we still construct the client with harmless
 * placeholders so importing this module can never throw — nothing uses it in
 * local mode (callers gate on isSupabaseConfigured / backend mode).
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
