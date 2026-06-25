import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { IntegrativePlan } from "@/lib/integrative/types";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

export const integrativeService = {
  /** Persist a generated integrative plan (best-effort; no-op in local mode). */
  async savePlan(
    petId: string,
    input: { triageResultId?: string | null; plan: IntegrativePlan }
  ): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    const { plan } = input;
    const { error } = await supabase.from("protocol_recommendations").insert({
      pet_id: petId,
      owner_id,
      triage_result_id: input.triageResultId ?? null,
      system_slug: plan.system,
      condition_slug: plan.conditionTemplateId ?? null,
      urgency: plan.urgency,
      emergency_override: plan.emergencyOverride,
      plan: asJson(plan),
    });
    if (error) throw error;
  },

  /** Read the condition-meal-plan catalog (e.g. for a browse / picker view). */
  async listConditionPlans(): Promise<{ slug: string; title: string; system_slug: string }[]> {
    const { data, error } = await supabase
      .from("condition_meal_plans")
      .select("slug, title, system_slug")
      .order("title", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};
