import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { PetHealthScore } from "@/lib/health/score";
import type { DetectedPattern } from "@/lib/integrative/patterns";
import type { TreatAuditResult } from "@/lib/integrative/treats";
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

  /** Persist a Petwell Health Score snapshot + its sub-scores (best-effort). */
  async saveHealthScore(petId: string, score: PetHealthScore): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    const { data, error } = await supabase
      .from("health_scores")
      .insert({
        pet_id: petId,
        owner_id,
        overall: score.overall,
        band: score.band,
        headline: score.headline,
        generated_at: score.generatedAt,
        systems: asJson(score.systems),
      })
      .select("id")
      .single();
    if (error) throw error;
    const hsId = data?.id;
    if (hsId) {
      const rows = score.systems.map((s) => ({
        health_score_id: hsId,
        owner_id,
        key: s.key,
        label: s.label,
        score: s.score,
        band: s.band,
        status: s.status,
      }));
      await supabase.from("system_scores").insert(rows);
    }
  },

  /** Persist detected patterns for a pet (best-effort). */
  async savePatterns(petId: string, patterns: DetectedPattern[]): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id || patterns.length === 0) return;
    const rows = patterns.map((p) => ({
      pet_id: petId,
      owner_id,
      pattern_id: p.id,
      name: p.name,
      system_slug: p.system,
      confidence: p.confidence,
      urgent: p.urgent,
      summary: p.summary,
      payload: asJson(p),
    }));
    const { error } = await supabase.from("detected_patterns").insert(rows);
    if (error) throw error;
  },

  /** Persist a treat audit result (best-effort). */
  async saveTreatAudit(petId: string, audit: TreatAuditResult): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    const { error } = await supabase.from("treat_audits").insert({
      pet_id: petId,
      owner_id,
      name: audit.name,
      verdict: audit.verdict,
      calories: audit.caloriesPerTreat,
      fat_level: audit.fatLevel,
      payload: asJson(audit),
    });
    if (error) throw error;
  },

  // ── Progress programs (remote mirror of the local-first store) ──
  /** Create a program row remotely; returns its id (null in local mode). */
  async startProgramRemote(petId: string, templateId: string): Promise<string | null> {
    const owner_id = getUserId();
    if (!owner_id) return null;
    const { data, error } = await supabase
      .from("progress_programs")
      .insert({ pet_id: petId, owner_id, template_id: templateId, status: "active", logged_days: [] })
      .select("id")
      .single();
    if (error) throw error;
    return data?.id ?? null;
  },

  /** Update a remote program's logged days + status (best-effort). */
  async updateProgramRemote(
    id: string,
    input: { loggedDays: number[]; status: "active" | "completed" | "stopped" }
  ): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    await supabase
      .from("progress_programs")
      .update({ logged_days: input.loggedDays, status: input.status })
      .eq("id", id);
  },

  /** Append a program day log (best-effort). */
  async logProgramDayRemote(programId: string, day: number): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    await supabase.from("program_logs").insert({ program_id: programId, owner_id, day });
  },

  // ── Catalog reads (world-readable) ──
  async listConditionPlans(): Promise<{ slug: string; title: string; system_slug: string }[]> {
    const { data, error } = await supabase
      .from("condition_meal_plans")
      .select("slug, title, system_slug")
      .order("title", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listMealPlans(): Promise<{ slug: string; title: string; condition_slug: string | null }[]> {
    const { data, error } = await supabase
      .from("meal_plans")
      .select("slug, title, condition_slug")
      .order("title", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async listEnvironmentRisks(): Promise<{ slug: string; label: string }[]> {
    const { data, error } = await supabase.from("environment_risks").select("slug, label");
    if (error) throw error;
    return data ?? [];
  },

  async listMarketplaceProducts(
    category?: string
  ): Promise<{ slug: string; name: string; category: string }[]> {
    let q = supabase.from("marketplace_products").select("slug, name, category");
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};
