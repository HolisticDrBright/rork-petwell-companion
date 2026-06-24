export interface ScanCategory {
  id: string;
  label: string;
  hint: string;
  icon: string;
}

export const SCAN_CATEGORIES: ScanCategory[] = [
  { id: "poop", label: "Poop / digestion", hint: "Consistency, color, mucus", icon: "droplet" },
  { id: "skin", label: "Skin / rash", hint: "Redness, hair loss, scabs", icon: "sparkle" },
  { id: "ear", label: "Ear", hint: "Discharge, redness, odor", icon: "ear" },
  { id: "eye", label: "Eye", hint: "Redness, discharge, cloudiness", icon: "eye" },
  { id: "teeth", label: "Teeth / gums", hint: "Tartar, gum color", icon: "tooth" },
  { id: "weight", label: "Weight / body condition", hint: "Body shape from above", icon: "scale" },
  { id: "food", label: "Food label", hint: "Ingredients & nutrition", icon: "tag" },
  { id: "treat", label: "Treat label", hint: "Ingredients & calories", icon: "bone" },
];

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
    patterns: [
      "Soft but formed — slight improvement from last log",
      "Light mucus coating suggests mild GI irritation",
    ],
    followUps: [
      "Has appetite stayed normal?",
      "Any straining or urgency to go?",
      "Did the new treat continue today?",
    ],
    correlation: "This occurred 2 days after adding salmon treats.",
  },
  food: {
    title: "Food label review",
    score: "B−",
    scoreLabel: "Product score",
    urgency: "amber",
    fields: [
      { label: "Protein source", value: "Chicken meal (1st)", tone: "bad" },
      { label: "Legume content", value: "High (peas, lentils)", tone: "watch" },
      { label: "Calorie density", value: "Calorie-dense", tone: "watch" },
      { label: "Fillers", value: "Moderate", tone: "watch" },
    ],
    patterns: [
      "Chicken protein may conflict with Buddy's allergy history",
      "High legume content — worth monitoring",
      "Calorie-dense treat — use sparingly",
    ],
    followUps: [
      "Want to compare with a poultry-free option?",
      "Track stool & itching for 72 hours after feeding?",
    ],
    correlation: "Recommendation: Use sparingly; watch stool and itching over 72 hours.",
  },
  treat: {
    title: "Treat label review",
    score: "C+",
    scoreLabel: "Product score",
    urgency: "amber",
    fields: [
      { label: "Main ingredient", value: "Salmon", tone: "good" },
      { label: "Added sugars", value: "Low", tone: "good" },
      { label: "Calories", value: "High per piece", tone: "watch" },
      { label: "Additives", value: "Some preservatives", tone: "watch" },
    ],
    patterns: [
      "Salmon is a novel protein — good for allergy-prone dogs",
      "Calorie-dense — limit to 1–2 per day",
    ],
    followUps: ["Track stool consistency after feeding?", "Set a daily treat limit reminder?"],
    correlation: "Brand-neutral guidance: a reasonable occasional treat in small amounts.",
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
