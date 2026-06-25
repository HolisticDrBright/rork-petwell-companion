import type { Pet } from "@/types/pet";

import { allergyConflict, findToxins, TOXIC_FOODS } from "./safety";

/**
 * Treat Audit — checks a treat against a specific pet for calories, fat, allergy
 * conflicts, risky ingredients/additives, dental value, and a daily treat budget.
 * Output is supportive guidance, never a medical claim.
 */

export type FatLevel = "low" | "moderate" | "high" | "unknown";
export type Verdict = "ok" | "caution" | "avoid";

export interface TreatInput {
  name: string;
  /** kcal per treat, if known */
  calories?: number | null;
  /** fat as % of the treat, if known */
  fatPct?: number | null;
  ingredients?: string[];
  dental?: boolean;
}

export interface TreatAuditResult {
  name: string;
  caloriesPerTreat: number | null;
  fatLevel: FatLevel;
  allergyConflicts: string[];
  ingredientFlags: string[];
  additiveFlags: string[];
  dentalValue: "none" | "some" | "good";
  saferSwaps: string[];
  dailyBudgetKcal: number | null;
  dailyBudgetTreats: number | null;
  budgetNote: string;
  verdict: Verdict;
  headline: string;
  notes: string[];
}

/** A small catalog of common treats for the picker (illustrative, not endorsements). */
export const TREAT_CATALOG: TreatInput[] = [
  { name: "Bacon strip treat", calories: 35, fatPct: 45, ingredients: ["bacon", "pork fat", "salt"] },
  { name: "Cheese cube", calories: 40, fatPct: 33, ingredients: ["cheddar cheese", "salt"] },
  { name: "Chicken jerky strip", calories: 25, fatPct: 6, ingredients: ["chicken breast"] },
  { name: "Salmon training bit", calories: 4, fatPct: 12, ingredients: ["salmon", "pea flour"] },
  { name: "Green bean (plain)", calories: 2, fatPct: 1, ingredients: ["green bean"] },
  { name: "Dental chew (VOHC)", calories: 70, fatPct: 8, ingredients: ["rice", "gelatin", "tartar control"], dental: true },
  { name: "Peanut butter biscuit", calories: 60, fatPct: 22, ingredients: ["wheat flour", "peanut butter", "sugar"] },
  { name: "Pumpkin soft chew", calories: 8, fatPct: 5, ingredients: ["pumpkin", "oat flour"] },
  { name: "Grape (do not feed)", calories: 3, fatPct: 0, ingredients: ["grape"] },
  { name: "Xylitol 'sugar-free' treat", calories: 5, fatPct: 2, ingredients: ["xylitol", "gelatin"] },
];

const ADDITIVES: { match: string[]; flag: string }[] = [
  { match: ["bha", "bht", "ethoxyquin"], flag: "Artificial preservative (BHA/BHT/ethoxyquin)" },
  { match: ["red 40", "yellow 5", "blue 2", "artificial color", "dye"], flag: "Artificial color/dye" },
  { match: ["propylene glycol"], flag: "Propylene glycol" },
  { match: ["corn syrup", "sugar", "molasses"], flag: "Added sugar" },
  { match: ["salt", "sodium"], flag: "Added salt" },
  { match: ["meat by-product", "meal digest", "animal digest"], flag: "Vague animal-source ingredient" },
];

function estimateFatLevel(input: TreatInput): FatLevel {
  if (typeof input.fatPct === "number") {
    if (input.fatPct >= 25) return "high";
    if (input.fatPct >= 12) return "moderate";
    return "low";
  }
  const text = `${input.name} ${(input.ingredients ?? []).join(" ")}`.toLowerCase();
  if (/bacon|cheese|peanut butter|fat|oil|sausage|fried|greasy/.test(text)) return "high";
  if (/jerky|duck|lamb|beef/.test(text)) return "moderate";
  if (/green bean|pumpkin|carrot|apple|white fish|chicken breast/.test(text)) return "low";
  return "unknown";
}

/** Resting energy ~ 70 * kg^0.75; maintenance ~ x1.4; treat budget = 10% of that. */
function dailyTreatBudgetKcal(pet: Pet): number | null {
  if (!pet.weightLb || pet.weightLb <= 0) return null;
  const kg = pet.weightLb / 2.205;
  const rer = 70 * Math.pow(kg, 0.75);
  const mer = rer * 1.4;
  return Math.round(mer * 0.1);
}

export function auditTreat(input: TreatInput, pet: Pet): TreatAuditResult {
  const ingText = `${input.name} ${(input.ingredients ?? []).join(" ")}`;
  const notes: string[] = [];

  // Toxins (absolute) ─────────────────────────────────────────
  const toxins = findToxins(ingText, pet.species, TOXIC_FOODS);

  // Allergy conflicts ─────────────────────────────────────────
  const allergyConflicts = new Set<string>();
  const nameHit = allergyConflict(input.name, pet.allergies);
  if (nameHit) allergyConflicts.add(nameHit);
  for (const ing of input.ingredients ?? []) {
    const hit = allergyConflict(ing, pet.allergies);
    if (hit) allergyConflicts.add(hit);
  }

  // Additives / ingredient flags ──────────────────────────────
  const lower = ingText.toLowerCase();
  const additiveFlags = ADDITIVES.filter((a) => a.match.some((m) => lower.includes(m))).map((a) => a.flag);
  const ingredientFlags: string[] = toxins.map((t) => `${t.name} — ${t.note}`);

  const fatLevel = estimateFatLevel(input);
  if (fatLevel === "high") ingredientFlags.push("High fat");

  const dentalValue: TreatAuditResult["dentalValue"] = input.dental || /dental|tartar|vohc|plaque/.test(lower)
    ? "good"
    : /rawhide|bone|chew/.test(lower)
      ? "some"
      : "none";

  // Budget ────────────────────────────────────────────────────
  const dailyBudgetKcal = dailyTreatBudgetKcal(pet);
  const cal = typeof input.calories === "number" ? input.calories : null;
  const dailyBudgetTreats = dailyBudgetKcal && cal && cal > 0 ? Math.max(0, Math.floor(dailyBudgetKcal / cal)) : null;
  const budgetNote = dailyBudgetKcal
    ? cal
      ? `Treats should stay under ~10% of daily calories (~${dailyBudgetKcal} kcal). At ${cal} kcal each, that's about ${dailyBudgetTreats} per day max.`
      : `Treats should stay under ~10% of daily calories (~${dailyBudgetKcal} kcal). Add calories to estimate a count.`
    : "Add your pet's weight to estimate a daily treat budget.";

  // Verdict ───────────────────────────────────────────────────
  const pancreatitisProne = pet.conditions.some((c) => /pancreat|low.?fat|gi|pancreas/i.test(c));
  const overweight = pet.conditions.some((c) => /obes|overweight|weight/i.test(c));

  let verdict: Verdict = "ok";
  let headline = "";
  if (toxins.length > 0) {
    verdict = "avoid";
    headline = `Don't feed this — it contains ${toxins[0].name.toLowerCase()}, which is unsafe for pets.`;
  } else if (allergyConflicts.size > 0) {
    verdict = "avoid";
    const a = [...allergyConflicts][0];
    headline = `This contains ${a.toLowerCase()}, which conflicts with ${pet.name}'s allergy history.`;
  } else if (fatLevel === "high" && pancreatitisProne) {
    verdict = "avoid";
    headline = `This treat is likely too fatty for a pancreatitis-prone ${pet.species}.`;
  } else if (fatLevel === "high") {
    verdict = "caution";
    headline = "This is high in fat — keep it occasional and count it toward the daily budget.";
    if (overweight) notes.push("Given the weight-management goal, a lower-calorie swap is a better daily choice.");
  } else if (additiveFlags.length >= 2) {
    verdict = "caution";
    headline = "Okay once in a while, but the additives make this a 'sometimes' treat.";
  } else {
    verdict = "ok";
    headline = "This is okay occasionally, but should count toward the daily calorie budget.";
  }

  // Safer swaps ───────────────────────────────────────────────
  const saferSwaps: string[] = [];
  if (verdict !== "ok") {
    saferSwaps.push("A single plain green bean or a piece of the daily kibble counted out");
    if (pet.species === "dog") saferSwaps.push("A small bite of plain cooked white fish or chicken breast (if not allergic)");
    if (dentalValue === "none") saferSwaps.push("A VOHC-accepted dental chew (counted in calories) for chew satisfaction");
  } else {
    saferSwaps.push("Keep portions tiny and count them in the daily budget");
  }

  if (toxins.length === 0 && allergyConflicts.size === 0) {
    notes.push("Tip: link any tummy or itch flares in the timeline to spot treats that don't agree with your pet.");
  }

  return {
    name: input.name,
    caloriesPerTreat: cal,
    fatLevel,
    allergyConflicts: [...allergyConflicts],
    ingredientFlags,
    additiveFlags,
    dentalValue,
    saferSwaps,
    dailyBudgetKcal,
    dailyBudgetTreats,
    budgetNote,
    verdict,
    headline,
    notes,
  };
}
