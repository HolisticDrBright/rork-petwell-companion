import { Urgency, type UrgencyKey } from "@/constants/colors";
import type { Pet } from "@/types/pet";

import {
  RED_FLAGS,
  bandFromPoints,
  isYoung,
  maxUrgency,
  redFlagLabelFor,
  redFlagUrgencyFor,
} from "./redFlags";
import type {
  AnswerOption,
  ConcernModule,
  Confidence,
  Question,
  RankedCause,
  TriageContext,
  TriageOutcome,
} from "./types";

const MAX_QUESTIONS = 8;
const GI_MODULES = new Set(["diarrhea", "vomiting", "appetite"]);

export function emptyContext(pet: Pet): TriageContext {
  return { pet, picked: {}, order: [] };
}

/** Replace {name} tokens in copy with the pet's name. */
export function personalize(text: string, pet: Pet): string {
  return text.replace(/\{name\}/g, pet.name);
}

export function getQuestion(module: ConcernModule, id: string): Question | undefined {
  return module.questions.find((q) => q.id === id);
}

/** Record an answer (opt === null means "I'm not sure"). Immutable. */
export function applyAnswer(ctx: TriageContext, q: Question, opt: AnswerOption | null): TriageContext {
  const picked = { ...ctx.picked };
  if (opt) picked[q.id] = opt;
  else delete picked[q.id];
  const order = ctx.order.includes(q.id) ? ctx.order : [...ctx.order, q.id];
  return { ...ctx, picked, order };
}

/** True once a red-flag answer in a short-circuit question signals an emergency. */
function emergencyTriggered(module: ConcernModule, ctx: TriageContext): boolean {
  return module.questions.some((q) => {
    if (!q.shortCircuit) return false;
    const opt = ctx.picked[q.id];
    return !!opt?.redFlag && redFlagUrgencyFor(opt.redFlag, ctx.pet) === "red";
  });
}

/** Adaptive: the next applicable, unanswered question — or null when done. */
export function nextQuestion(module: ConcernModule, ctx: TriageContext): Question | null {
  if (emergencyTriggered(module, ctx)) return null;
  if (ctx.order.length >= MAX_QUESTIONS) return null;
  for (const q of module.questions) {
    if (ctx.order.includes(q.id)) continue;
    if (q.when && !q.when(ctx)) continue;
    return q;
  }
  return null;
}

export function estimateTotal(module: ConcernModule, ctx: TriageContext): number {
  let n = 0;
  for (const q of module.questions) {
    if (ctx.order.includes(q.id)) {
      n++;
      continue;
    }
    if (q.when && !q.when(ctx)) continue;
    n++;
  }
  return Math.min(MAX_QUESTIONS, Math.max(n, ctx.order.length + 1));
}

/** Deterministic urgency. Red flags + compound pet rules can only raise it. */
export function computeUrgency(
  module: ConcernModule,
  ctx: TriageContext
): { urgency: UrgencyKey; redFlags: string[] } {
  let urgency = module.baseUrgency;
  let points = 0;
  const flags: string[] = [];
  const seen = new Set<string>();

  for (const qid of ctx.order) {
    const opt = ctx.picked[qid];
    if (!opt) continue;
    if (opt.points) points += opt.points;
    if (opt.urgencyFloor) urgency = maxUrgency(urgency, opt.urgencyFloor);
    if (opt.redFlag) {
      urgency = maxUrgency(urgency, redFlagUrgencyFor(opt.redFlag, ctx.pet));
      const label = redFlagLabelFor(opt.redFlag, ctx.pet);
      if (!seen.has(label)) {
        seen.add(label);
        flags.push(label);
      }
    }
  }

  // Pet-aware compound rule: very young pet with GI signs has less reserve.
  if (isYoung(ctx.pet) && GI_MODULES.has(module.id)) {
    urgency = maxUrgency(urgency, RED_FLAGS.youngWithGI.urgency);
    const label = `Puppy/kitten with ${module.label.toLowerCase()} — escalate sooner`;
    if (!seen.has(label)) flags.push(label);
  }

  urgency = maxUrgency(urgency, bandFromPoints(points));
  return { urgency, redFlags: flags };
}

interface ScoredCause {
  id: string;
  name: string;
  note: string;
  score: number;
}

function scoreCauses(module: ConcernModule, ctx: TriageContext): ScoredCause[] {
  const scores: Record<string, number> = {};
  // Small prior by listed order (earlier = slightly more likely a priori).
  module.causes.forEach((c, i) => {
    scores[c.id] = (module.causes.length - i) * 0.5;
  });
  if (module.priors) {
    for (const [k, v] of Object.entries(module.priors(ctx))) {
      scores[k] = (scores[k] ?? 0) + v;
    }
  }
  for (const qid of ctx.order) {
    const w = ctx.picked[qid]?.causeWeights;
    if (!w) continue;
    for (const [k, v] of Object.entries(w)) scores[k] = (scores[k] ?? 0) + v;
  }
  return module.causes
    .map((c) => ({ id: c.id, name: c.name, note: c.note, score: scores[c.id] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

export function rankCauses(module: ConcernModule, ctx: TriageContext): RankedCause[] {
  return scoreCauses(module, ctx)
    .slice(0, 5)
    .map((x, i) => ({ rank: i + 1, name: x.name, note: x.note }));
}

function computeConfidence(ctx: TriageContext, scored: ScoredCause[]): Confidence {
  const answered = Object.keys(ctx.picked).length;
  const unsure = ctx.order.length - answered;
  const separation = (scored[0]?.score ?? 0) - (scored[1]?.score ?? 0);
  let conf: Confidence = "Low";
  if (answered >= 5 && separation >= 2) conf = "High";
  else if (answered >= 3) conf = "Moderate";
  if (unsure >= 2 && conf === "High") conf = "Moderate";
  return conf;
}

function collectSupports(ctx: TriageContext): string[] {
  const out: string[] = [];
  for (const qid of ctx.order) {
    const s = ctx.picked[qid]?.support;
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 6);
}

function buildSteps(module: ConcernModule, urgency: UrgencyKey, pet: Pet): string[] {
  const name = pet.name;
  let steps: string[];
  if (urgency === "red") {
    steps = [
      "Treat this as urgent — contact an emergency vet or your regular vet right now.",
      `Keep ${name} calm and warm, and limit movement on the way.`,
      "If a toxin or injury may be involved, bring the packaging or note what happened.",
      "Don't give food, water, or medication unless a vet tells you to.",
    ];
  } else if (urgency === "orange") {
    steps = [
      "Call your vet today and ask for a same-day appointment.",
      ...module.homeCare.slice(0, 2),
      "Watch closely — escalate to emergency care if any red-flag sign appears.",
    ];
  } else if (urgency === "amber") {
    steps = [
      "Book a vet visit in the next 1–2 days.",
      ...module.homeCare,
      "Log symptoms with photos so the vet can see the trend.",
    ];
  } else {
    steps = [
      ...module.homeCare,
      `Keep logging in Petwell and recheck ${name} in 12–24 hours.`,
      "Book a vet if things get worse or don't improve.",
    ];
  }
  return steps.map((s) => personalize(s, pet));
}

function buildSummary(
  module: ConcernModule,
  ctx: TriageContext,
  urgency: UrgencyKey,
  confidence: Confidence,
  causes: RankedCause[],
  redFlags: string[]
): string {
  const p = ctx.pet;
  const top = causes.slice(0, 3).map((c) => c.name).join(", ") || "none determined";
  const flags = redFlags.length ? redFlags.join("; ") : "none reported";
  const answers = ctx.order
    .map((qid) => {
      const opt = ctx.picked[qid];
      const q = getQuestion(module, qid);
      if (!q) return null;
      return `${q.text} — ${opt ? opt.label : "unsure"}`;
    })
    .filter(Boolean) as string[];

  return [
    `${p.name} (${p.ageYears} yr ${p.breed}, ${p.sex}) — concern: ${module.label}.`,
    `Triage urgency: ${Urgency[urgency].label} · ${confidence} confidence.`,
    `Red flags: ${flags}.`,
    `Possible causes to consider: ${top}.`,
    "Intake answers:",
    ...answers.map((a) => `  • ${a}`),
    "Note: triage guidance only, not a diagnosis. Prepared via Petwell for veterinary review.",
  ].join("\n");
}

export function buildOutcome(module: ConcernModule, ctx: TriageContext): TriageOutcome {
  const { urgency, redFlags } = computeUrgency(module, ctx);
  const scored = scoreCauses(module, ctx);
  const causes = scored.slice(0, 5).map((x, i) => ({ rank: i + 1, name: x.name, note: x.note }));
  const confidence = computeConfidence(ctx, scored);
  const supports = collectSupports(ctx);
  const steps = buildSteps(module, urgency, ctx.pet);
  const summary = buildSummary(module, ctx, urgency, confidence, causes, redFlags);
  return {
    urgency,
    confidence,
    causes,
    supports,
    changesUrgency: module.changesUrgency,
    steps,
    redFlags,
    summary,
  };
}
