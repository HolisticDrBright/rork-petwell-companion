import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { TriageOutcome } from "@/lib/triage/types";
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
    args: { sessionId?: string; outcome: TriageOutcome }
  ): Promise<string> {
    const owner_id = requireUserId();
    const { outcome } = args;
    const { data, error } = await supabase
      .from("triage_results")
      .insert({
        pet_id: petId,
        owner_id,
        session_id: args.sessionId ?? null,
        urgency: outcome.urgency,
        confidence: outcome.confidence,
        causes: asJson(outcome.causes),
        supports: asJson(outcome.supports),
        changes_urgency: asJson(outcome.changesUrgency),
        steps: asJson(outcome.steps),
        summary: outcome.summary,
        red_flags: asJson(outcome.redFlags),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },
};
