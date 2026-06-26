/**
 * Source citation / evidence assembly. Surfaces the sources behind a review and
 * the standing disclaimer that a photo can never establish purity. Demo/seed
 * sources are sorted last and flagged so the UI labels them clearly.
 */

import { countsAsProductLevelPurity, isProductSpecificResult } from "./provenance";
import type { EvidenceSource, LabTest, ProductBundle } from "./types";

export const PHOTO_LIMITATION =
  "Photos and OCR identify the product and read its label only. They cannot detect heavy metals, microplastics, pesticides, plasticizers, or country-of-origin purity — those require lab evidence.";

export function collectSources(bundle: ProductBundle): EvidenceSource[] {
  const map = new Map<string, EvidenceSource>();
  for (const s of bundle.sources) {
    const existing = map.get(s.title);
    if (!existing) map.set(s.title, s);
  }
  return [...map.values()].sort((a, b) => Number(a.isDemo) - Number(b.isDemo));
}

export interface PuritySummary {
  confidence: "none" | "limited" | "moderate" | "supported";
  text: string;
  tests: LabTest[];
  hasEvidence: boolean;
  demoOnly: boolean;
}

/**
 * Translate the lab evidence into an honest purity statement. With no evidence
 * we say so plainly; demo-only evidence is never presented as verified.
 */
export function puritySummary(bundle: ProductBundle): PuritySummary {
  const tests = bundle.labTests;
  if (tests.length === 0) {
    return {
      confidence: "none",
      text: "No public lab test found. A photo can't detect heavy metals, microplastics, pesticides, or plasticizers — purity confidence is limited.",
      tests,
      hasEvidence: false,
      demoOnly: false,
    };
  }
  const realTests = tests.filter((t) => !t.isDemo);
  // Only a product/lot-specific elevated result flags this product; a brand- or
  // study-level finding is surfaced as evidence context, never a this-product flag.
  const flagged = tests.some((t) => (t.status === "elevated" || t.status === "fail") && isProductSpecificResult(t.level));
  const demoOnly = realTests.length === 0;

  if (flagged) {
    return {
      confidence: "limited",
      text: "A lab result is flagged as elevated — treat purity with caution and verify with the brand.",
      tests,
      hasEvidence: true,
      demoOnly,
    };
  }
  if (demoOnly) {
    return {
      confidence: "limited",
      text: "Only demo/seed lab data is on file — illustrative, not real testing. Real purity confidence needs verified lab reports.",
      tests,
      hasEvidence: true,
      demoOnly: true,
    };
  }
  // Only independent, current, PRODUCT-level passing evidence can raise purity.
  // Brand-, study-, or batch-level rows (and unverified-status rows) are real
  // evidence but are never presented as product-level purity.
  const productPass = tests.filter(countsAsProductLevelPurity);
  if (productPass.length > 0) {
    return {
      confidence: productPass.length >= 2 ? "supported" : "moderate",
      text:
        productPass.length >= 2
          ? "Verified product-level lab data on file. Even so, a photo alone can't establish purity."
          : "Limited verified product-level lab data on file (single report). A photo alone can't establish purity.",
      tests,
      hasEvidence: true,
      demoOnly: false,
    };
  }
  return {
    confidence: "limited",
    text: "Brand- or study-level lab evidence only — not specific to this product or lot, so product purity stays unconfirmed.",
    tests,
    hasEvidence: true,
    demoOnly: false,
  };
}
