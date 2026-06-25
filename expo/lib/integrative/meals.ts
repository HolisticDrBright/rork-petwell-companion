import type { Pet } from "@/types/pet";

import type { EvidenceGrade, ThermalNature } from "./types";

/**
 * Personalized meal-planner templates. These are FOOD-FIRST support patterns,
 * not prescriptions: exact calorie/nutrient targets come from your vet. Plans
 * use supportive language ("supports", "may help") and flag where a board-
 * certified veterinary nutritionist should be involved (e.g. homemade diets).
 */

export interface MealPlan {
  id: string;
  title: string;
  conditionId?: string;
  systems: string[];
  species: "dog" | "cat" | "both";
  whoFor: string;
  caloriesNote: string;
  fatNote: string;
  proteinNote: string;
  fiberNote: string;
  hydrationNote: string;
  contraindications: string[];
  commercial: string[];
  homemade: string[];
  /** Homemade/therapeutic balance needs professional formulation. */
  needsNutritionist: boolean;
  thermalNature: ThermalNature;
  tcmPattern: string;
  prep: string;
  evidence: EvidenceGrade;
  /** Species-specific safety note surfaced prominently (esp. for cats). */
  catCaution?: string;
}

export const MEAL_PLANS: MealPlan[] = [
  {
    id: "pancreatitis_lowfat",
    title: "Low-fat pancreatitis support",
    conditionId: "pancreatitis",
    systems: ["hepatic", "gut"],
    species: "both",
    whoFor: "Dogs recovering from or prone to pancreatitis, once your vet says it's safe to eat.",
    caloriesNote: "Small, frequent meals to a vet-set daily calorie target.",
    fatNote: "Low fat — for dogs, a therapeutic low-fat diet or roughly <10% fat on a dry-matter basis.",
    proteinNote: "Lean, gentle proteins (white fish, skinless poultry breast, very lean turkey).",
    fiberNote: "Moderate, digestible fiber; avoid rich or greasy add-ins.",
    hydrationNote: "Keep water available; a little plain low-sodium broth can encourage drinking.",
    contraindications: ["Acute/severe symptoms need veterinary care first — do not home-manage", "No fatty treats, oils, cheese, or table scraps"],
    commercial: ["Veterinary therapeutic low-fat GI diets", "Low-fat 'sensitive digestion' formulas (confirm fat % with your vet)"],
    homemade: ["Skinless white fish or turkey breast + a digestible carb (white rice or potato), measured", "Always vet-formulated for the long term"],
    needsNutritionist: true,
    thermalNature: "neutral",
    tcmPattern: "Supports the Spleen & Stomach without adding Damp/greasy load",
    prep: "Boil or steam plain; skim all fat; no oil, salt, onion, or garlic.",
    evidence: "B",
    catCaution:
      "Cats are different: feline pancreatitis is usually NOT managed with aggressive low-fat dieting, and keeping a cat eating is critical. Never withhold food from a cat — follow your vet's feline-specific plan.",
  },
  {
    id: "gentle_digestion",
    title: "Gentle digestion (gut reset) meals",
    conditionId: "chronic_diarrhea",
    systems: ["gut"],
    species: "both",
    whoFor: "Pets with a mild, non-emergency tummy upset, with your vet's okay.",
    caloriesNote: "Maintain normal calories split into small, frequent meals.",
    fatNote: "Lower fat to ease digestion during recovery.",
    proteinNote: "A single lean, easily digested protein (white fish, skinless chicken/turkey).",
    fiberNote: "A little soluble fiber (plain pumpkin) can firm stool.",
    hydrationNote: "Watch hydration closely; offer water often.",
    contraindications: ["Blood in stool, repeated vomiting, or lethargy → vet, not home care", "Not for long-term feeding without balancing"],
    commercial: ["Veterinary GI 'gentle' diets", "Limited-ingredient sensitive-stomach formulas"],
    homemade: ["Plain white fish or turkey + white rice, 2–3 days, then transition back over 5–7 days", "Add 1 tsp–1 tbsp plain pumpkin by size"],
    needsNutritionist: false,
    thermalNature: "neutral",
    tcmPattern: "Harmonizes the Spleen & Stomach; easy to digest",
    prep: "Boil plain; no seasoning, oil, onion, or garlic.",
    evidence: "B",
  },
  {
    id: "cooling_itch",
    title: "Cooling meals for itchy / inflammatory patterns",
    conditionId: "itchy_skin",
    systems: ["skin", "immune"],
    species: "both",
    whoFor: "Itchy, 'hot' pets with heat-pattern skin (red, inflamed), alongside a vet work-up.",
    caloriesNote: "Maintain a healthy weight to reduce inflammatory load.",
    fatNote: "Moderate, with omega-3-rich choices to support the skin barrier.",
    proteinNote: "Cooling novel proteins in TCM (duck, white fish, rabbit); minimize warming proteins (lamb, chicken) if they aggravate itch.",
    fiberNote: "Standard digestible fiber.",
    hydrationNote: "Keep well hydrated to support skin.",
    contraindications: ["Not a substitute for a vet-guided elimination diet", "Watch for any food the pet is allergic to"],
    commercial: ["Novel-protein or hydrolyzed diets (vet-guided)", "Fish-based limited-ingredient formulas"],
    homemade: ["Duck or white fish + cooling carbs, vet-formulated", "A fish-oil topper for EPA/DHA"],
    needsNutritionist: true,
    thermalNature: "cooling",
    tcmPattern: "Clears Damp-Heat; tonifies Yin",
    prep: "Cook plain; remove skin/excess fat; no spices.",
    evidence: "C",
  },
  {
    id: "warming_support",
    title: "Warming, supportive meals (cold / low-energy)",
    systems: ["metabolic", "gut"],
    species: "both",
    whoFor: "Pets who run cold, seem low-energy, or are recovering and need gentle warmth (TCM lens).",
    caloriesNote: "Adequate calories to rebuild condition; avoid overfeeding.",
    fatNote: "Moderate, healthy fats for energy unless your vet advises low-fat.",
    proteinNote: "Warming proteins in TCM (chicken, turkey, beef, lamb) as tolerated.",
    fiberNote: "Gentle, cooked vegetables.",
    hydrationNote: "Warm (not hot) food and broth can aid intake.",
    contraindications: ["Not for pancreatitis-prone or overweight pets without vet guidance", "Avoid in 'hot'/inflamed patterns"],
    commercial: ["Balanced maintenance diets; warm slightly before serving"],
    homemade: ["Lightly cooked chicken or turkey + cooked squash/sweet potato, vet-formulated", "Plain low-sodium bone broth as a topper"],
    needsNutritionist: true,
    thermalNature: "warming",
    tcmPattern: "Warms the Middle; tonifies Qi & Blood",
    prep: "Serve warm; cook plain without onion/garlic.",
    evidence: "D",
  },
  {
    id: "kidney_hydration_meals",
    title: "Kidney hydration support meals",
    conditionId: "kidney_hydration",
    systems: ["renal"],
    species: "both",
    whoFor: "Pets needing urinary/renal support; if kidney disease is diagnosed, follow a renal diet.",
    caloriesNote: "Enough calories to hold a healthy weight (appetite can dip with kidney issues).",
    fatNote: "Adequate fat for palatable calories.",
    proteinNote: "If diagnosed CKD, controlled, high-quality protein per a renal diet; otherwise a balanced diet.",
    fiberNote: "Standard; some renal diets add specific fibers.",
    hydrationNote: "Maximize moisture — favor wet/canned food and add water or low-sodium broth.",
    contraindications: ["Straining or unable to urinate (esp. male cat) → emergency, not diet", "Don't restrict protein without a diagnosis and vet guidance"],
    commercial: ["Veterinary renal therapeutic diets (controlled phosphorus/protein)", "Wet/canned formats for moisture"],
    homemade: ["Renal homemade diets MUST be formulated by a veterinary nutritionist", "Add water to every meal"],
    needsNutritionist: true,
    thermalNature: "neutral",
    tcmPattern: "Tonifies Yin & Fluids; eases the Kidney workload",
    prep: "Add warm water to wet food to make a 'soup'.",
    evidence: "A",
    catCaution: "Cats hide kidney issues well and resist diet changes — transition slowly and never let a cat stop eating.",
  },
  {
    id: "weight_satiety",
    title: "Weight-loss satiety meals",
    conditionId: "obesity_metabolic",
    systems: ["metabolic"],
    species: "both",
    whoFor: "Overweight pets on a vet-guided weight-loss plan.",
    caloriesNote: "A vet-set calorie deficit; measure every meal with a scale.",
    fatNote: "Lower fat to cut calories while keeping protein up.",
    proteinNote: "Higher protein to preserve muscle during loss.",
    fiberNote: "Higher fiber for fullness (satiety).",
    hydrationNote: "Add water/low-cal broth to bulk meals.",
    contraindications: ["Cats must lose weight slowly — crash-dieting risks fatal hepatic lipidosis", "Rule out metabolic disease first"],
    commercial: ["Veterinary 'metabolic' / weight-management diets (high protein, high fiber)"],
    homemade: ["Lean protein + green beans to bulk volume, vet-formulated", "Swap treats for counted veggies"],
    needsNutritionist: true,
    thermalNature: "neutral",
    tcmPattern: "Drains Damp; supports the Spleen's transformation of food",
    prep: "Measure portions by weight; bulk with water or green beans.",
    evidence: "A",
    catCaution: "Feline weight loss must be slow (~0.5–1% body weight/week) and vet-supervised to avoid hepatic lipidosis.",
  },
  {
    id: "allergy_elimination",
    title: "Allergy elimination-trial meals",
    conditionId: "itchy_skin",
    systems: ["skin", "gut", "immune"],
    species: "both",
    whoFor: "Pets doing a vet-guided 8–12 week elimination trial for suspected food allergy.",
    caloriesNote: "Maintain normal calories; only the trial diet for the full window.",
    fatNote: "Per the chosen trial diet.",
    proteinNote: "A single novel or hydrolyzed protein the pet hasn't eaten before — strictly one source.",
    fiberNote: "Per the trial diet.",
    hydrationNote: "Normal hydration.",
    contraindications: ["No other foods, treats, flavored meds, or table scraps during the trial — even one slip invalidates it", "Must be vet-guided to interpret results"],
    commercial: ["Hydrolyzed or true novel-protein veterinary diets"],
    homemade: ["A single novel protein + single carb, vet-formulated for the trial"],
    needsNutritionist: true,
    thermalNature: "neutral",
    tcmPattern: "Removes provoking foods to calm Damp-Heat",
    prep: "Strict single-protein prep; nothing else by mouth.",
    evidence: "A",
  },
  {
    id: "senior_maintenance_meals",
    title: "Senior pet maintenance meals",
    conditionId: "senior_maintenance",
    systems: ["metabolic", "msk", "renal"],
    species: "both",
    whoFor: "Senior pets without an acute problem, to support healthy aging.",
    caloriesNote: "Adjust to maintain ideal body condition (metabolism often slows).",
    fatNote: "Moderate, with omega-3s for joints and cognition.",
    proteinNote: "Adequate high-quality protein to preserve muscle (don't over-restrict unless your vet advises).",
    fiberNote: "Digestible fiber for regularity.",
    hydrationNote: "Encourage moisture, especially for senior cats.",
    contraindications: ["Tailor to any diagnosed condition (kidney, heart) with your vet"],
    commercial: ["Senior / mature maintenance diets", "Wet formats for hydration"],
    homemade: ["Balanced senior recipes, vet-formulated", "Add a fish-oil topper if your vet agrees"],
    needsNutritionist: false,
    thermalNature: "neutral",
    tcmPattern: "Tonifies Qi, Blood & Kidney essence for graceful aging",
    prep: "Soften kibble with warm water if dental comfort is an issue.",
    evidence: "B",
    catCaution: "Senior cats benefit from extra moisture and twice-yearly checks; weigh regularly to catch loss early.",
  },
];

export function mealPlanById(id: string): MealPlan | undefined {
  return MEAL_PLANS.find((m) => m.id === id);
}

const SYSTEM_TO_PLAN: Record<string, string> = {
  hepatic: "pancreatitis_lowfat",
  gut: "gentle_digestion",
  skin: "cooling_itch",
  immune: "cooling_itch",
  renal: "kidney_hydration_meals",
  metabolic: "weight_satiety",
  msk: "senior_maintenance_meals",
  behavior: "gentle_digestion",
  dental: "senior_maintenance_meals",
};

const CONDITION_TO_PLAN: Record<string, string> = {
  pancreatitis: "pancreatitis_lowfat",
  chronic_diarrhea: "gentle_digestion",
  itchy_skin: "cooling_itch",
  ear_yeast: "cooling_itch",
  kidney_hydration: "kidney_hydration_meals",
  obesity_metabolic: "weight_satiety",
  arthritis: "senior_maintenance_meals",
  anxiety: "gentle_digestion",
  dental_inflammation: "senior_maintenance_meals",
  senior_maintenance: "senior_maintenance_meals",
};

export interface MealPlanPick {
  plan: MealPlan;
  /** Species-aware caution to show prominently, if any. */
  speciesCaution?: string;
}

/** Pick the best-fit meal plan for a pet from a condition id or system id. */
export function selectMealPlan(pet: Pet, opts: { conditionId?: string; system?: string }): MealPlanPick {
  const id =
    (opts.conditionId && CONDITION_TO_PLAN[opts.conditionId]) ||
    (opts.system && SYSTEM_TO_PLAN[opts.system]) ||
    "senior_maintenance_meals";
  const plan = mealPlanById(id) ?? MEAL_PLANS[MEAL_PLANS.length - 1];
  const speciesCaution = pet.species === "cat" ? plan.catCaution : undefined;
  return { plan, speciesCaution };
}
