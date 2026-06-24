import type { UrgencyKey } from "@/constants/colors";
import type { TriageResult } from "@/constants/triage";
import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

export interface AnswerInput {
  questionId: string;
  questionText: string;
  answerId?: string;
  answerLabel?: string;
  isRedFlag?: boolean;
  sort?: number;
}

export const triageService = {
  async createSession(
    petId: string,
    concern: string,
    concernLabel?: string
  ): Promise<string> {
    const owner_id = requireUserId();
    const { data, error } = await supabase
      .from("symptom_sessions")
      .insert({ pet_id: petId, owner_id, concern, concern_label: concernLabel ?? null })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  async addAnswer(sessionId: string, a: AnswerInput): Promise<void> {
    const { error } = await supabase.from("symptom_answers").insert({
      session_id: sessionId,
      question_id: a.questionId,
      question_text: a.questionText,
      answer_id: a.answerId ?? null,
      answer_label: a.answerLabel ?? null,
      is_red_flag: a.isRedFlag ?? false,
      sort: a.sort ?? 0,
    });
    if (error) throw error;
  },

  async completeSession(sessionId: string, redFlagCount: number): Promise<void> {
    const { error } = await supabase
      .from("symptom_sessions")
      .update({
        status: "completed",
        red_flag_count: redFlagCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (error) throw error;
  },

  /** Persist the triage outcome ("possible causes" + urgency, never a diagnosis). */
  async saveResult(
    petId: string,
    args: { sessionId?: string; urgency: UrgencyKey; confidence: TriageResult["confidence"]; result: TriageResult }
  ): Promise<string> {
    const owner_id = requireUserId();
    const { result } = args;
    const { data, error } = await supabase
      .from("triage_results")
      .insert({
        pet_id: petId,
        owner_id,
        session_id: args.sessionId ?? null,
        urgency: args.urgency,
        confidence: args.confidence,
        causes: asJson(result.causes),
        supports: asJson(result.supports),
        changes_urgency: asJson(result.changesUrgency),
        steps: asJson(result.steps),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },
};
