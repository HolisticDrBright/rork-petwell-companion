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

  /** Latest completed triage for a pet — used to compile the vet report. */
  async getLatest(petId: string): Promise<{
    concernLabel: string | null;
    urgency: string;
    confidence: string;
    causes: { name: string; note?: string }[];
    redFlags: string[];
    summary: string | null;
    answers: { question: string; answer: string }[];
  } | null> {
    const { data: res, error } = await supabase
      .from("triage_results")
      .select("urgency, confidence, causes, red_flags, summary, session_id, created_at")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!res) return null;

    let concernLabel: string | null = null;
    let answers: { question: string; answer: string }[] = [];
    if (res.session_id) {
      const { data: sess } = await supabase
        .from("symptom_sessions")
        .select("concern_label")
        .eq("id", res.session_id)
        .maybeSingle();
      concernLabel = sess?.concern_label ?? null;
      const { data: a } = await supabase
        .from("symptom_answers")
        .select("question_text, answer_label")
        .eq("session_id", res.session_id)
        .order("sort", { ascending: true });
      answers = (a ?? []).map((x) => ({ question: x.question_text, answer: x.answer_label ?? "—" }));
    }
    return {
      concernLabel,
      urgency: res.urgency,
      confidence: res.confidence,
      causes: Array.isArray(res.causes) ? (res.causes as { name: string; note?: string }[]) : [],
      redFlags: Array.isArray(res.red_flags) ? (res.red_flags as string[]) : [],
      summary: res.summary,
      answers,
    };
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
