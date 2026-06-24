import type { UrgencyKey } from "@/constants/colors";
import type { Pet } from "@/types/pet";
import type { RedFlagKey } from "./types";

/** Urgency bands, lowest to highest. Used to take the max (never lower). */
export const URGENCY_ORDER: UrgencyKey[] = ["green", "amber", "orange", "red"];

export function maxUrgency(a: UrgencyKey, b: UrgencyKey): UrgencyKey {
  return URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b;
}

export function bandFromPoints(points: number): UrgencyKey {
  if (points >= 8) return "red";
  if (points >= 5) return "orange";
  if (points >= 3) return "amber";
  return "green";
}

/**
 * The deterministic red-flag table. Selecting an answer mapped to one of these
 * forces at least this urgency. These are intentionally conservative.
 */
export const RED_FLAGS: Record<RedFlagKey, { label: string; urgency: UrgencyKey }> = {
  breathing: { label: "Trouble breathing", urgency: "red" },
  collapse: { label: "Collapse or fainting", urgency: "red" },
  seizure: { label: "Seizure", urgency: "red" },
  paleGums: { label: "Pale, white, or blue gums", urgency: "red" },
  severeLethargy: { label: "Severe lethargy / hard to rouse", urgency: "red" },
  toxin: { label: "Possible toxin or poison exposure", urgency: "red" },
  trauma: { label: "Recent trauma or injury", urgency: "orange" },
  repeatedVomiting: { label: "Repeated vomiting", urgency: "orange" },
  bloodStoolVomit: { label: "Blood in stool or vomit", urgency: "orange" },
  cantUrinate: { label: "Straining or unable to pass urine", urgency: "orange" },
  youngWithGI: { label: "Very young pet with vomiting or diarrhea", urgency: "orange" },
  seniorWorsening: { label: "Senior pet worsening quickly", urgency: "orange" },
};

export function isSenior(pet: Pet): boolean {
  return pet.species === "cat" ? pet.ageYears >= 11 : pet.ageYears >= 8;
}

export function isYoung(pet: Pet): boolean {
  return pet.ageYears < 1;
}

/**
 * Resolve a red flag to its urgency for this specific pet, applying compound
 * rules. The classic one: a male cat that cannot urinate is a life-threatening
 * emergency (urethral obstruction), so it escalates to red.
 */
export function redFlagUrgencyFor(key: RedFlagKey, pet: Pet): UrgencyKey {
  if (key === "cantUrinate" && pet.species === "cat" && pet.sex === "male") return "red";
  if (key === "seniorWorsening") return isSenior(pet) ? "orange" : "amber";
  return RED_FLAGS[key].urgency;
}

export function redFlagLabelFor(key: RedFlagKey, pet: Pet): string {
  if (key === "cantUrinate" && pet.species === "cat" && pet.sex === "male") {
    return "Male cat unable to urinate — possible urinary blockage (emergency)";
  }
  return RED_FLAGS[key].label;
}
