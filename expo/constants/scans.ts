export interface ScanCategory {
  id: string;
  label: string;
  hint: string;
  icon: string;
  group: "health" | "food";
}

export const HEALTH_SCANS: ScanCategory[] = [
  { id: "poop", label: "Poop / digestion", hint: "Consistency, color, mucus", icon: "droplet", group: "health" },
  { id: "skin", label: "Skin / rash", hint: "Redness, hair loss, scabs", icon: "sparkle", group: "health" },
  { id: "ear", label: "Ear", hint: "Discharge, redness, odor", icon: "ear", group: "health" },
  { id: "eye", label: "Eye", hint: "Redness, discharge, cloudiness", icon: "eye", group: "health" },
  { id: "teeth", label: "Teeth / gums", hint: "Tartar, gum color", icon: "tooth", group: "health" },
  { id: "body", label: "Body condition", hint: "Weight, shape, coat", icon: "scale", group: "health" },
];

export const FOOD_SCANS: ScanCategory[] = [
  { id: "barcode", label: "Scan barcode", hint: "Instant product lookup", icon: "scan", group: "food" },
  { id: "label-front", label: "Front label", hint: "Brand, claims, marketing", icon: "tag", group: "food" },
  { id: "ingredients", label: "Ingredient panel", hint: "Full ingredient list", icon: "list", group: "food" },
  { id: "guaranteed-analysis", label: "Guaranteed analysis", hint: "Protein, fat, fiber, moisture", icon: "chart", group: "food" },
  { id: "treat-label", label: "Treat label", hint: "Ingredients & calories", icon: "bone", group: "food" },
];

export const SCAN_CATEGORIES: ScanCategory[] = [...HEALTH_SCANS, ...FOOD_SCANS];

export interface ScanResultField {
  label: string;
  value: string;
  tone: "good" | "watch" | "bad";
}

export interface ScanResult {
  title: string;
  score?: string;
  scoreLabel?: string;
  urgency: "green" | "amber" | "orange" | "red";
  fields: ScanResultField[];
  patterns: string[];
  followUps: string[];
  correlation?: string;
  isFood?: boolean;
  foodIntel?: FoodScanIntel;
}

export interface FoodScanIntel {
  productName: string;
  productScore: string;
  scoreColor: string;
  ingredientFlags: IngredientFlagResult[];
  nutritionFit: string;
  nutritionFitColor: string;
  recallStatus: string;
  recallStatusColor: string;
  purityNote: string;
  cleanerOptions: string[];
}

export interface IngredientFlagResult {
  label: string;
  tone: "concern" | "watch" | "positive";
  detail: string;
}

export const SCAN_RESULTS: Record<string, ScanResult> = {
  poop: {
    title: "Stool analysis",
    score: "3.5 / 5",
    scoreLabel: "Stool score",
    urgency: "green",
    fields: [
      { label: "Color", value: "Normal brown", tone: "good" },
      { label: "Consistency", value: "Slightly soft", tone: "watch" },
      { label: "Mucus", value: "Possible", tone: "watch" },
      { label: "Blood", value: "Not detected", tone: "good" },
    ],
    patterns: ["Soft but formed — slight improvement from last log", "Light mucus coating suggests mild GI irritation"],
    followUps: ["Has appetite stayed normal?", "Any straining or urgency to go?", "Did the new treat continue today?"],
    correlation: "This occurred 2 days after adding salmon treats.",
  },
  skin: {
    title: "Skin analysis",
    score: "Moderate",
    scoreLabel: "Irritation level",
    urgency: "amber",
    fields: [
      { label: "Redness", value: "Mild–moderate", tone: "watch" },
      { label: "Hair loss", value: "Slight thinning", tone: "watch" },
      { label: "Scabs", value: "None visible", tone: "good" },
      { label: "Odor", value: "Cannot assess from photo", tone: "watch" },
    ],
    patterns: ["Redness localized to paw area", "Consistent with allergy-related licking"],
    followUps: ["Is the area warm or painful?", "Any ear involvement or head shaking?"],
    correlation: "Pairs with elevated itching scores this week.",
  },
  ear: {
    title: "Ear analysis",
    score: "Mild concern",
    scoreLabel: "Irritation",
    urgency: "amber",
    fields: [
      { label: "Discharge", value: "Minimal visible", tone: "watch" },
      { label: "Redness", value: "Mild around canal", tone: "watch" },
      { label: "Odor", value: "Cannot assess from photo", tone: "watch" },
      { label: "Swelling", value: "None visible", tone: "good" },
    ],
    patterns: ["Mild redness at ear opening", "No visible discharge or debris"],
    followUps: ["Any head shaking or ear scratching?", "Is the ear warm to touch?"],
  },
  eye: {
    title: "Eye analysis",
    score: "Normal",
    scoreLabel: "Appearance",
    urgency: "green",
    fields: [
      { label: "Redness", value: "None", tone: "good" },
      { label: "Discharge", value: "Clear, minimal", tone: "good" },
      { label: "Cloudiness", value: "None detected", tone: "good" },
      { label: "Squinting", value: "Not visible", tone: "good" },
    ],
    patterns: ["Eyes appear clear and bright", "No obvious irritation"],
    followUps: ["Any pawing at the eyes?", "Note if discharge changes color or amount"],
  },
  ingredients: {
    title: "Ingredient panel review",
    score: "B−",
    scoreLabel: "Product score",
    urgency: "amber",
    isFood: true,
    fields: [
      { label: "Protein source", value: "Chicken meal (1st)", tone: "bad" },
      { label: "Legume content", value: "High (peas, lentils)", tone: "watch" },
      { label: "Fillers", value: "Moderate", tone: "watch" },
      { label: "Additives", value: "Standard preservatives", tone: "watch" },
    ],
    patterns: ["Chicken protein may conflict with known allergy history", "High legume content — worth monitoring", "No artificial colors detected"],
    followUps: ["Compare with poultry-free options?", "Track stool and itching for 72h after feeding?"],
    foodIntel: {
      productName: "Premium Chicken & Rice Kibble",
      productScore: "B−",
      scoreColor: "#D99117",
      ingredientFlags: [
        { label: "Chicken protein", tone: "concern", detail: "Matches Buddy's known chicken sensitivity" },
        { label: "High legume content", tone: "watch", detail: "Peas and lentils appear in top 6 ingredients" },
        { label: "Omega-3 added", tone: "positive", detail: "Flaxseed and fish oil support skin health" },
        { label: "No artificial colors", tone: "positive", detail: "Clean label — no synthetic dyes" },
      ],
      nutritionFit: "Poor fit for Buddy",
      nutritionFitColor: "#D14343",
      recallStatus: "Clean — no recalls in 5 years",
      recallStatusColor: "#2E9E6B",
      purityNote: "Brand does third-party testing but does not publish batch results publicly.",
      cleanerOptions: ["Try a novel-protein kibble (salmon or duck)", "Consider limited-ingredient diet", "Look for legume-free formulas"],
    },
  },
  "treat-label": {
    title: "Treat label review",
    score: "C+",
    scoreLabel: "Product score",
    urgency: "amber",
    isFood: true,
    fields: [
      { label: "Main ingredient", value: "Salmon", tone: "good" },
      { label: "Added sugars", value: "Low", tone: "good" },
      { label: "Calories", value: "High per piece", tone: "watch" },
      { label: "Preservatives", value: "Some detected", tone: "watch" },
    ],
    patterns: ["Salmon is a novel protein — good for allergy-prone dogs", "Calorie-dense — limit to 1–2 per day", "No artificial colors or flavors"],
    followUps: ["Track stool consistency after feeding?", "Set a daily treat limit reminder?"],
    foodIntel: {
      productName: "Salmon Crunchy Chews",
      productScore: "C+",
      scoreColor: "#D99117",
      ingredientFlags: [
        { label: "Novel protein (salmon)", tone: "positive", detail: "Good for dogs with chicken sensitivities" },
        { label: "Calorie-dense", tone: "watch", detail: "Each piece is ~35 kcal — easy to overfeed" },
        { label: "Mixed tocopherols", tone: "positive", detail: "Natural preservative — no BHA/BHT" },
        { label: "Added glycerin", tone: "watch", detail: "Palatability enhancer — can soften stool in large amounts" },
      ],
      nutritionFit: "Fair fit — use sparingly",
      nutritionFitColor: "#D99117",
      recallStatus: "One voluntary recall in 2023 (moisture issue)",
      recallStatusColor: "#D99117",
      purityNote: "Brand publishes batch testing for contaminants on their website.",
      cleanerOptions: ["Single-ingredient freeze-dried salmon treats", "Air-dried fish skins (zero additives)", "Homemade dehydrated salmon bites"],
    },
  },
};

export const GENERIC_SCAN: ScanResult = {
  title: "Photo analysis",
  score: "Saved",
  scoreLabel: "Status",
  urgency: "green",
  fields: [
    { label: "Image quality", value: "Good", tone: "good" },
    { label: "Observed", value: "No obvious red flags", tone: "good" },
  ],
  patterns: ["Clear photo saved for your records and vet report."],
  followUps: ["Add a note about what you're seeing?", "Compare with a future scan?"],
};

export function getScanResult(id: string): ScanResult {
  return SCAN_RESULTS[id] ?? GENERIC_SCAN;
}
