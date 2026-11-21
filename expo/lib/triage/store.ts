import { create } from "zustand";

import { getMode } from "@/lib/backend";
import { triageService, type AnswerInput } from "@/services";
import type { Pet } from "@/types/pet";

import { applyAnswer, buildOutcome, emptyContext, personalize } from "./engine";
import { getModule } from "./modules";
import type { AnswerOption, ConcernModule, Question, TriageContext, TriageOutcome } from "./types";

/**
 * Runtime state for one triage interview. The engine stays pure; this store
 * drives it and writes the session, every answer, and the result to Supabase
 * (best-effort — local mode just keeps it in memory). The most recent outcome
 * is kept so the result screen and the vet report can read it.
 */
interface TriageState {
  module: ConcernModule | null;
  ctx: TriageContext | null;
  history: TriageContext[];
  outcome: TriageOutcome | null;
  outcomePetId: string | null;
  concernLabel: string | null;
  remoteSession: Promise<string | null> | null;
  finishing: boolean;

  start: (pet: Pet, concernId: string) => void;
  answer: (q: Question, options: AnswerOption[]) => void;
  back: () => boolean;
  finish: (petId: string) => Promise<void>;
  reset: () => void;
}

export const useTriage = create<TriageState>((set, get) => ({
  module: null,
  ctx: null,
  history: [],
  outcome: null,
  outcomePetId: null,
  concernLabel: null,
  remoteSession: null,
  finishing: false,

  start: (pet, concernId) => {
    const module = getModule(concernId);
    const remoteSession = getMode() === "remote"
      ? triageService.createSession(pet.id, module.id, module.label).catch((error) => {
        console.warn("[petwell] triage session create failed:", error);
        return null;
      })
      : null;
    set({
      module,
      ctx: emptyContext(pet),
      history: [],
      outcome: null,
      outcomePetId: null,
      concernLabel: module.label,
      remoteSession,
      finishing: false,
    });
  },

  answer: (q, options) =>
    set((s) => s.ctx && !s.ctx.order.includes(q.id)
      ? { ctx: applyAnswer(s.ctx, q, options), history: [...s.history, s.ctx] }
      : s),

  back: () => {
    const { history } = get();
    if (history.length === 0) return false;
    set({ ctx: history[history.length - 1], history: history.slice(0, -1) });
    return true;
  },

  finish: async (petId) => {
    const { module, ctx, remoteSession, finishing } = get();
    if (!module || !ctx || finishing) return;
    set({ finishing: true });

    const outcome = buildOutcome(module, ctx);
    set({ outcome, outcomePetId: petId });

    if (!remoteSession) return;
    try {
      const remoteSessionId = await remoteSession;
      if (remoteSessionId) {
        const answers: AnswerInput[] = [];
        for (const qid of ctx.order) {
          const question = module.questions.find((q) => q.id === qid);
          if (!question) continue;
          for (const opt of ctx.picked[qid] ?? [null]) {
            answers.push({
              questionId: qid,
              questionText: personalize(question.text, ctx.pet),
              answerId: opt?.id,
              answerLabel: opt?.label ?? "Not sure",
              isRedFlag: !!opt?.redFlag,
              sort: answers.length,
            });
          }
        }
        if (answers.length) await triageService.addAnswers(remoteSessionId, answers);
        await triageService.completeSession(remoteSessionId, outcome.redFlags.length);
      }
      await triageService.saveResult(petId, {
        sessionId: remoteSessionId ?? undefined,
        outcome,
      });
    } catch (e) {
      console.warn("[petwell] triage save failed:", e);
    }
  },

  reset: () =>
    set({
      module: null,
      ctx: null,
      history: [],
      remoteSession: null,
      finishing: false,
    }),
}));
