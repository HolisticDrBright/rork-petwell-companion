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
let currentMode: BackendMode = "local";
let initPromise: Promise<{ mode: BackendMode; userId: string | null }> | null = null;

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
  if (!isSupabaseConfigured) return { mode: "local", userId: null };

  const { data: sessionData } = await supabase.auth.getSession();
  let user = sessionData.session?.user ?? null;

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    user = data.user;
  }
  if (!user) throw new Error("no anonymous user");

  // Make sure a profile row exists for this user (idempotent).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id" });
  if (profileError) throw profileError;

  currentUserId = user.id;
  currentMode = "remote";
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

/** Sign out + reset (used by destructive settings actions). */
export async function resetBackend(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
  currentUserId = null;
  currentMode = "local";
  initPromise = null;
}
