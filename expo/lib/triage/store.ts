import { create } from "zustand";

import { getMode } from "@/lib/backend";
import { triageService } from "@/services";
import type { Pet } from "@/types/pet";

import { applyAnswer, buildOutcome, emptyContext } from "./engine";
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
  remoteSessionId: string | null;
  finishing: boolean;

  start: (pet: Pet, concernId: string) => void;
  answer: (q: Question, option: AnswerOption | null) => void;
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
  remoteSessionId: null,
  finishing: false,

  start: (pet, concernId) => {
    const module = getModule(concernId);
    set({
      module,
      ctx: emptyContext(pet),
      history: [],
      outcome: null,
      outcomePetId: null,
      concernLabel: module.label,
      remoteSessionId: null,
      finishing: false,
    });
    if (getMode() === "remote") {
      triageService
        .createSession(pet.id, module.id, module.label)
        .then((id) => set({ remoteSessionId: id }))
        .catch((e) => console.warn("[petwell] triage session create failed:", e));
    }
  },

  answer: (q, option) =>
    // Functional update so two rapid taps each apply against the latest state.
    set((s) => (s.ctx ? { ctx: applyAnswer(s.ctx, q, option), history: [...s.history, s.ctx] } : s)),

  back: () => {
    const { history } = get();
    if (history.length === 0) return false;
    set({ ctx: history[history.length - 1], history: history.slice(0, -1) });
    return true;
  },

  finish: async (petId) => {
    const { module, ctx, remoteSessionId, finishing } = get();
    if (!module || !ctx || finishing) return;
    set({ finishing: true });

    const outcome = buildOutcome(module, ctx);
    set({ outcome, outcomePetId: petId });

    if (getMode() !== "remote") return;
    try {
      let sort = 0;
      for (const qid of ctx.order) {
        const question = module.questions.find((q) => q.id === qid);
        if (!remoteSessionId || !question) continue;
        const opt = ctx.picked[qid];
        await triageService.addAnswer(remoteSessionId, {
          questionId: qid,
          questionText: question.text,
          answerId: opt?.id,
          answerLabel: opt?.label ?? "Not sure",
          isRedFlag: !!opt?.redFlag,
          sort: sort++,
        });
      }
      if (remoteSessionId) {
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
      finishing: false,
    }),
}));
