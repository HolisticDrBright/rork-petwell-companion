import type { Pet } from "@/types/pet";

import type { EvidenceGrade } from "./types";

/**
 * Trust-First Marketplace foundation.
 *
 * Products are ranked ONLY on merit — pet fit, species safety, evidence,
 * transparency, ingredient quality, third-party lab evidence, and reported
 * outcomes. There is NO pay-to-rank. The current catalog is illustrative
 * placeholder data (no endorsements). If affiliate links are ever added, the UI
 * must disclose them — see AFFILIATE_DISCLOSURE.
 */

export type ProductCategory =
  | "food"
  | "treats"
  | "probiotics"
  | "enzymes"
  | "omega3"
  | "grooming"
  | "cleaning"
  | "bowls"
  | "supplements";

export const PRODUCT_CATEGORIES: { id: ProductCategory; label: string }[] = [
  { id: "food", label: "Foods" },
  { id: "treats", label: "Treats" },
  { id: "probiotics", label: "Probiotics" },
  { id: "enzymes", label: "Digestive enzymes" },
  { id: "omega3", label: "Omega-3s" },
  { id: "supplements", label: "Supplements" },
  { id: "grooming", label: "Grooming" },
  { id: "cleaning", label: "Cleaning" },
  { id: "bowls", label: "Bowls" },
];

export interface MarketplaceProduct {
  id: string;
  category: ProductCategory;
  name: string;
  brand: string;
  species: "dog" | "cat" | "both";
  evidence: EvidenceGrade;
  /** 0–5 sub-scores feeding the transparent rank. */
  transparency: number;
  ingredientQuality: number;
  labTested: boolean;
  /** Third-party certificate-of-analysis / source URL, or null if none linked. */
  sourceUrl: string | null;
  /** Brief recall history note, or null if none on file. */
  recallNote: string | null;
  reportedOutcomes: number; // 0–5
  fitTags: string[]; // e.g. "low-fat", "novel-protein", "renal", "senior"
  blurb: string;
  /** When these criteria were last reviewed (YYYY-MM). */
  lastReviewed: string;
  /** Brand product page, or null when the brand has no direct page on file. */
  productUrl: string | null;
  /** Affiliate/program link — MUST be labeled in the UI when used (FTC). */
  affiliateUrl: string | null;
  /** Which affiliate/practitioner program the link belongs to, if any. */
  affiliateProgram: string | null;
  /** NASC Quality Seal shown on the live NASC member list at review time. */
  nascSeal: boolean;
}

/** This catalog is a research preview — illustrative criteria, not endorsements. */
export const MARKETPLACE_STATUS = "Research preview";
/** Label when the screen is showing the live, researched supplement catalog. */
export const MARKETPLACE_STATUS_LIVE = "Reviewed catalog";
const REVIEWED = "2026-06";
/** Shared defaults so every product carries the trust fields. */
const META = {
  sourceUrl: null as string | null,
  recallNote: null as string | null,
  lastReviewed: REVIEWED,
  productUrl: null as string | null,
  affiliateUrl: null as string | null,
  affiliateProgram: null as string | null,
  nascSeal: false,
};

type RawProduct = Omit<
  MarketplaceProduct,
  "brand" | "sourceUrl" | "recallNote" | "lastReviewed" | "productUrl" | "affiliateUrl" | "affiliateProgram" | "nascSeal"
>;

/** Illustrative example brands per product (research preview, not endorsements). */
const BRANDS: Record<string, string> = {
  food_lowfat_gi: "Therapeutic GI line (example)",
  food_novel: "Limited-ingredient line (example)",
  food_renal: "Renal therapeutic line (example)",
  treat_single: "Single-ingredient treats (example)",
  treat_dental: "Dental chew brand (example)",
  prob_multi: "Vet probiotic brand (example)",
  enz_pancreatic: "Enzyme supplement (example)",
  omega_fish: "Fish-oil brand (example)",
  supp_joint: "Joint supplement (example)",
  groom_shampoo: "Gentle grooming line (example)",
  clean_petsafe: "Pet-safe cleaner (example)",
  bowl_steel: "Stainless bowl maker (example)",
};

/** Per-product trust overrides on top of META (COA links / recall notes when known). */
const OVERRIDES: Record<string, Partial<Pick<MarketplaceProduct, "sourceUrl" | "recallNote">>> = {
  // No third-party COA URLs are linked in this research preview — kept null rather
  // than shown as fake sources. Real COA/recall data slots in here.
};

/** Placeholder catalog — illustrative examples, NOT endorsements. */
const RAW: RawProduct[] = [
  // Food
  { id: "food_lowfat_gi", category: "food", name: "Vet low-fat GI diet (example)", species: "both", evidence: "A", transparency: 5, ingredientQuality: 4, labTested: true, reportedOutcomes: 4, fitTags: ["low-fat", "gi", "pancreatitis"], blurb: "Therapeutic low-fat formula for fat-sensitive pets." },
  { id: "food_novel", category: "food", name: "Novel-protein limited-ingredient food (example)", species: "both", evidence: "B", transparency: 4, ingredientQuality: 4, labTested: true, reportedOutcomes: 4, fitTags: ["novel-protein", "skin", "allergy"], blurb: "Single novel protein for elimination trials." },
  { id: "food_renal", category: "food", name: "Renal support diet (example)", species: "both", evidence: "A", transparency: 5, ingredientQuality: 4, labTested: true, reportedOutcomes: 4, fitTags: ["renal", "senior"], blurb: "Controlled phosphorus and protein for diagnosed kidney support." },
  // Treats
  { id: "treat_single", category: "treats", name: "Single-ingredient lean treat (example)", species: "both", evidence: "C", transparency: 5, ingredientQuality: 5, labTested: false, reportedOutcomes: 3, fitTags: ["low-fat", "single-ingredient"], blurb: "One named protein, nothing else." },
  { id: "treat_dental", category: "treats", name: "VOHC-accepted dental chew (example)", species: "dog", evidence: "B", transparency: 4, ingredientQuality: 3, labTested: false, reportedOutcomes: 4, fitTags: ["dental"], blurb: "Accepted for tartar control; count the calories." },
  // Probiotics
  { id: "prob_multi", category: "probiotics", name: "Multi-strain vet probiotic (example)", species: "both", evidence: "B", transparency: 5, ingredientQuality: 4, labTested: true, reportedOutcomes: 4, fitTags: ["gut", "gi"], blurb: "Strains studied in pets, with CFU guarantees." },
  // Enzymes
  { id: "enz_pancreatic", category: "enzymes", name: "Pancreatic enzyme powder (example)", species: "both", evidence: "C", transparency: 4, ingredientQuality: 4, labTested: false, reportedOutcomes: 3, fitTags: ["enzymes", "epi"], blurb: "For diagnosed EPI under veterinary guidance." },
  // Omega-3
  { id: "omega_fish", category: "omega3", name: "Triglyceride-form fish oil (example)", species: "both", evidence: "B", transparency: 5, ingredientQuality: 5, labTested: true, reportedOutcomes: 4, fitTags: ["skin", "joint", "omega3"], blurb: "Third-party tested EPA/DHA for skin and joints." },
  // Supplements
  { id: "supp_joint", category: "supplements", name: "Glucosamine + chondroitin (example)", species: "both", evidence: "B", transparency: 4, ingredientQuality: 4, labTested: false, reportedOutcomes: 3, fitTags: ["joint", "senior"], blurb: "Joint-comfort support over time." },
  // Grooming
  { id: "groom_shampoo", category: "grooming", name: "Fragrance-free gentle shampoo (example)", species: "both", evidence: "C", transparency: 5, ingredientQuality: 4, labTested: false, reportedOutcomes: 4, fitTags: ["skin", "fragrance-free"], blurb: "Soothing, no added fragrance for sensitive skin." },
  // Cleaning
  { id: "clean_petsafe", category: "cleaning", name: "Fragrance-free pet-safe cleaner (example)", species: "both", evidence: "C", transparency: 5, ingredientQuality: 4, labTested: false, reportedOutcomes: 3, fitTags: ["fragrance-free", "home"], blurb: "Low-residue, unscented surface cleaner." },
  // Bowls
  { id: "bowl_steel", category: "bowls", name: "Stainless-steel bowl set (example)", species: "both", evidence: "C", transparency: 5, ingredientQuality: 5, labTested: false, reportedOutcomes: 4, fitTags: ["bowls", "skin"], blurb: "Non-porous and easy to sanitize daily." },
];

export const MARKETPLACE_PRODUCTS: MarketplaceProduct[] = RAW.map((p) => ({
  ...p,
  brand: BRANDS[p.id] ?? "Example brand",
  ...META,
  ...OVERRIDES[p.id],
}));

export const AFFILIATE_DISCLOSURE =
  "Some outbound product links are affiliate links — if you buy through one, Petwell may earn a commission at no extra cost to you. Rankings are scored on evidence, safety, and transparency alone and are never influenced by commissions, payment, or sponsorship.";

/**
 * Map a `marketplace_products` database row (0026/0028 schema) onto the shared
 * MarketplaceProduct shape the ranking + UI use. Pure so tests can pin it.
 * Returns null for rows the UI can't place (unknown category).
 */
export function mapMarketplaceRow(row: {
  slug: string;
  category: string;
  name: string;
  species: string;
  evidence: string;
  transparency: number;
  ingredient_quality: number;
  lab_tested: boolean;
  reported_outcomes: number;
  fit_tags: string[] | null;
  blurb: string | null;
  brand: string | null;
  product_url: string | null;
  affiliate_url: string | null;
  affiliate_program: string | null;
  nasc_seal: boolean | null;
}): MarketplaceProduct | null {
  const category = PRODUCT_CATEGORIES.find((c) => c.id === row.category)?.id;
  if (!category) return null;
  const species = row.species === "dog" || row.species === "cat" ? row.species : "both";
  const evidence: EvidenceGrade =
    row.evidence === "A" || row.evidence === "B" || row.evidence === "C" || row.evidence === "D" ? row.evidence : "D";
  const clean = (s: string | null) => {
    const t = (s ?? "").trim();
    return t.length > 0 ? t : null;
  };
  return {
    id: row.slug,
    category,
    name: row.name,
    brand: clean(row.brand) ?? "Brand not stated",
    species,
    evidence,
    transparency: row.transparency,
    ingredientQuality: row.ingredient_quality,
    labTested: row.lab_tested,
    sourceUrl: null,
    recallNote: null,
    reportedOutcomes: row.reported_outcomes,
    fitTags: row.fit_tags ?? [],
    blurb: clean(row.blurb) ?? "",
    lastReviewed: "2026-09",
    productUrl: clean(row.product_url),
    affiliateUrl: clean(row.affiliate_url),
    affiliateProgram: clean(row.affiliate_program),
    nascSeal: row.nasc_seal === true,
  };
}

export interface RankedProduct {
  product: MarketplaceProduct;
  score: number;
  speciesSafe: boolean;
  fitBonus: number;
  whyRanked: string[];
}

const GRADE_SCORE: Record<EvidenceGrade, number> = { A: 5, B: 4, C: 3, D: 2 };

function petFitTags(pet: Pet): string[] {
  const tags: string[] = [];
  const cond = pet.conditions.join(" ").toLowerCase();
  if (/pancreat|low.?fat|gi/.test(cond)) tags.push("low-fat", "gi");
  if (/skin|atop|allerg|itch/.test(cond) || pet.allergies.length) tags.push("skin", "allergy", "novel-protein");
  if (/kidney|renal|ckd/.test(cond)) tags.push("renal");
  if (/obes|overweight|weight/.test(cond)) tags.push("low-fat");
  if (/arthrit|joint|hip/.test(cond)) tags.push("joint");
  const seniorAt = pet.species === "cat" ? 10 : 8;
  if (pet.ageYears >= seniorAt) tags.push("senior");
  return tags;
}

/**
 * Rank a category for a specific pet. Transparent composite, species-safety
 * gated, fit-boosted — and explicitly never influenced by payment. Ranks the
 * bundled preview catalog by default; pass the live catalog when loaded.
 */
export function rankProducts(
  category: ProductCategory,
  pet: Pet,
  products: MarketplaceProduct[] = MARKETPLACE_PRODUCTS,
): RankedProduct[] {
  const petTags = new Set(petFitTags(pet));
  return products.filter((p) => p.category === category)
    .map((p) => {
      const speciesSafe = p.species === "both" || p.species === pet.species;
      const fitMatches = p.fitTags.filter((t) => petTags.has(t));
      const fitBonus = fitMatches.length * 3;
      const base =
        GRADE_SCORE[p.evidence] * 2 +
        p.transparency * 1.5 +
        p.ingredientQuality * 1.5 +
        (p.labTested ? 4 : 0) +
        p.reportedOutcomes;
      const score = (speciesSafe ? base : base * 0.4) + fitBonus;
      const whyRanked: string[] = [];
      whyRanked.push(`Evidence ${p.evidence}`);
      if (p.labTested) whyRanked.push("Third-party lab tested");
      if (p.transparency >= 5) whyRanked.push("Full label transparency");
      if (p.ingredientQuality >= 5) whyRanked.push("High ingredient quality");
      if (fitMatches.length) whyRanked.push(`Fits ${pet.name}: ${fitMatches.join(", ")}`);
      if (!speciesSafe) whyRanked.push(`Not formulated for ${pet.species}s`);
      return { product: p, score, speciesSafe, fitBonus, whyRanked };
    })
    .sort((a, b) => b.score - a.score);
}
