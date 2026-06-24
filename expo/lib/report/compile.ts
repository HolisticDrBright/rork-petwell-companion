import { Urgency } from "@/constants/colors";
import { RED_FLAGS } from "@/lib/triage/redFlags";

import type {
  ReportData,
  ReportMedication,
  ReportPet,
  ReportScan,
  ReportTimelineItem,
} from "./types";

// The core OBSERVABLE critical red flags for the present/absent checklist, each
// with keyword matchers. Matchers (not fuzzy first-token matching) decide
// present/absent so a relabeled flag like "Male cat unable to urinate —
// possible urinary blockage" maps to the urinary flag (via "urinate"/"urinary")
// and NOT to the toxin flag (it merely contains the word "possible").
// Contextual qualifiers (young-pet-GI / senior-worsening) are intentionally
// excluded — they're pet-state qualifiers, not signs an owner checks off.
const CANONICAL_RED_FLAGS: { label: string; match: string[] }[] = [
  { label: RED_FLAGS.breathing.label, match: ["breath"] },
  { label: RED_FLAGS.collapse.label, match: ["collapse", "faint"] },
  { label: RED_FLAGS.seizure.label, match: ["seizure"] },
  { label: RED_FLAGS.paleGums.label, match: ["pale", "blue", "white"] },
  { label: RED_FLAGS.severeLethargy.label, match: ["letharg", "rouse", "unrespons"] },
  { label: RED_FLAGS.toxin.label, match: ["toxin", "poison"] },
  { label: RED_FLAGS.trauma.label, match: ["trauma", "injur"] },
  { label: RED_FLAGS.repeatedVomiting.label, match: ["vomit"] },
  { label: RED_FLAGS.bloodStoolVomit.label, match: ["blood"] },
  { label: RED_FLAGS.cantUrinate.label, match: ["urinate", "urinary", "urine", "straining"] },
];

export interface CompileInput {
  generatedAt: string;
  pet: ReportPet;
  allergies: string[];
  conditions: string[];
  timeline: ReportTimelineItem[];
  triage: {
    concernLabel: string | null;
    urgency: string;
    confidence: string;
    causes: { name: string; note?: string }[];
    redFlags: string[];
    summary?: string | null;
    answers: { question: string; answer: string }[];
  } | null;
  scans: ReportScan[];
  medications: ReportMedication[];
}

function urgencyLabel(key: string): string {
  return (Urgency as Record<string, { label: string }>)[key]?.label ?? key;
}

function splitRedFlags(present: string[]): { present: string[]; absent: string[] } {
  const presentLc = present.map((p) => p.toLowerCase());
  const isPresent = (c: { match: string[] }) =>
    presentLc.some((p) => c.match.some((m) => p.includes(m)));
  return { present, absent: CANONICAL_RED_FLAGS.filter((c) => !isPresent(c)).map((c) => c.label) };
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function buildConcernSummary(input: CompileInput): string | null {
  const name = input.pet.name;
  if (input.triage) {
    const concern = input.triage.concernLabel ?? "a health concern";
    const top = input.triage.causes[0]?.name;
    return (
      `${name} was triaged for ${concern.toLowerCase()} — urgency ${urgencyLabel(input.triage.urgency)} ` +
      `(${input.triage.confidence} confidence)` +
      (top ? `; leading consideration: ${top.toLowerCase()}.` : ".")
    );
  }
  const recent = input.timeline
    .filter((t) => ["symptom", "skin", "stool", "scan"].includes(t.category))
    .slice(0, 3)
    .map((t) => t.title.toLowerCase());
  if (recent.length) return `Owner is currently tracking: ${recent.join(", ")}.`;
  return `Routine check-in for ${name}. No active concern logged.`;
}

function generateQuestions(input: CompileInput): string[] {
  const name = input.pet.name;
  const qs: string[] = [];

  if (input.triage) {
    qs.push(
      `Given the ${urgencyLabel(input.triage.urgency).toLowerCase()} triage result, what should we rule out first?`
    );
    const top = input.triage.causes[0];
    if (top) qs.push(`Could this be ${top.name.toLowerCase()} — how would we confirm or rule it out?`);
  }
  if (input.allergies.length) {
    qs.push(`Could ${name}'s signs be linked to the known ${input.allergies[0].toLowerCase()} sensitivity?`);
  }
  if (input.timeline.some((t) => t.category === "food")) {
    qs.push(`We recently changed ${name}'s food or treats — could diet be a factor?`);
  }
  if (input.medications.length) {
    qs.push(`Is ${name}'s ${input.medications[0].name} still the right choice and dose?`);
  }
  if (input.conditions.length) {
    qs.push(`How is ${name}'s ${input.conditions[0].toLowerCase()} trending — should monitoring change?`);
  }
  if (qs.length < 2) {
    qs.push(`Is there anything in ${name}'s breed or history we should proactively screen for?`);
  }
  return dedupe(qs).slice(0, 6);
}

export function compileReport(input: CompileInput): ReportData {
  const { present, absent } = splitRedFlags(input.triage?.redFlags ?? []);

  return {
    generatedAt: input.generatedAt,
    pet: input.pet,
    allergies: input.allergies,
    conditions: input.conditions,
    concernSummary: buildConcernSummary(input),
    triage: input.triage
      ? {
          concernLabel: input.triage.concernLabel ?? "General concern",
          urgencyKey: input.triage.urgency,
          urgencyLabel: urgencyLabel(input.triage.urgency),
          confidence: input.triage.confidence,
          causes: input.triage.causes,
          answers: input.triage.answers,
          summary: input.triage.summary ?? null,
        }
      : null,
    redFlagsPresent: present,
    redFlagsAbsent: absent,
    scans: input.scans,
    foodChanges: input.timeline.filter((t) => t.category === "food").slice(0, 6),
    medications: input.medications,
    timeline: input.timeline.slice(0, 10),
    questions: generateQuestions(input),
  };
}
