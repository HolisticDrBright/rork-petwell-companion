/**
 * Petwell Food Intelligence — shared types.
 *
 * Safety rule baked into the model: a photo/OCR can only IDENTIFY a product and
 * read its label. It can never establish purity (heavy metals, microplastics,
 * pesticides, plasticizers, country-of-origin purity). Those claims live in
 * `labTests` / `recalls` / evidence sources, and the contaminant-confidence
 * score is driven ONLY by that evidence — never by the photo.
 */

export type Severity = "good" | "watch" | "bad";
export type Recommendation = "good_fit" | "use_caution" | "avoid";
export type LifeStage = "puppy" | "kitten" | "adult" | "senior" | "all";
export type ProductType = "food" | "treat" | "supplement";
export type LabStatus = "pass" | "elevated" | "fail" | "not_tested";

export interface BrandInfo {
  id: string;
  name: string;
  ownsFacilities: boolean | null;
  recallCount: number;
  transparencyScore: number | null;
  notes: string | null;
}

export interface IngredientFlagInfo {
  flagType: string;
  severity: Severity;
  message: string;
}

export interface IngredientInfo {
  name: string;
  category: string | null;
  position: number;
  isCommonAllergen: boolean;
  flags: IngredientFlagInfo[];
}

export interface NutritionInfo {
  proteinPct: number | null;
  fatPct: number | null;
  fiberPct: number | null;
  moisturePct: number | null;
  kcalPer100g: number | null;
}

export interface LabTest {
  substance: string;
  substanceCategory: string | null;
  result: string;
  status: LabStatus | null;
  testedAt: string | null;
  lab: string | null;
  isDemo: boolean;
  sourceTitle: string | null;
}

export interface RecallInfo {
  recallDate: string | null;
  reason: string;
  severity: Severity;
  sourceUrl: string | null;
}

export interface EvidenceSource {
  title: string;
  publisher: string | null;
  url: string | null;
  sourceType: string | null;
  relation: string | null;
  isDemo: boolean;
}

/** Everything the engine needs about one product. Assembled by foodService. */
export interface ProductBundle {
  id: string;
  name: string;
  productType: ProductType;
  species: "dog" | "cat" | "both";
  form: string | null;
  calorieDensity: string | null;
  barcode: string | null;
  lifeStage: LifeStage | null;
  aafcoStatement: string | null;
  brand: BrandInfo | null;
  ingredients: IngredientInfo[];
  nutrition: NutritionInfo | null;
  labTests: LabTest[];
  recalls: RecallInfo[];
  sources: EvidenceSource[];
}

/** This pet's logged experience with the product/brand (personal_outcome). */
export interface PetFoodHistory {
  priorFeedings: number;
  adverseEvents: number;
}

/** The pet context the engine personalizes against. */
export interface PetContext {
  name: string;
  species: "dog" | "cat";
  ageYears: number;
  allergies: string[];
  conditions: string[];
  calorieConcern?: boolean; // overweight / weight-management
}

export interface Reason {
  text: string;
  severity: Severity;
}

export interface SubScore {
  key:
    | "nutrition_fit"
    | "ingredient_quality"
    | "contaminant_confidence"
    | "brand_transparency"
    | "recall_risk"
    | "personal_outcome";
  label: string;
  score: number; // 0-100
  reasons: Reason[];
  note?: string;
}

export interface AllergyConflict {
  allergen: string;
  ingredient: string;
  severity: "high" | "medium";
  note: string;
}

export interface FoodReview {
  productId: string;
  productName: string;
  overallScore: number; // 0-100
  grade: string; // A–F
  recommendation: Recommendation;
  recommendationLabel: string;
  reason: string;
  subScores: SubScore[];
  allergyConflicts: AllergyConflict[];
  ingredientConcerns: { ingredient: string; message: string; severity: Severity }[];
  aafco: { fit: Severity; text: string };
  lifeStageFit: { fit: Severity; text: string };
  recallStatus: { status: "none" | "watch" | "active"; text: string; recalls: RecallInfo[] };
  purity: {
    confidence: "none" | "limited" | "moderate" | "supported";
    text: string;
    tests: LabTest[];
    hasEvidence: boolean;
    demoOnly: boolean;
  };
  brandTransparency: { score: number; text: string };
  whyFactors: Reason[];
  sources: EvidenceSource[];
}
