/**
 * Product safety rules — the gate every commercial supplement pick passes through.
 *
 * These ten rules come from ingredients actually present in the Adored Beast and
 * Dr. Judy Morgan catalogues (research doc, 2026-10-06). Each one fires BEFORE a
 * product is shown, and each is deterministic, offline, and pure.
 *
 * The governing principle is the same as lib/integrative/safety.ts: when we don't
 * know something that matters, we say the caution out loud rather than assume the
 * risk doesn't apply. Petwell does not store a pet's medication list or breeding
 * status, so rules that depend on those (2, 8, 10, and the pregnancy rule) always
 * surface their warning instead of silently passing — an unnecessary "check with
 * your vet" costs a sentence, a missed interaction costs an animal.
 *
 * Nothing here doses, treats, or diagnoses.
 */

import type { EvidenceGrade } from "@/lib/integrative/types";

/** What the app is allowed to do with a product, strongest restriction first. */
export type ProductAction = "avoid" | "vet_only" | "caution" | "info_only" | "recommend";

const ACTION_RANK: Record<ProductAction, number> = {
  avoid: 0,
  vet_only: 1,
  caution: 2,
  info_only: 3,
  recommend: 4,
};

/** Returns the more restrictive of two actions. */
export function strictestAction(a: ProductAction, b: ProductAction): ProductAction {
  return ACTION_RANK[a] <= ACTION_RANK[b] ? a : b;
}

/** Everything a rule may look at. Deliberately small and all optional-safe. */
export interface PetSafetyContext {
  name: string;
  species: "dog" | "cat";
  sex?: "male" | "female";
  ageYears?: number;
  /** Free-text conditions as the owner typed them. */
  conditions: string[];
  /** Free-text current signs (e.g. from a triage answer or recent symptom log). */
  currentSigns?: string[];
}

export interface ProductSafetyFacts {
  name: string;
  /** Rule ids from the research doc that the catalogue tagged this product with. */
  safetyRuleIds: number[];
  /** Ailment tags (`urinary`, `cancer_support`, …). */
  ailments: string[];
  species: ("dog" | "cat")[] | "environment";
}

export interface SafetyRule {
  id: number;
  /** Short label for the admin/review surfaces. */
  label: string;
  /** Strongest action this rule can impose. */
  action: ProductAction | "emergency";
  /** Owner-facing sentence. Plain language, no dosing, no diagnosis. */
  copy: (ctx: PetSafetyContext) => string;
  /** Why the rule exists — shown in the evidence/source line. */
  basis: string;
  /**
   * Whether the rule fires for this pet. A rule that returns true only *adds* its
   * note; it never silently downgrades to nothing.
   */
  applies: (ctx: PetSafetyContext, product: ProductSafetyFacts) => boolean;
  /**
   * Whether the rule also RESTRICTS what the app may do, as opposed to just
   * saying its piece. Defaults to `applies`.
   *
   * The split matters. Rule 8 warns every owner that fish oil interacts with
   * NSAIDs and blood thinners — Petwell doesn't store a medication list, so that
   * note always shows. But it only downgrades the product when the pet actually
   * has pancreatitis on file. Without that split, the single best-evidenced
   * supplement in the catalogue would be marked "use with care" for every pet
   * and buried under weaker options — misleading in the opposite direction.
   */
  restricts?: (ctx: PetSafetyContext, product: ProductSafetyFacts) => boolean;
}

const norm = (s: string) => s.toLowerCase();
const anyMatch = (values: string[] | undefined, re: RegExp): boolean =>
  (values ?? []).some((v) => re.test(norm(v)));

// Condition matchers, deliberately broad — a false positive shows one extra
// caution, a false negative hides a real one.
const HAS_LIVER_DISEASE = /liver|hepat|cholangi|elevated enzymes|alt |alkp|bile/;
const HAS_CANCER = /cancer|tumou?r|mass|lymphoma|sarcoma|carcinoma|oncolog|chemo/;
const HAS_PANCREATITIS = /pancreat/;
const IS_PREGNANT_OR_BREEDING = /pregnan|nursing|lactat|breeding|in whelp|in season/;
const STRAINING_SIGNS = /strain|can'?t (pee|urinate)|cannot (pee|urinate)|no urine|blocked|crying in the (litter|box)|in and out of the litter/;

/**
 * The ten rules, verbatim in intent from the research doc's table.
 * Ordered by id so the ids in the catalogue stay meaningful.
 */
export const PRODUCT_SAFETY_RULES: SafetyRule[] = [
  {
    id: 1,
    label: "Greater celandine (Chelidonium majus)",
    action: "avoid",
    basis: "Repeated human hepatotoxicity case reports (ACG Case Rep J 2024).",
    copy: (ctx) =>
      anyMatch(ctx.conditions, HAS_LIVER_DISEASE)
        ? `Contains greater celandine, which has been linked to liver injury. Because ${ctx.name} has a liver condition on file, skip this one and ask your vet.`
        : "Contains greater celandine, which has been linked to liver injury in people. Don't use it if your pet has liver disease or raised liver enzymes, and check with your vet first either way.",
    // The warning always shows; it only blocks when there's a liver condition
    // on file, which is what the case reports are about.
    applies: () => true,
    restricts: (ctx) => anyMatch(ctx.conditions, HAS_LIVER_DISEASE),
  },
  {
    id: 2,
    label: "Barberry / berberine with prescription medication",
    action: "caution",
    basis: "Berberine affects CYP450 drug metabolism; the label itself advises a vet consult if the animal is on medication.",
    copy: () =>
      "Contains barberry (berberine), which can change how prescription medicines are processed. If your pet takes any prescription medication, or is pregnant or breeding, ask your vet before starting it.",
    applies: () => true,
  },
  {
    id: 3,
    label: "Colloidal silver",
    action: "avoid",
    basis: "No proven benefit as an antimicrobial in pets; repeated or prolonged use risks argyria.",
    copy: () =>
      "Petwell doesn't recommend colloidal silver. There's no good evidence it treats infection, and long-term use can permanently discolour skin. An infection needs a vet, not silver.",
    applies: () => true,
  },
  {
    id: 4,
    label: "Essential oils with a cat in the house",
    // For a cat this becomes "avoid" in checkProductSafety. For a dog it stays a
    // caution about the cat sharing the house, which is how these exposures
    // actually happen.
    action: "caution",
    basis: "Cats glucuronidate phenols poorly, so tea tree, peppermint, cinnamon and citrus oils are far riskier for them.",
    copy: (ctx) =>
      ctx.species === "cat"
        ? `Contains essential oils (such as tea tree, peppermint, cinnamon or citrus). Cats can't break these down properly, so this isn't safe for ${ctx.name}.`
        : "Contains essential oils (such as tea tree, peppermint, cinnamon or citrus). Keep it away from any cat in the house, including the fumes and anywhere a cat might groom it off.",
    // Fires for every pet: for cats it blocks, for dogs it warns about the cat
    // in the same home, which is how these exposures usually happen.
    applies: () => true,
  },
  {
    id: 5,
    label: "Uva ursi / urine pH-shifting products",
    action: "vet_only",
    basis: "Shifting urine pH helps one crystal type and worsens another, so the crystal type has to be known first. Products of this type are labelled for a limited course.",
    copy: () =>
      "This shifts urine pH, which helps one kind of crystal and makes another kind worse — so it needs a urinalysis first to know which. Ask your vet to check before starting, and keep to the course length on the label.",
    applies: () => true,
  },
  {
    id: 6,
    label: "Male cat straining to urinate",
    action: "emergency",
    basis: "Urethral obstruction is rapidly fatal in male cats; the product labels say the same.",
    copy: (ctx) =>
      `${ctx.name} may be blocked. A male cat straining in the litter box, or passing little or no urine, is a life-threatening emergency — go to a vet or emergency clinic now. Do not give a urinary supplement instead.`,
    applies: (ctx) =>
      ctx.species === "cat" && ctx.sex === "male" && anyMatch(ctx.currentSigns, STRAINING_SIGNS),
  },
  {
    id: 7,
    label: "Slippery elm / L-glutamine with oral medication",
    action: "caution",
    basis: "Manufacturer labelling: these powders coat the gut and can slow absorption of anything given with them.",
    copy: () =>
      "Give this 1–2 hours apart from any oral medication — it coats the gut and can block absorption. Avoid it altogether if your pet is on a blood thinner.",
    applies: () => true,
  },
  {
    id: 8,
    label: "Fish oil with NSAIDs, anticoagulants, or pancreatitis",
    action: "caution",
    basis: "High-dose omega-3 affects bleeding time, and the fat load matters in fat-sensitive pets.",
    copy: (ctx) =>
      anyMatch(ctx.conditions, HAS_PANCREATITIS)
        ? `${ctx.name} has pancreatitis on file, and fish oil adds fat. Ask your vet for the right dose, or whether to use it at all.`
        : "If your pet takes an anti-inflammatory (NSAID) or a blood thinner, have your vet confirm the dose — omega-3 can add to bleeding time. Pets with a history of pancreatitis need vet guidance too.",
    applies: () => true,
    restricts: (ctx) => anyMatch(ctx.conditions, HAS_PANCREATITIS),
  },
  {
    id: 9,
    label: "Mushroom extracts alongside a cancer diagnosis",
    action: "caution",
    basis: "Vet Comp Oncol 2022 (Gedney): turkey tail PSP added nothing to doxorubicin, and did worse than chemotherapy alone in female dogs.",
    copy: (ctx) =>
      anyMatch(ctx.conditions, HAS_CANCER)
        ? `This is an add-on alongside ${ctx.name}'s cancer treatment, never a replacement for it. The one randomised trial found it added no benefit to chemotherapy, and dogs given it instead of chemotherapy did worse.`
        : "If this is for cancer support, it's an add-on alongside oncology care, never a replacement. The one randomised trial found no added benefit over chemotherapy.",
    applies: () => true,
  },
  {
    id: 10,
    label: "Human-label product",
    action: "caution",
    basis: "Human supplements are not dosed for pets, and xylitol — common in human products — is toxic to dogs.",
    copy: (ctx) =>
      `This is a human product. Check the label for xylitol, which is poisonous to dogs, and get the dose for ${ctx.name} from your vet — not from the human serving size.`,
    applies: () => true,
  },
];

export const RULES_BY_ID = new Map(PRODUCT_SAFETY_RULES.map((r) => [r.id, r]));

/**
 * Cross-cutting rule from every kit label in the research doc: none of these are
 * for pregnant or breeding animals. Petwell doesn't record breeding status, so
 * this shows whenever the owner has written something suggesting it, and is
 * otherwise carried in the general caveat.
 */
export const PREGNANCY_RULE = {
  id: 0,
  label: "Pregnant or breeding animals",
  copy: "These supplements are not intended for pregnant, nursing, or breeding animals. Ask your vet.",
  applies: (ctx: PetSafetyContext): boolean =>
    anyMatch(ctx.conditions, IS_PREGNANT_OR_BREEDING) || anyMatch(ctx.currentSigns, IS_PREGNANT_OR_BREEDING),
};

export interface ProductSafetyVerdict {
  /** The action after every rule has had its say. Never weaker than the catalogue's. */
  action: ProductAction;
  /** true → the pet needs a vet NOW; the product is irrelevant. */
  emergency: boolean;
  /** Emergency copy, when `emergency` is true. */
  emergencyCopy?: string;
  /** Owner-facing cautions to render with the product, in rule order. */
  notes: { ruleId: number; label: string; copy: string; basis: string }[];
}

/**
 * Apply every rule the catalogue tagged on a product, plus the ones that depend
 * only on the pet. The returned action is the STRICTEST of the catalogue's own
 * action and anything a rule imposes — a rule can restrict a product further, it
 * can never loosen it.
 */
export function checkProductSafety(
  product: ProductSafetyFacts,
  catalogAction: ProductAction,
  ctx: PetSafetyContext,
): ProductSafetyVerdict {
  const notes: ProductSafetyVerdict["notes"] = [];
  let action = catalogAction;
  let emergency = false;
  let emergencyCopy: string | undefined;

  // Species fit is its own hard gate: an environment/yard product is not for a
  // pet, and a dog-only product is not for a cat.
  if (product.species !== "environment" && !product.species.includes(ctx.species)) {
    action = "avoid";
    notes.push({
      ruleId: -1,
      label: "Not formulated for this species",
      copy: `This isn't made for ${ctx.species}s — ask your vet what the equivalent would be for ${ctx.name}.`,
      basis: "Product labelling.",
    });
  }

  for (const id of product.safetyRuleIds) {
    const rule = RULES_BY_ID.get(id);
    if (!rule) continue;
    if (!rule.applies(ctx, product)) continue;

    if (rule.action === "emergency") {
      emergency = true;
      emergencyCopy = rule.copy(ctx);
      action = "avoid";
    } else if ((rule.restricts ?? rule.applies)(ctx, product)) {
      action = strictestAction(action, rule.action);
    }
    notes.push({ ruleId: rule.id, label: rule.label, copy: rule.copy(ctx), basis: rule.basis });
  }

  // Rule 4 protects cats even when the product is tagged for dogs only: a
  // tea-tree dog shampoo in a multi-pet home is exactly how cats get exposed.
  if (product.safetyRuleIds.includes(4) && ctx.species === "cat") {
    action = "avoid";
  }

  if (PREGNANCY_RULE.applies(ctx)) {
    action = strictestAction(action, "vet_only");
    notes.push({
      ruleId: PREGNANCY_RULE.id,
      label: PREGNANCY_RULE.label,
      copy: PREGNANCY_RULE.copy,
      basis: "Manufacturer labelling across every kit in this catalogue.",
    });
  }

  return { action, emergency, emergencyCopy, notes };
}

/** Owner-facing label for an action. */
export const ACTION_LABEL: Record<ProductAction, string> = {
  recommend: "Worth considering",
  caution: "Use with care",
  vet_only: "Ask your vet first",
  info_only: "Listed for information",
  avoid: "Petwell doesn't recommend this",
};

/** One line explaining what the action means, shown under the label. */
export const ACTION_EXPLAINER: Record<ProductAction, string> = {
  recommend: "Reasonable evidence for this use, and no safety flag we know of for your pet.",
  caution: "Can be reasonable, but it carries a specific caveat — read it before you buy.",
  vet_only: "Needs a diagnosis, bloodwork, or a dose only your vet can set.",
  info_only: "Traditional use, without the studies to back a recommendation. Shown so you can judge it.",
  avoid: "We think the evidence or the risk argues against it. Here's why.",
};

/** What an evidence grade means in plain language. Shown wherever a grade is. */
export const GRADE_MEANING: Record<EvidenceGrade, string> = {
  A: "Randomised trials or established veterinary consensus for this use.",
  B: "Good evidence — a controlled or large open-label study in this species.",
  C: "Limited evidence — small, open-label, or mixed studies.",
  D: "Traditional use. No trials we could find in dogs or cats.",
};
