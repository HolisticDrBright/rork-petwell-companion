// Persist every AI call to ai_generations (token + cost accounting, safety flags,
// review_status). Uses the service-role client. PII minimization: input_refs holds
// IDs/paths, not raw documents; user_visible_text is what we already showed the user.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { estimateCostCents } from "./budget.ts";

export interface LogInput {
  ownerId: string;
  petId?: string | null;
  feature: string;
  model: string;
  provider: string;
  promptVersion: string;
  inputRefs?: Record<string, unknown> | null;
  output?: unknown;
  userVisibleText?: string | null;
  safetyFlags?: string[] | null;
  reviewStatus?: "generated" | "needs_review" | "approved" | "rejected";
  tokensIn: number;
  tokensOut: number;
}

/** Insert an ai_generations row; returns its id (or null on failure — never throws). */
export async function logGeneration(svc: SupabaseClient, input: LogInput): Promise<string | null> {
  try {
    const { data } = await svc
      .from("ai_generations")
      .insert({
        owner_id: input.ownerId,
        pet_id: input.petId ?? null,
        feature: input.feature,
        model: input.model,
        provider: input.provider,
        prompt_version: input.promptVersion,
        input_refs: input.inputRefs ?? null,
        output: (input.output ?? null) as never,
        user_visible_text: input.userVisibleText ?? null,
        safety_flags: (input.safetyFlags ?? null) as never,
        review_status: input.reviewStatus ?? "generated",
        token_input: input.tokensIn,
        token_output: input.tokensOut,
        estimated_cost_cents: estimateCostCents(input.tokensIn, input.tokensOut),
      })
      .select("id")
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
