import { Urgency } from "@/constants/colors";
import { RED_FLAGS } from "@/lib/triage/redFlags";

import type {
  ReportData,
  ReportMedication,
  ReportPet,
  ReportScan,
  ReportTimelineItem,
} from "./types";

// The core OBSERVABLE critical red flags for the present/absent checklist.
// (Contextual ones like young-pet-GI / senior-worsening are excluded — they're
// pet-state qualifiers, not signs an owner checks off.)
const RED_FLAG_KEYS = [
  "breathing",
  "collapse",
  "seizure",
  "paleGums",
  "severeLethargy",
  "toxin",
  "trauma",
  "repeatedVomiting",
  "bloodStoolVomit",
  "cantUrinate",
] as const;
const CANONICAL_RED_FLAGS = RED_FLAG_KEYS.map((k) => RED_FLAGS[k].label);

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

function head(label: string): string {
  return label.toLowerCase().split(/[ ,/]/)[0];
}

function splitRedFlags(present: string[]): { present: string[]; absent: string[] } {
  const presentLc = present.map((p) => p.toLowerCase());
  const absent = CANONICAL_RED_FLAGS.filter(
    (c) => !presentLc.some((p) => p.includes(head(c)) || c.toLowerCase().includes(head(p)))
  );
  return { present, absent };
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
