// Auth + Supabase clients for edge functions. The caller's JWT (sent by
// supabase.functions.invoke) identifies the owner; a service-role client is used
// for privileged writes (logging, queueing) that bypass RLS intentionally.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Service-role client — bypasses RLS. Use ONLY for trusted server writes. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A client scoped to the caller's JWT — RLS applies as if it were the user. */
export function userClient(authHeader: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Caller {
  userId: string;
  authHeader: string;
}

/** Resolve the authenticated owner from the request, or null if unauthenticated. */
export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await userClient(authHeader).auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, authHeader };
}

/** Whether a user has the admin flag (profiles.is_admin). Best-effort. */
export async function isAdmin(svc: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await svc.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return !!(data as { is_admin?: boolean } | null)?.is_admin;
}
