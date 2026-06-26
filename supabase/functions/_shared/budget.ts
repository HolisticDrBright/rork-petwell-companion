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

/**
 * Returns ok=false when the global daily cents budget or a per-user daily call
 * cap is exceeded. Both are optional (0/unset = no limit).
 */
export async function checkBudget(
  svc: SupabaseClient,
  ownerId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const since = startOfUtcDayIso();
  const capCents = Number(Deno.env.get("AI_DAILY_BUDGET_CENTS") ?? "0");
  const userCap = Number(Deno.env.get("AI_USER_DAILY_LIMIT") ?? "100");

  if (capCents > 0) {
    const { data } = await svc
      .from("ai_generations")
      .select("estimated_cost_cents")
      .gte("created_at", since);
    const spent = (data ?? []).reduce(
      (s: number, r: { estimated_cost_cents: number | null }) => s + Number(r.estimated_cost_cents ?? 0),
      0,
    );
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
