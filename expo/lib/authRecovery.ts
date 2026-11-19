import { supabase, isSupabaseConfigured } from "./supabase";

let recoveryUserId: string | null = null;
let pending: { code: string; result: Promise<void> } | null = null;

export async function requestPasswordReset(email: string, redirectTo: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Account services are unavailable. Please try again later.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new Error("Could not send a reset email. Please try again in a moment.");
}

export function acceptRecoveryCode(code: string): Promise<void> {
  if (pending?.code === code) return pending.result;
  recoveryUserId = null;
  const result = (async () => {
    let recoveredId: string | null = null;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") recoveredId = session?.user.id ?? null;
    });
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session || recoveredId !== data.session.user.id) {
        throw new Error("This reset link is invalid or expired. Request a new link on this device.");
      }
      recoveryUserId = recoveredId;
    } finally {
      listener.subscription.unsubscribe();
    }
  })();
  pending = { code, result };
  return result;
}

export async function finishPasswordReset(password: string): Promise<void> {
  if (password.length < 8) throw new Error("Use at least 8 characters.");
  const { data, error } = await supabase.auth.getUser();
  if (error || !recoveryUserId || data.user?.id !== recoveryUserId) {
    throw new Error("Your reset session has expired. Request a new reset link.");
  }
  const result = await supabase.auth.updateUser({ password });
  if (result.error) throw result.error;
  recoveryUserId = null;
  pending = null;
}
