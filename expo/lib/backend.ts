import { config } from "./config";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Backend bootstrap.
 *
 * Petwell uses Supabase anonymous auth so every device gets a real, RLS-scoped
 * identity with no login screen. init() is attempted once; if anything fails
 * (network blocked, anonymous sign-ins disabled, offline) we fall back to
 * "local" mode and the app keeps working against bundled mock data.
 */
export type BackendMode = "remote" | "local";

const INIT_TIMEOUT_MS = 8000;

let currentUserId: string | null = null;
let currentEmail: string | null = null;
let currentIsAnonymous: boolean = false;
let currentMode: BackendMode = "local";
let initPromise: Promise<{ mode: BackendMode; userId: string | null }> | null = null;
let listenerSet = false;

type SbUser = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

function applyUser(user: SbUser | null): void {
  if (user) {
    currentUserId = user.id;
    currentEmail = user.email ?? null;
    currentIsAnonymous = user.is_anonymous ?? !user.email;
    currentMode = "remote";
  } else {
    currentUserId = null;
    currentEmail = null;
    currentIsAnonymous = false;
    currentMode = "local";
  }
}

/** Keep the cached identity in sync with token refreshes / external changes. */
function ensureAuthListener(): void {
  if (listenerSet) return;
  listenerSet = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) applyUser(session.user as SbUser);
  });
}

/** Idempotently make sure a profiles row exists for the current user. */
async function ensureProfile(): Promise<void> {
  if (!currentUserId) return;
  try {
    await supabase.from("profiles").upsert({ id: currentUserId }, { onConflict: "id" });
  } catch {
    // best-effort
  }
}

function authMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/already registered|already exists/i.test(msg)) return "That email already has an account — try signing in.";
  if (/invalid login credentials/i.test(msg)) return "Email or password is incorrect.";
  if (/password should be at least/i.test(msg)) return "Use a password with at least 6 characters.";
  if (/unable to validate email|invalid email/i.test(msg)) return "That email address doesn't look valid.";
  if (/rate limit|too many/i.test(msg)) return "Too many attempts — please wait a moment and try again.";
  return msg || "Something went wrong. Please try again.";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("backend init timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function doInit(): Promise<{ mode: BackendMode; userId: string | null }> {
  // `useApi` is always true in production; only non-production may opt out
  // (offline dev/testing) via EXPO_PUBLIC_USE_API=false.
  if (!isSupabaseConfigured || !config.useApi) return { mode: "local", userId: null };
  ensureAuthListener();

  const { data: sessionData } = await supabase.auth.getSession();
  let user = sessionData.session?.user ?? null;

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error("no anonymous user");

  applyUser(user as SbUser);
  await ensureProfile();
  return { mode: "remote", userId: user.id };
}

/** Idempotent. Resolves to the active mode; never rejects. */
export function initBackend(): Promise<{ mode: BackendMode; userId: string | null }> {
  if (!initPromise) {
    initPromise = withTimeout(doInit(), INIT_TIMEOUT_MS).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[petwell] Supabase unavailable, using local mode: ${msg}`);
      currentMode = "local";
      currentUserId = null;
      return { mode: "local" as const, userId: null };
    });
  }
  return initPromise;
}

export function getMode(): BackendMode {
  return currentMode;
}

export function getUserId(): string | null {
  return currentUserId;
}

/** Returns the signed-in user id or throws — use inside remote-mode services. */
export function requireUserId(): string {
  if (!currentUserId) throw new Error("Not authenticated (backend in local mode)");
  return currentUserId;
}

/** Current auth identity for the UI. */
export function getAuthInfo(): { userId: string | null; email: string | null; isAnonymous: boolean } {
  return { userId: currentUserId, email: currentEmail, isAnonymous: currentIsAnonymous };
}

/** Whether the signed-in user has the admin flag (profiles.is_admin). Best-effort. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured || !currentUserId) return false;
  try {
    const { data } = await supabase.from("profiles").select("is_admin").eq("id", currentUserId).maybeSingle();
    return !!data?.is_admin;
  } catch {
    return false;
  }
}

export interface AuthResult {
  ok: boolean;
  /** True when the account was created but email confirmation is still required. */
  needsConfirmation?: boolean;
  error?: string;
}

/**
 * Create an account with email + password. If the device is currently using an
 * anonymous identity, the account is CONVERTED IN PLACE (same user id) so all
 * existing data carries over. Otherwise a fresh account is created.
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Backend isn't configured on this build." };
  const e = email.trim().toLowerCase();
  try {
    const { data: sess } = await supabase.auth.getSession();
    const current = (sess.session?.user ?? null) as SbUser | null;

    if (current?.is_anonymous) {
      const { data, error } = await supabase.auth.updateUser({ email: e, password });
      if (error) throw error;
      const u = data.user as SbUser | null;
      if (u) applyUser(u);
      await ensureProfile();
      const needsConfirmation = !!u && !u.email_confirmed_at && !u.confirmed_at;
      return { ok: true, needsConfirmation };
    }

    const { data, error } = await supabase.auth.signUp({ email: e, password });
    if (error) throw error;
    if (data.user && data.session) applyUser(data.user as SbUser);
    await ensureProfile();
    // No session returned => the project requires email confirmation.
    return { ok: true, needsConfirmation: !data.session };
  } catch (err) {
    return { ok: false, error: authMessage(err) };
  }
}

/** Sign in to an existing account with email + password. */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Backend isn't configured on this build." };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (data.user) applyUser(data.user as SbUser);
    await ensureProfile();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: authMessage(err) };
  }
}

/**
 * Sign out of the account, then re-establish a fresh anonymous identity so the
 * app keeps working (and a new device-local profile starts clean).
 */
export async function signOutToAnonymous(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  applyUser(null);
  if (!isSupabaseConfigured) return;
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data.user) {
      applyUser(data.user as SbUser);
      await ensureProfile();
    }
  } catch {
    // ignore — UI will reflect signed-out/local state
  }
}
