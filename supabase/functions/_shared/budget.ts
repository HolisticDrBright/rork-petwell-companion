// Cost estimation + daily budget guards. Keeps AI spend bounded and observable.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rough rates in cents per 1M tokens (gpt-4.1-mini defaults). Estimation only —
// the goal is a bound, not billing accuracy.
const INPUT_CENTS_PER_M = Number(Deno.env.get("AI_INPUT_CENTS_PER_M") ?? "40");
const OUTPUT_CENTS_PER_M = Number(Deno.env.get("AI_OUTPUT_CENTS_PER_M") ?? "160");

export function estimateCostCents(tokensIn: number, tokensOut: number): number {
  const c = (tokensIn / 1_000_000) * INPUT_CENTS_PER_M + (tokensOut / 1_000_000) * OUTPUT_CENTS_PER_M;
  return Math.round(c * 1000) / 1000; // keep 3 decimals
}

function startOfUtcDayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfUtcMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function spentCentsSince(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { data } = await svc.from("ai_generations").select("estimated_cost_cents").gte("created_at", sinceIso);
  return (data ?? []).reduce(
    (s: number, r: { estimated_cost_cents: number | null }) => s + Number(r.estimated_cost_cents ?? 0),
    0,
  );
}

/**
 * AI spend guardrails, all enforced server-side before any model call:
 *  - per-user daily call cap        AI_USER_DAILY_LIMIT      (default 100/day)
 *  - global daily cents budget      AI_DAILY_BUDGET_CENTS    (0/unset = off)
 *  - global monthly cents budget    AI_MONTHLY_BUDGET_CENTS  (default 5000 = $50/mo)
 * Returns ok=false with a friendly, user-facing reason — the client renders it
 * as the graceful "AI is unavailable" state, never an error.
 */
export async function checkBudget(
  svc: SupabaseClient,
  ownerId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const since = startOfUtcDayIso();
  const capCents = Number(Deno.env.get("AI_DAILY_BUDGET_CENTS") ?? "0");
  const monthlyCapCents = Number(Deno.env.get("AI_MONTHLY_BUDGET_CENTS") ?? "5000");
  const userCap = Number(Deno.env.get("AI_USER_DAILY_LIMIT") ?? "100");

  if (monthlyCapCents > 0) {
    const spentThisMonth = await spentCentsSince(svc, startOfUtcMonthIso());
    if (spentThisMonth >= monthlyCapCents) {
      return { ok: false, reason: "Petwell's monthly AI budget has been reached. AI features will return next month." };
    }
  }

  if (capCents > 0) {
    const spent = await spentCentsSince(svc, since);
    if (spent >= capCents) {
      return { ok: false, reason: "Petwell's daily AI budget has been reached. Please try again tomorrow." };
    }
  }

  if (userCap > 0) {
    const { count } = await svc
      .from("ai_generations")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .gte("created_at", since);
    if ((count ?? 0) >= userCap) {
      return { ok: false, reason: "You've reached today's AI usage limit. Please try again tomorrow." };
    }
  }

  return { ok: true };
}
