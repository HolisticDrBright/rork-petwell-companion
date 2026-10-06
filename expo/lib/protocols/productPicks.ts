/**
 * Resolve the graded product picks for one protocol and one pet.
 *
 * Every product goes through checkProductSafety() before it can be rendered, and
 * the result is grouped so the UI never has to decide what "avoid" means:
 *
 *   picks          — worth considering / use with care / ask your vet first
 *   notRecommended — Petwell says don't, with the reason attached
 *   emergency      — a rule fired that means the pet needs a vet now, and the
 *                    whole product list should be suppressed behind it
 *
 * Nothing here doses. Nothing here claims a product treats a condition.
 */

import type { EvidenceGrade } from "@/lib/integrative/types";

import { ailmentsForCondition } from "./ailmentMap";
import { GRADED_PRODUCTS, type GradedProduct } from "./productCatalog";
import {
  checkProductSafety,
  type PetSafetyContext,
  type ProductAction,
  type ProductSafetyVerdict,
} from "./productSafety";

export interface ProductPick {
  product: GradedProduct;
  verdict: ProductSafetyVerdict;
  /** The action after the rules have run — may be stricter than the catalogue's. */
  action: ProductAction;
}

export interface ProtocolProducts {
  picks: ProductPick[];
  notRecommended: ProductPick[];
  /** Set when a safety rule says the pet needs a vet now. */
  emergency: { copy: string } | null;
}

const GRADE_ORDER: Record<EvidenceGrade, number> = { A: 0, B: 1, C: 2, D: 3 };
const ACTION_ORDER: Record<ProductAction, number> = {
  recommend: 0,
  caution: 1,
  vet_only: 2,
  info_only: 3,
  avoid: 4,
};

/**
 * Pick products for a condition. Pass the pet's current signs (from a triage
 * answer or a recent symptom log) when you have them — rule 6, the blocked-cat
 * emergency, can only fire if it can see them.
 */
export function productsForCondition(conditionId: string, ctx: PetSafetyContext): ProtocolProducts {
  const ailments = ailmentsForCondition(conditionId);
  if (ailments.length === 0) return { picks: [], notRecommended: [], emergency: null };

  const wanted = new Set(ailments);
  const matching = GRADED_PRODUCTS.filter((p) => p.ailments.some((a) => wanted.has(a)));

  const picks: ProductPick[] = [];
  const notRecommended: ProductPick[] = [];
  let emergency: { copy: string } | null = null;

  for (const product of matching) {
    const verdict = checkProductSafety(
      { name: product.name, safetyRuleIds: product.safetyRuleIds, ailments: product.ailments, species: product.species },
      product.action,
      ctx,
    );
    if (verdict.emergency && verdict.emergencyCopy) emergency = { copy: verdict.emergencyCopy };

    const entry: ProductPick = { product, verdict, action: verdict.action };
    if (verdict.action === "avoid") notRecommended.push(entry);
    else picks.push(entry);
  }

  const sort = (a: ProductPick, b: ProductPick) =>
    ACTION_ORDER[a.action] - ACTION_ORDER[b.action] ||
    GRADE_ORDER[a.product.grade] - GRADE_ORDER[b.product.grade] ||
    a.product.priceUsd - b.product.priceUsd;

  picks.sort(sort);
  notRecommended.sort((a, b) => a.product.name.localeCompare(b.product.name));

  // An emergency suppresses the shopping list entirely — the answer is a vet,
  // not a supplement, and a list of products under that banner undercuts it.
  if (emergency) return { picks: [], notRecommended: [], emergency };

  return { picks, notRecommended, emergency: null };
}

/** The standing caveat shown under any product list. */
export const PRODUCT_LIST_CAVEAT =
  "Petwell grades these on the published evidence, not on who sells them. Nothing here is a treatment, a dose, or a substitute for your vet's plan — and we earn nothing from what you decide.";
