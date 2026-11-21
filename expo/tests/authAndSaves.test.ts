import assert from "node:assert/strict";
// @ts-expect-error Bun's test runtime is supplied by the test command.
import { mock } from "bun:test";

type User = { id: string; email: string };
let user: User | null = null;
let anonymousCalls = 0;
let resetError: Error | null = null;
let rpcError: Error | null = null;
let exchangeCalls = 0;
let updateCalls = 0;
let signupRedirect: string | undefined;
let signInError: { code: string } | null = null;
let resendError: { status: number } | null = null;
let resendInput: unknown;
const callbacks = new Set<(event: string, session: { user: User } | null) => void>();
const emit = (event: string) => callbacks.forEach(fn => fn(event, user ? { user } : null));
mock.module("../lib/config", () => ({ config: { isProduction: true, useApi: true } }));
mock.module("../lib/supabase", () => ({ isSupabaseConfigured: true, supabase: {
  auth: {
    onAuthStateChange(fn: (event: string, session: { user: User } | null) => void) { callbacks.add(fn); return { data: { subscription: { unsubscribe: () => callbacks.delete(fn) } } }; },
    async getSession() { return { data: { session: user ? { user } : null }, error: null }; },
    async getUser() { return { data: { user }, error: null }; },
    async signInAnonymously() { anonymousCalls++; throw new Error("Anonymous disabled"); },
    async signInWithPassword() {
      if (signInError) return { data: { user: null, session: null }, error: signInError };
      user = { id: "account-a", email: "test@example.invalid" };
      emit("SIGNED_IN");
      return { data: { user, session: { user } }, error: null };
    },
    async signOut() { user = null; emit("SIGNED_OUT"); return { error: null }; },
    async signUp(input: { options?: { emailRedirectTo?: string } }) { signupRedirect = input.options?.emailRedirectTo; return { data: { user: null, session: null }, error: null }; },
    async resend(input: unknown) { resendInput = input; return { error: resendError }; },
    async resetPasswordForEmail() { return { error: resetError }; },
    async exchangeCodeForSession(code: string) {
      exchangeCalls++;
      if (code === "expired") return { data: { session: null }, error: new Error("Expired") };
      user = { id: "account-a", email: "test@example.invalid" };
      emit(code === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN");
      return { data: { session: { user } }, error: null };
    },
    async updateUser() { updateCalls++; return { error: resetError }; },
  },
  from: () => ({ upsert: async () => ({ error: null }) }),
  async rpc(name: string) {
    if (rpcError) return { data: null, error: rpcError };
    return { data: name === "add_timeline_event" ? { id: "confirmed", pet_id: "pet", category: "weight", title: "Weight", event_date: "2026-11-19" } : { id: "pet", name: "Scout", species: "dog", pet_conditions: [{ label: "condition" }] }, error: null };
  },
} }));

const backend = await import("../lib/backend");
assert.equal((await backend.initBackend()).userId, null);
assert.equal(anonymousCalls, 0, "Production must not require guest auth");
assert.equal((await backend.signInWithEmail("test@example.invalid", "password")).ok, true);
assert.equal((await backend.initBackend()).userId, "account-a", "Bootstrap cannot cache signed-out mode");
const { timelineService } = await import("../services/timelineService");
const { petsService } = await import("../services/petsService");
const input = { category: "weight" as const, title: "Weight", date: "2026-11-19", time: "12:00" };
rpcError = new Error("Database unavailable");
await assert.rejects(timelineService.addEvent("pet", input), /Database unavailable/);
await assert.rejects(petsService.createPet({ name: "Scout", species: "dog" }), /Database unavailable/);
rpcError = null;
assert.equal((await timelineService.addEvent("pet", input)).id, "confirmed");
assert.deepEqual((await petsService.createPet({ name: "Scout", species: "dog" })).conditions, ["condition"]);
await backend.signOutToAnonymous();
assert.equal(backend.getUserId(), null);
assert.equal(anonymousCalls, 0);
assert.equal((await backend.signUpWithEmail("test@example.invalid", "password", "petwell://account")).needsConfirmation, true);
assert.equal(signupRedirect, "petwell://account");
signInError = { code: "email_not_confirmed" };
assert.deepEqual(await backend.signInWithEmail("test@example.invalid", "password"), {
  ok: false,
  needsConfirmation: true,
  error: "Confirm your email before signing in.",
});
assert.equal(backend.getUserId(), null);
signInError = null;
await backend.resendSignupConfirmation(" Test@example.invalid ", "petwell://account");
assert.deepEqual(resendInput, {
  type: "signup",
  email: "test@example.invalid",
  options: { emailRedirectTo: "petwell://account" },
});
resendError = { status: 429 };
await assert.rejects(backend.resendSignupConfirmation("test@example.invalid", "petwell://account"), /wait a minute/);
resendError = { status: 500 };
await assert.rejects(backend.resendSignupConfirmation("test@example.invalid", "petwell://account"), /Couldn’t resend/);
const { redirectSystemPath } = await import("../app/+native-intent");
assert.equal(redirectSystemPath({ path: "petwell://account?code=signup", initial: true }), "/account");
assert.equal(redirectSystemPath({ path: "petwell:///reset-password?code=recovery", initial: true }), "/reset-password?code=recovery");

const recovery = await import("../lib/authRecovery");
resetError = new Error("Email unavailable");
await assert.rejects(recovery.requestPasswordReset("test@example.invalid", "petwell://reset-password"), /Could not send a reset email/);
resetError = null;
await recovery.requestPasswordReset("test@example.invalid", "petwell://reset-password");
await assert.rejects(recovery.acceptRecoveryCode("expired"), /invalid or expired/);
await assert.rejects(recovery.acceptRecoveryCode("ordinary-signin"), /invalid or expired/);
const before = exchangeCalls;
await Promise.all([recovery.acceptRecoveryCode("recovery"), recovery.acceptRecoveryCode("recovery")]);
assert.equal(exchangeCalls, before + 1, "Strict-mode effects must not redeem a code twice");
user = { id: "account-b", email: "other@example.invalid" };
await assert.rejects(recovery.finishPasswordReset("newpassword"), /expired/);
assert.equal(updateCalls, 0, "Cannot reset a different session's password");
user = { id: "account-a", email: "test@example.invalid" };
await recovery.finishPasswordReset("newpassword");
assert.equal(updateCalls, 1);
await assert.rejects(recovery.finishPasswordReset("newpassword"), /expired/);
console.log("PASS authentication, server save failures, recovery errors, one-time exchange, and session isolation");
