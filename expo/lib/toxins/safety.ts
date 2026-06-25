import type { ToxinEntry, ToxinSeverity } from "./types";

/**
 * Toxin safety logic (spec: lib/toxins/safety.ts). Maps per-species severity to
 * conservative, NON-treatment guidance and decides when to route to poison
 * control. Nothing here estimates doses or gives first-aid steps.
 */

export const SEVERITY_LABEL: Record<ToxinSeverity, string> = {
  emergency: "Emergency",
  high: "High risk",
  caution: "Caution",
  usually_safe: "Usually safe",
  unknown: "Unknown",
};

/** Owner-facing one-liner for each severity (spec UX states). */
export const SEVERITY_BLURB: Record<ToxinSeverity, string> = {
  emergency: "Call your veterinarian or poison control now.",
  high: "Contact your vet or poison control promptly.",
  caution: "May be unsafe depending on amount, pet size, or context — ask your vet.",
  usually_safe: "Not known to be toxic, but monitor and call your vet if signs appear.",
  unknown: "Petwell doesn't have enough information — ask your vet or poison control.",
};

const SEVERITY_RANK: Record<ToxinSeverity, number> = {
  emergency: 4,
  high: 3,
  caution: 2,
  usually_safe: 1,
  unknown: 1,
};

/** Standard "what NOT to do" copy. Only things to avoid — never treatment. */
export const WHAT_NOT_TO_DO = [
  "Do not induce vomiting unless your veterinarian or poison control tells you to.",
  "Do not give home remedies, food, or medications to try to flush it out.",
  "Don't wait for symptoms before calling — some poisons act with a delay.",
];

/** Bring-this-with-you copy (spec). */
export const BRING_WITH_YOU =
  "Bring the package, plant, medication bottle, a photo, or the ingredient label if you can.";

export function getToxinSeverity(toxin: ToxinEntry, species: "dog" | "cat"): ToxinSeverity {
  return species === "cat" ? toxin.catSeverity : toxin.dogSeverity;
}

export function severityRank(severity: ToxinSeverity): number {
  return SEVERITY_RANK[severity];
}

/** Emergency / high severity should route straight to poison control. */
export function shouldRouteToPoisonControl(toxin: ToxinEntry, species: "dog" | "cat"): boolean {
  const sev = getToxinSeverity(toxin, species);
  return sev === "emergency" || sev === "high";
}

export interface EmergencyAction {
  severity: ToxinSeverity;
  severityLabel: string;
  headline: string;
  routeToPoisonControl: boolean;
  bringWithYou: string;
  whatNotToDo: string[];
}

/** Build the conservative emergency guidance for a toxin + species (no treatment). */
export function buildEmergencyAction(toxin: ToxinEntry, species: "dog" | "cat"): EmergencyAction {
  const severity = getToxinSeverity(toxin, species);
  return {
    severity,
    severityLabel: SEVERITY_LABEL[severity],
    headline: SEVERITY_BLURB[severity],
    routeToPoisonControl: shouldRouteToPoisonControl(toxin, species),
    bringWithYou: BRING_WITH_YOU,
    whatNotToDo: WHAT_NOT_TO_DO,
  };
}
