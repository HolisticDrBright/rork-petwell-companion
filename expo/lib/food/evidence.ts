/**
 * Source citation / evidence assembly. Surfaces the sources behind a review and
 * the standing disclaimer that a photo can never establish purity. Demo/seed
 * sources are sorted last and flagged so the UI labels them clearly.
 */

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
  const flagged = tests.some((t) => t.status === "elevated" || t.status === "fail");
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
  return {
    confidence: realTests.length >= 2 ? "supported" : "moderate",
    text:
      realTests.length >= 2
        ? "Verified product-level lab data on file. Even so, a photo alone can't establish purity."
        : "Limited verified lab data on file (single report). A photo alone can't establish purity.",
    tests,
    hasEvidence: true,
    demoOnly: false,
  };
}
