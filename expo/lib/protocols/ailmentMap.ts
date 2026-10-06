/**
 * Which graded products belong on which condition protocol.
 *
 * The catalogue tags products with ailments (`joint`, `kidney`, `urinary`, …);
 * the app's protocols are the ten `ConditionTemplate` entries in
 * lib/integrative/conditions.ts. This file is the join between the two, and it
 * is deliberately explicit rather than fuzzy-matched: a product appearing under
 * the wrong condition is a clinical error, not a display bug.
 *
 * Ailments with no matching protocol are NOT given one here. Writing a
 * "cancer support" or "heart" protocol is veterinary content authoring, not a
 * mapping exercise — those products stay reachable in the marketplace with
 * their grade and caveats, and the protocol can be written later by a vet.
 * UNMAPPED_AILMENTS records them so nothing is silently dropped.
 */

import type { Ailment } from "./productCatalog";

/** Condition template id → the ailment tags whose products belong on it. */
export const CONDITION_AILMENTS: Record<string, Ailment[]> = {
  arthritis: ["joint", "pain"],
  itchy_skin: ["itch", "skin", "allergy"],
  ear_yeast: ["yeast"],
  chronic_diarrhea: ["diarrhea", "digestion", "ibd", "chronic_gi", "stool", "anal_glands"],
  kidney_hydration: ["kidney"],
  pancreatitis: ["liver"],
  anxiety: ["anxiety", "sleep"],
  dental_inflammation: ["dental"],
  senior_maintenance: ["cognition", "longevity", "wellness"],
  obesity_metabolic: [],
};

/**
 * Ailments with products but no protocol to hang them on, and why. These are
 * surfaced in the marketplace instead. Each one is a candidate for a future
 * vet-authored protocol — the note says what that protocol would have to cover.
 */
export const UNMAPPED_AILMENTS: { ailment: Ailment; why: string }[] = [
  { ailment: "heart", why: "No cardiac protocol exists. Taurine is grade A here, so this is the strongest candidate to write next — it needs a cardiologist's framing of when supplementation is and isn't the answer." },
  { ailment: "urinary", why: "The renal protocol covers hydration, not FLUTD or cystitis. A urinary protocol has to lead with the blocked-male-cat emergency." },
  { ailment: "cancer_support", why: "Needs oncology framing that makes 'adjunct, never instead of treatment' the first line, not a caveat." },
  { ailment: "immune", why: "The immune system has no protocol; 'immune support' without a target is not something to build a plan around." },
  { ailment: "infection", why: "Infection is a vet diagnosis. The only product tagged here is one Petwell tells people not to use." },
  { ailment: "detox", why: "Not a physiological process Petwell will build a protocol around." },
  { ailment: "vaccinosis", why: "Not a recognised condition. The product is listed for transparency only." },
  { ailment: "wounds", why: "First aid belongs with triage, not a supplement protocol." },
  { ailment: "first_aid", why: "First aid is a triage question, not a supplement plan. The one product here is a homeopathic, and the risk is that it delays a real vet visit." },
  { ailment: "fleas", why: "Parasite prevention is its own area and belongs with the environment check, not a supplement protocol." },
  { ailment: "ticks", why: "Tick prevention belongs with the environment check and with vet-prescribed preventives. In a tick or heartworm area an ineffective product is a real risk, so Petwell will not build a protocol that implies otherwise." },
];

/** Ailment tags whose products appear on at least one protocol. */
export const MAPPED_AILMENTS: Set<Ailment> = new Set(Object.values(CONDITION_AILMENTS).flat());

/** The ailments a protocol should show products for ([] when it has none). */
export function ailmentsForCondition(conditionId: string): Ailment[] {
  return CONDITION_AILMENTS[conditionId] ?? [];
}
