// Common request flow for every AI function: CORS preflight, POST-only, provider
// availability (AI_ENABLED + key), auth, and daily budget — then runs the feature.
// Errors and disabled states return a friendly AiEnvelope, never a 500 the app
// can't parse.
import { json, preflight } from "./cors.ts";
import { type Caller, getCaller, serviceClient } from "./auth.ts";
import { type AiProvider, getProvider } from "./provider.ts";
import { checkBudget } from "./budget.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AiContext {
  caller: Caller;
  svc: SupabaseClient;
  provider: AiProvider;
}

export type AiEnvelope = {
  ok: boolean;
  disabled?: boolean;
  disabledReason?: string;
  error?: string;
  safety?: { routing: string | null; flags: string[]; banner: string | null; refused?: boolean };
  generationId?: string | null;
  data?: unknown;
};

export async function handleAi(
  req: Request,
  run: (ctx: AiContext, body: Record<string, unknown>) => Promise<AiEnvelope>,
): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const provider = getProvider();
  if (!provider) {
    return json({ ok: false, disabled: true, disabledReason: "AI is currently turned off on the server." });
  }
  const caller = await getCaller(req);
  if (!caller) return json({ ok: false, error: "Please sign in to use AI features." }, 401);

  const svc = serviceClient();
  const budget = await checkBudget(svc, caller.userId);
  if (!budget.ok) return json({ ok: false, disabled: true, disabledReason: budget.reason });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ ok: false, error: "Please provide a valid request." }, 400);
    }
    // These functions use a service client, so explicitly establish ownership
    // before reading pet context or writing a generation associated with it.
    if (body.petId !== undefined && body.petId !== null) {
      if (typeof body.petId !== "string") return json({ ok: false, error: "Pet not available." }, 403);
      const { data, error } = await svc.from("pet_profiles").select("id")
        .eq("id", body.petId).eq("owner_id", caller.userId).maybeSingle();
      if (error || !data) return json({ ok: false, error: "Pet not available." }, 403);
    }
    const env = await run({ caller, svc, provider }, body);
    return json(env);
  } catch (e) {
    console.error("Petwell AI request failed", e instanceof Error ? e.name : "unknown");
    return json({ ok: false, error: "AI request failed. Please try again." });
  }
}
