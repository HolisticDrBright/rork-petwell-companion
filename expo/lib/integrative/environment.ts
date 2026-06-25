import type { Pet } from "@/types/pet";

/**
 * Home Environment Scanner — a practical checklist of household exposures that
 * can affect pet health, with low-risk swaps. Tailors emphasis to the pet
 * (cats are far more sensitive to essential oils; itchy pets get environment-
 * first steps). Supportive guidance only.
 */

export type EnvSeverity = "info" | "caution" | "high";

export interface EnvRisk {
  id: string;
  label: string;
  question: string; // what to check
  why: string;
  saferStep: string;
  /** Higher weighting for itchy/allergy pets. */
  allergyRelevant: boolean;
  catSeverity: EnvSeverity;
  dogSeverity: EnvSeverity;
}

export const ENV_RISKS: EnvRisk[] = [
  {
    id: "cleaning",
    label: "Cleaning products",
    question: "Do you use strong or scented floor/surface cleaners where your pet walks or rests?",
    why: "Residues on floors transfer to paws and coats and are then licked off.",
    saferStep: "Rinse floors after cleaning; choose fragrance-free, pet-safe cleaners.",
    allergyRelevant: true,
    catSeverity: "caution",
    dogSeverity: "caution",
  },
  {
    id: "fragrance",
    label: "Fragrances, candles & plug-ins",
    question: "Are there scented candles, sprays, or plug-in air fresheners in shared rooms?",
    why: "Airborne fragrances can irritate airways and sensitive skin.",
    saferStep: "Switch to unscented; ventilate well; keep pets out of freshly scented rooms.",
    allergyRelevant: true,
    catSeverity: "high",
    dogSeverity: "caution",
  },
  {
    id: "essential_oils",
    label: "Essential oils & diffusers",
    question: "Do you diffuse or apply essential oils (tea tree, citrus, eucalyptus, peppermint, etc.)?",
    why: "Many oils are toxic to pets — cats especially can't process them and can be harmed by vapor or skin contact.",
    saferStep: "For cats, stop diffusing oils entirely. For dogs, avoid direct contact and diffuse only with vet guidance and ventilation.",
    allergyRelevant: true,
    catSeverity: "high",
    dogSeverity: "caution",
  },
  {
    id: "laundry",
    label: "Laundry detergent & dryer sheets",
    question: "Is pet bedding washed with scented detergent or dryer sheets?",
    why: "Fragrance and residues sit against the skin all day.",
    saferStep: "Wash bedding in fragrance-free detergent; skip dryer sheets.",
    allergyRelevant: true,
    catSeverity: "caution",
    dogSeverity: "caution",
  },
  {
    id: "lawn",
    label: "Lawn & garden chemicals",
    question: "Are herbicides, fertilizers, or pesticides used where your pet walks?",
    why: "Chemicals stick to paws and fur and are ingested during grooming.",
    saferStep: "Keep pets off treated areas until dry/watered in; wipe paws after walks.",
    allergyRelevant: false,
    catSeverity: "caution",
    dogSeverity: "high",
  },
  {
    id: "flea_tick",
    label: "Flea / tick products",
    question: "Are you using the correct species-specific flea/tick product at the right dose?",
    why: "Dog products containing permethrin can be deadly to cats.",
    saferStep: "Never use a dog flea product on a cat; confirm species and weight with your vet.",
    allergyRelevant: false,
    catSeverity: "high",
    dogSeverity: "caution",
  },
  {
    id: "bowls",
    label: "Food & water bowls",
    question: "Are you using plastic bowls?",
    why: "Scratched plastic harbors bacteria and is linked to chin/skin irritation.",
    saferStep: "Switch to stainless steel or ceramic; wash daily.",
    allergyRelevant: true,
    catSeverity: "caution",
    dogSeverity: "caution",
  },
  {
    id: "mold_dust",
    label: "Mold, dust & dust mites",
    question: "Any damp spots, visible mold, or heavy household dust?",
    why: "Mold and dust mites are common airway and skin allergens.",
    saferStep: "Fix damp areas; vacuum and damp-dust often; consider a HEPA filter.",
    allergyRelevant: true,
    catSeverity: "caution",
    dogSeverity: "caution",
  },
  {
    id: "bedding",
    label: "Bedding & resting areas",
    question: "How often is your pet's bedding washed?",
    why: "Pollen, dander, and allergens build up in unwashed bedding.",
    saferStep: "Wash bedding weekly in hot, fragrance-free water during allergy season.",
    allergyRelevant: true,
    catSeverity: "info",
    dogSeverity: "caution",
  },
  {
    id: "litter",
    label: "Litter type (cats)",
    question: "Is the litter heavily scented or very dusty?",
    why: "Scented or dusty litter can irritate feline airways and deter litter-box use.",
    saferStep: "Use unscented, low-dust litter; scoop daily; provide enough boxes.",
    allergyRelevant: true,
    catSeverity: "caution",
    dogSeverity: "info",
  },
  {
    id: "air_quality",
    label: "Air quality & smoke",
    question: "Is there tobacco/vape smoke or poor ventilation indoors?",
    why: "Secondhand smoke is linked to respiratory and some cancers in pets.",
    saferStep: "Keep the home smoke-free; ventilate; consider an air purifier.",
    allergyRelevant: true,
    catSeverity: "high",
    dogSeverity: "high",
  },
];

export interface EnvChecklistItem extends EnvRisk {
  severity: EnvSeverity;
  /** Emphasized for this pet (allergy/itch pets, or species-sensitive). */
  emphasized: boolean;
}

function isItchy(pet: Pet): boolean {
  return pet.conditions.some((c) => /skin|atop|allerg|itch|derm/i.test(c)) || pet.allergies.length > 0;
}

/** Build a pet-tailored checklist, most relevant items first. */
export function buildEnvironmentChecklist(pet: Pet): EnvChecklistItem[] {
  const itchy = isItchy(pet);
  const sevRank: Record<EnvSeverity, number> = { high: 3, caution: 2, info: 1 };
  return ENV_RISKS.map((r) => {
    const severity = pet.species === "cat" ? r.catSeverity : r.dogSeverity;
    const emphasized = (itchy && r.allergyRelevant) || severity === "high";
    return { ...r, severity, emphasized };
  }).sort((a, b) => {
    if (a.emphasized !== b.emphasized) return a.emphasized ? -1 : 1;
    return sevRank[b.severity] - sevRank[a.severity];
  });
}

export interface EnvPlan {
  headline: string;
  firstSteps: string[];
  itchyFocus: boolean;
}

/**
 * Produce practical, low-risk first steps. For itchy/allergy pets these lead with
 * the environment-first interventions the spec calls out.
 */
export function environmentFirstSteps(pet: Pet): EnvPlan {
  const itchy = isItchy(pet);
  if (itchy) {
    return {
      headline: `Environment-first steps for ${pet.name}'s itchy skin`,
      itchyFocus: true,
      firstSteps: [
        "Rinse or wipe paws after every walk to cut pollen contact",
        "Wash bedding weekly in fragrance-free detergent",
        "Switch to stainless-steel or ceramic food and water bowls",
        pet.species === "cat"
          ? "Stop diffusing essential oils entirely — cats can't process them"
          : "Remove fragrance and essential-oil exposure from your pet's rooms",
        "Track flare timing against walks, cleaning days, and the season",
      ],
    };
  }
  return {
    headline: `Low-risk home tune-up for ${pet.name}`,
    itchyFocus: false,
    firstSteps: [
      pet.species === "cat"
        ? "Avoid essential-oil diffusers and scented litter"
        : "Keep pets off freshly treated lawns until dry",
      "Use fragrance-free cleaners and rinse floors",
      "Switch to stainless-steel or ceramic bowls and wash daily",
      "Keep the home smoke-free and well ventilated",
      "Confirm flea/tick products are species- and weight-correct",
    ],
  };
}
