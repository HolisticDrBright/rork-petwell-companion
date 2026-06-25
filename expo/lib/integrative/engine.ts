import { Urgency, type UrgencyKey } from "@/constants/colors";

import { CATALOG, EVIDENCE_GRADES, getSystem, itemsForSystem } from "./catalog";
import {
  conditionById,
  defaultConditionForSystem,
  type ConditionTemplate,
  type FoodFirstStep,
} from "./conditions";
import type {
  CatalogItem,
  IntegrativePlan,
  PetLite,
  PlanInput,
  Recommendation,
  TcmEnergetics,
  ThermalNature,
} from "./types";

const SAFETY_CAVEAT =
  "Integrative support is complementary, not a diagnosis or a substitute for veterinary care. Use “support / may help”, track the response, and discuss anything new with your vet.";

type Tier = "emergency" | "vet_first" | "support";

function tierFor(urgency: UrgencyKey, redFlags: string[]): Tier {
  if (urgency === "red") return "emergency";
  if (urgency === "orange") return "vet_first";
  // Any red flag, even at a lower band, suppresses herbs/supplements.
  if (redFlags.length > 0) return "vet_first";
  return "support";
}

const GENERIC_ALLERGY = new Set(["protein", "seasonal", "sensitivity", "allergy", "the", "and"]);

/** Conservative: when unsure, exclude (over-exclusion is safe for suggestions). */
function contraindicated(item: CatalogItem, pet: PetLite): boolean {
  const conditions = pet.conditions.map((c) => c.toLowerCase());
  for (const c of item.contraindications) {
    const key = c.toLowerCase();
    if (
      conditions.some((pc) => pc.split(/[^a-z]+/).some((w) => w.length > 3 && key.includes(w)))
    ) {
      return true;
    }
  }
  // Allergy: exclude any item whose name contains a (non-generic) allergen word.
  const allergenWords = pet.allergies
    .flatMap((a) => a.toLowerCase().split(/[^a-z]+/))
    .filter((t) => t.length > 3 && !GENERIC_ALLERGY.has(t));
  const itemWords = item.name.toLowerCase().split(/[^a-z]+/);
  if (allergenWords.some((t) => itemWords.some((w) => w === t || w.startsWith(t)))) return true;
  return false;
}

function recFromItem(item: CatalogItem, pet: PetLite): Recommendation {
  const speciesLevel = item.speciesSafety[pet.species];
  // Cats get stricter gating: any herb/supplement → ask the vet first.
  const isHerbalOrSupp = item.kind === "herb" || item.kind === "supplement";
  const askVetFirst =
    item.askVetFirst || speciesLevel === "caution" || (pet.species === "cat" && isHerbalOrSupp);

  const speciesNote =
    pet.species === "cat" && isHerbalOrSupp
      ? "Cats metabolize herbs and supplements very differently — confirm the product and dose with your vet."
      : speciesLevel === "caution"
        ? "Use with care for this species — confirm with your vet."
        : undefined;

  const type: Recommendation["type"] =
    item.kind === "herb" ? "herb" : item.kind === "food" ? "food" : "supplement";

  return {
    type,
    title: item.name,
    detail: item.benefit,
    evidence: item.evidence,
    speciesNote,
    askVetFirst,
    contraindications: [...item.contraindications, ...item.medInteractions],
    whenToAskVet: askVetFirst
      ? `Before starting — confirm it's appropriate for ${pet.name}.`
      : "If you see no response in a few weeks, or any new signs appear.",
    whatToTrack: "Response over 2–4 weeks; stop and ask your vet if anything worsens.",
    source: item.source,
  };
}

function foodRec(step: FoodFirstStep, pet: PetLite): Recommendation {
  return {
    type: "food",
    title: step.title,
    detail: step.detail,
    evidence: step.evidence,
    askVetFirst: false,
    contraindications: [],
    whenToAskVet: `If it doesn't help or ${pet.name}'s signs worsen, check with your vet.`,
    whatToTrack: "Appetite, stool/vomit, and energy as you adjust food.",
    source: step.source,
  };
}

function lifestyleRec(text: string): Recommendation {
  return {
    type: "lifestyle",
    title: text,
    detail: "A low-risk environment or routine change that may support recovery.",
    evidence: "C",
    askVetFirst: false,
    contraindications: [],
    whenToAskVet: "If signs persist despite consistent changes.",
    whatToTrack: "Whether the change improves comfort or symptoms.",
    source: "Supportive-care practice.",
  };
}

export function buildPlan(input: PlanInput): IntegrativePlan {
  const system = getSystem(input.system);
  const template: ConditionTemplate | undefined = input.conditionId
    ? conditionById(input.conditionId)
    : defaultConditionForSystem(system.id);
  const pattern = template?.pattern ?? system.patterns[0];
  const pet = input.pet;
  const urgencyLabel = Urgency[input.urgency].label;
  const tier = tierFor(input.urgency, input.redFlags);

  const recommendations: Recommendation[] = [];
  const sources = new Set<string>();
  const add = (r: Recommendation) => {
    recommendations.push(r);
    if (r.source) sources.add(r.source);
  };

  if (tier === "emergency") {
    add({
      type: "vet",
      title: "Contact a vet or emergency clinic now",
      detail:
        "These signs need professional assessment before any home or natural support. This is not the time for food changes, herbs, or supplements.",
      evidence: "A",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "Now — don't wait.",
      whatToTrack: "When the signs started and how they've changed.",
      source: "Veterinary triage safety standard.",
    });
    add({
      type: "monitor",
      title: `Keep ${pet.name} calm and offer water`,
      detail:
        "Keep them calm, warm, and still on the way in. Offer fresh water unless they're vomiting; don't force food.",
      evidence: "C",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "On the way to or at the clinic.",
      whatToTrack: "Breathing, gum color, and responsiveness.",
      source: "Supportive-care practice.",
    });
    add({
      type: "avoid",
      title: "Do not give supplements, herbs, or home remedies",
      detail:
        "During an emergency, natural products can delay care or interact with treatment. Hold everything until your vet advises.",
      evidence: "A",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "Ask your vet before giving anything by mouth.",
      whatToTrack: "Anything you already gave today, to tell your vet.",
      source: "Safety rule.",
    });
    return {
      system: system.id,
      systemLabel: system.label,
      pattern,
      urgency: input.urgency,
      urgencyLabel,
      emergencyOverride: true,
      headline: "Stabilize first — this needs veterinary care now.",
      recommendations,
      whenToAskVet: ["Now — this is not a time for home or natural support."],
      whatToTrack: ["Onset and progression of the signs to report to your vet."],
      sources: [...sources],
      safetyCaveat: SAFETY_CAVEAT,
      conditionTemplateId: template?.id,
      conditionTitle: template?.title,
    };
  }

  // vet_first + support both lead with vet framing and food-first.
  if (tier === "vet_first") {
    add({
      type: "vet",
      title: "Have your vet assess this first",
      detail:
        "Book a prompt (same-day if advised) veterinary visit. The supportive steps below are for once your vet has checked the acute signs.",
      evidence: "A",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "Today, or sooner if signs worsen.",
      whatToTrack: "Signs, timing, appetite, and hydration to share with your vet.",
      source: "Veterinary triage safety standard.",
    });
  }

  // Species-specific safety guidance (e.g., feline pancreatitis ≠ low-fat).
  if (pet.species === "cat" && template?.catGuidance) {
    add({
      type: "vet",
      title: "Important for cats",
      detail: template.catGuidance,
      evidence: "A",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "Follow your vet's species-specific plan for cats.",
      whatToTrack: "Appetite above all — cats must keep eating.",
      source: "Feline-specific veterinary guidance.",
    });
  }

  // Food-first (always allowed; framed appropriately by tier).
  const foodSteps = template?.foodFirst ?? [
    {
      title: "A complete, balanced, species-appropriate diet",
      detail: "Feed measured meals of a complete and balanced diet suited to your pet's life stage.",
      evidence: "B" as const,
      source: "Nutrition fundamentals.",
    },
  ];
  for (const s of foodSteps) add(foodRec(s, pet));

  // Lifestyle / environment.
  for (const l of template?.lifestyle ?? ["Keep a calm, consistent routine and fresh water available."]) {
    add(lifestyleRec(l));
  }

  if (tier === "vet_first") {
    add({
      type: "avoid",
      title: "Hold off on supplements and herbs for now",
      detail:
        "Skip enzymes, herbs, and supplements until your vet has evaluated the acute signs — then ask which (if any) are appropriate.",
      evidence: "A",
      askVetFirst: false,
      contraindications: [],
      whenToAskVet: "Ask which supplements are safe once the acute issue is controlled.",
      whatToTrack: "Response to food and rest before adding anything.",
      source: "Safety rule.",
    });
  } else {
    // support tier — optional species-safe supplements/herbs.
    const candidateIds = template?.considerItems ?? itemsForSystem(system.id).map((c) => c.id);
    const items = candidateIds
      .map((id) => CATALOG.find((c) => c.id === id))
      .filter((c): c is CatalogItem => !!c)
      .filter((c) => c.kind === "food" || c.kind === "supplement" || c.kind === "herb")
      .filter((c) => c.speciesSafety[pet.species] !== "avoid")
      .filter((c) => !contraindicated(c, pet))
      // food items already covered by food-first; surface supplements/herbs here
      .filter((c) => c.kind !== "food")
      .sort((a, b) => Number(a.askVetFirst) - Number(b.askVetFirst))
      .slice(0, 4);
    for (const item of items) add(recFromItem(item, pet));
  }

  const headline =
    tier === "vet_first"
      ? `Vet-guided support for ${pet.name}.`
      : `A food-first integrative support plan for ${pet.name}.`;

  return {
    system: system.id,
    systemLabel: system.label,
    pattern,
    urgency: input.urgency,
    urgencyLabel,
    emergencyOverride: false,
    headline,
    recommendations,
    whenToAskVet: template?.whenToAskVet ?? ["If signs persist, worsen, or you're unsure."],
    whatToTrack: template?.whatToTrack ?? ["Appetite, energy, stool, and the response to changes."],
    sources: [...sources],
    safetyCaveat: SAFETY_CAVEAT,
    conditionTemplateId: template?.id,
    conditionTitle: template?.title,
  };
}

export function evidenceLabel(grade: "A" | "B" | "C" | "D"): string {
  return `${grade} · ${EVIDENCE_GRADES[grade].label}`;
}

// ── TCM "Food as Medicine" ──
// Energetics for common pet-food ingredients (a traditional lens, not a diagnosis).
const TCM_INGREDIENTS: Record<string, Omit<TcmEnergetics, "ingredient" | "safety" | "caveat">> = {
  chicken: { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Tonifies Qi & Blood; warms (may aggravate heat/itch patterns)" },
  "chicken meal": { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Tonifies Qi & Blood; warms" },
  turkey: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Tonifies Qi; settling" },
  beef: { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Tonifies Qi & Blood; strengthens" },
  lamb: { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Warms the Middle; tonifies Qi (warming — caution in heat patterns)" },
  venison: { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Warms and tonifies" },
  duck: { thermalNature: "cooling", flavor: "Sweet / salty", tcmPattern: "Tonifies Yin; clears Heat (good for heat-pattern itch)" },
  pork: { thermalNature: "neutral", flavor: "Sweet / salty", tcmPattern: "Tonifies Yin; moistens" },
  rabbit: { thermalNature: "cooling", flavor: "Sweet", tcmPattern: "Cooling, gentle; clears Heat" },
  salmon: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Tonifies Qi & Blood" },
  sardines: { thermalNature: "warming", flavor: "Salty / sweet", tcmPattern: "Tonifies Qi & Blood; warms" },
  fish: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Gentle on the Spleen & Stomach" },
  egg: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Nourishes Yin & Blood" },
  rice: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Harmonizes the Stomach; supports Spleen Qi" },
  "brown rice": { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Supports Spleen Qi" },
  oat: { thermalNature: "warming", flavor: "Sweet", tcmPattern: "Tonifies Qi; calming" },
  pumpkin: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Harmonizes Spleen & Stomach; supports stool" },
  "sweet potato": { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Tonifies Spleen Qi" },
  pea: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Tonifies the Spleen; mildly drains Damp" },
  lentil: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Tonifies the Spleen" },
  barley: { thermalNature: "cooling", flavor: "Sweet", tcmPattern: "Clears Damp-Heat; supports digestion" },
  flaxseed: { thermalNature: "neutral", flavor: "Sweet", tcmPattern: "Moistens; supports skin/coat" },
};

export function tcmForIngredients(ingredientNames: string[], species: "dog" | "cat"): TcmEnergetics[] {
  const out: TcmEnergetics[] = [];
  const seen = new Set<string>();
  for (const raw of ingredientNames) {
    const name = raw.toLowerCase();
    // longest-key-first match so "sweet potato" beats "potato"
    const key = Object.keys(TCM_INGREDIENTS)
      .sort((a, b) => b.length - a.length)
      .find((k) => name.includes(k));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const e = TCM_INGREDIENTS[key];
    const caveat =
      species === "cat"
        ? "Cats are obligate carnivores — energetics guide protein/temperature choices, not carbs."
        : undefined;
    out.push({
      ingredient: raw,
      thermalNature: e.thermalNature,
      flavor: e.flavor,
      tcmPattern: e.tcmPattern,
      safety: "safe",
      caveat,
    });
    if (out.length >= 6) break;
  }
  return out;
}

export function thermalSummary(items: TcmEnergetics[]): { nature: ThermalNature; text: string } | null {
  if (items.length === 0) return null;
  const counts: Record<ThermalNature, number> = { warming: 0, cooling: 0, neutral: 0 };
  for (const i of items) counts[i.thermalNature]++;
  const nature = (Object.keys(counts) as ThermalNature[]).sort((a, b) => counts[b] - counts[a])[0];
  const text =
    nature === "warming"
      ? "This recipe skews warming — warming foods may not suit pets with heat-pattern itching or inflammation."
      : nature === "cooling"
        ? "This recipe skews cooling — cooling foods may suit heat-pattern itch but less so a pet who runs cold or has weak digestion."
        : "This recipe is fairly neutral — generally gentle across patterns.";
  return { nature, text };
}
