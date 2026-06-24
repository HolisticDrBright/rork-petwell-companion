import type { UrgencyKey } from "@/constants/colors";

export type Species = "dog" | "cat";

export type HealthStatus = "stable" | "watch" | "attention";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  ageYears: number;
  sex: "male" | "female";
  weightLb: number;
  photo: string;
  status: HealthStatus;
  statusNote: string;
  recentChange: string;
  riskWatch: string;
  conditions: string[];
  allergies: string[];
}

export interface CareItem {
  id: string;
  label: string;
  detail?: string;
  icon: "bowl" | "pill" | "activity" | "tooth" | "heart" | "droplet" | "scale" | "stool";
  done: boolean;
}

export type LogCategory =
  | "food"
  | "stool"
  | "skin"
  | "weight"
  | "activity"
  | "meds"
  | "vet"
  | "scan"
  | "symptom";

export interface TimelineEntry {
  id: string;
  petId: string;
  date: string; // ISO date (yyyy-mm-dd)
  time: string;
  category: LogCategory;
  title: string;
  detail?: string;
  value?: number; // numeric for charts (stool score, itching, weight)
  urgency?: UrgencyKey;
}

export interface UpcomingItem {
  id: string;
  label: string;
  detail: string;
  date: string;
  type: "vaccine" | "appointment" | "refill" | "medication";
}

export interface RecordItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  status?: "ok" | "due" | "overdue";
}

export interface Reminder {
  id: string;
  label: string;
  detail: string;
  time: string;
  enabled: boolean;
  repeat: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  brand: string;
  connected: boolean;
  dataTypes: string[];
}

export interface HealthSignal {
  id: string;
  label: string;
  icon: string;
  value: number | string;
  unit?: string;
  trend: "up" | "down" | "flat";
  history: number[];
  color: string;
  status: "good" | "watch" | "attention";
}

export interface PatternCard {
  id: string;
  type: "insight" | "progress" | "attention" | "correlation";
  title: string;
  body: string;
  evidence?: string;
  petId: string;
}

export interface AttentionItem {
  id: string;
  label: string;
  detail: string;
  urgency: "green" | "amber" | "orange" | "red";
  action?: string;
  actionRoute?: string;
}

// Food Intelligence types
export interface FoodProduct {
  id: string;
  name: string;
  brand: string;
  type: "kibble" | "wet" | "treat" | "raw" | "supplement";
  score: string; // A-F
  scoreColor: string;
  image: string;
  species: Species[];
  lifeStage: string[];
  proteinSource: string;
  proteinPct: number;
  fatPct: number;
  fiberPct: number;
  kcalPerCup?: number;
  kcalPerPiece?: number;
  ingredientFlags: IngredientFlag[];
  nutritionFit: NutritionFit;
  recallHistory: RecallEvent[];
  purityEvidence: PurityEvidence;
  brandTransparency: BrandTransparency;
  cleanerAlternatives: CleanerAlternative[];
  sources: SourceLink[];
}

export interface IngredientFlag {
  type: "concern" | "watch" | "positive";
  label: string;
  detail: string;
}

export interface NutritionFit {
  score: "Good" | "Fair" | "Poor" | "Contraindicated";
  color: string;
  summary: string;
  details: string[];
}

export interface RecallEvent {
  date: string;
  reason: string;
  scope: string;
}

export interface PurityEvidence {
  testing: string;
  sourcing: string;
  manufacturing: string;
  score: "Strong" | "Moderate" | "Weak" | "Unknown";
}

export interface BrandTransparency {
  countryOfOrigin: string;
  manufacturingDisclosed: boolean;
  supplierDisclosure: string;
  contactAvailable: boolean;
  score: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface CleanerAlternative {
  name: string;
  brand: string;
  score: string;
  why: string;
}

export interface SourceLink {
  label: string;
  url: string;
}
