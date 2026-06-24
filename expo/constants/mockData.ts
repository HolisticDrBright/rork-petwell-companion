import type {
  AttentionItem,
  CleanerAlternative,
  FoodProduct,
  HealthSignal,
  PatternCard,
  Pet,
  CareItem,
  TimelineEntry,
  UpcomingItem,
  RecordItem,
  Reminder,
  ConnectedDevice,
} from "@/types/pet";

export const PETS: Pet[] = [
  {
    id: "buddy",
    name: "Buddy",
    species: "dog",
    breed: "Golden Retriever",
    ageYears: 5,
    sex: "male",
    weightLb: 71.2,
    photo: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&q=80",
    status: "stable",
    statusNote: "Stable",
    recentChange: "Stool improved after food change",
    riskWatch: "Skin itching still elevated",
    conditions: ["Food sensitivity", "Atopic skin (itch)"],
    allergies: ["Chicken protein", "Pollen (seasonal)"],
  },
  {
    id: "luna",
    name: "Luna",
    species: "cat",
    breed: "Domestic Shorthair",
    ageYears: 12,
    sex: "female",
    weightLb: 9.4,
    photo: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80",
    status: "watch",
    statusNote: "Monitoring",
    recentChange: "Drinking slightly more this week",
    riskWatch: "Early kidney values — recheck due",
    conditions: ["Early kidney monitoring (IRIS 1)"],
    allergies: [],
  },
  {
    id: "milo",
    name: "Milo",
    species: "dog",
    breed: "Mixed Breed",
    ageYears: 1,
    sex: "male",
    weightLb: 38.0,
    photo: "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&q=80",
    status: "stable",
    statusNote: "Thriving",
    recentChange: "Hit ideal weight for age",
    riskWatch: "None — keep up activity",
    conditions: [],
    allergies: [],
  },
];

export const CARE_ITEMS: Record<string, CareItem[]> = {
  buddy: [
    { id: "c1", label: "Breakfast", detail: "Lamb & rice kibble · logged 7:40a", icon: "bowl", done: true },
    { id: "c2", label: "Omega-3 supplement", detail: "1 chew with food", icon: "pill", done: false },
    { id: "c3", label: "30-minute walk", detail: "Activity goal", icon: "activity", done: false },
    { id: "c4", label: "Brush teeth", detail: "Evening routine", icon: "tooth", done: false },
    { id: "c5", label: "Apoquel 16mg", detail: "Evening dose · 6:00 PM", icon: "pill", done: false },
  ],
  luna: [
    { id: "c1", label: "Wet food breakfast", detail: "Renal-support diet", icon: "bowl", done: true },
    { id: "c2", label: "Fresh water refresh", detail: "Track intake", icon: "droplet", done: true },
    { id: "c3", label: "Evening play", detail: "10 min wand play", icon: "activity", done: false },
    { id: "c4", label: "Log water intake", detail: "Daily tracking", icon: "droplet", done: false },
  ],
  milo: [
    { id: "c1", label: "Breakfast", detail: "Puppy growth formula", icon: "bowl", done: true },
    { id: "c2", label: "Morning walk", detail: "45 min · done 8:15a", icon: "activity", done: true },
    { id: "c3", label: "Training session", detail: "Recall practice", icon: "heart", done: false },
    { id: "c4", label: "Brush teeth", detail: "Evening routine", icon: "tooth", done: false },
  ],
};

export const ATTENTION_ITEMS: Record<string, AttentionItem[]> = {
  buddy: [
    { id: "a1", label: "Skin itching elevated", detail: "6/10 today — down from 7/10 last week but still above baseline", urgency: "amber", action: "Ask about itching", actionRoute: "/ask" },
    { id: "a2", label: "Apoquel refill in 4 days", detail: "Contact vet for refill before weekend", urgency: "amber", action: "Book refill", actionRoute: "/reminders" },
    { id: "a3", label: "New treat under observation", detail: "Salmon treats introduced 3 days ago — stool watch period", urgency: "green", action: "Log stool", actionRoute: "/scan" },
  ],
  luna: [
    { id: "a1", label: "Water intake up ~15%", detail: "Track and note at upcoming kidney recheck", urgency: "amber", action: "Log intake" },
    { id: "a2", label: "Kidney recheck due", detail: "SDMA bloodwork — book appointment in July", urgency: "amber", action: "Set reminder", actionRoute: "/reminders" },
    { id: "a3", label: "Weight trending down slightly", detail: "9.4 lb — keep monitoring portion sizes", urgency: "green" },
  ],
  milo: [
    { id: "a1", label: "DHPP booster due soon", detail: "Final puppy shot — schedule Jul 12", urgency: "amber", action: "Book vet", actionRoute: "/records" },
    { id: "a2", label: "Growth on track", detail: "38 lb at 12 months — right on curve", urgency: "green" },
  ],
};

export const HEALTH_SIGNALS: Record<string, HealthSignal[]> = {
  buddy: [
    { id: "hs1", label: "Stool", icon: "droplet", value: "8/10", history: [3, 3, 4, 5, 7, 7, 8], trend: "up", color: "#2E9E6B", status: "good" },
    { id: "hs2", label: "Appetite", icon: "bowl", value: "9/10", history: [8, 8, 7, 9, 9, 9, 9], trend: "flat", color: "#137A72", status: "good" },
    { id: "hs3", label: "Itching", icon: "sparkle", value: "6/10", history: [4, 5, 6, 6, 7, 6, 6], trend: "down", color: "#F0A93B", status: "watch" },
    { id: "hs4", label: "Activity", icon: "activity", value: "8/10", history: [6, 7, 5, 8, 7, 8, 8], trend: "up", color: "#F4795F", status: "good" },
    { id: "hs5", label: "Weight", icon: "scale", value: "71.2", unit: "lb", history: [70, 70.4, 70.8, 71, 71, 71.2, 71.2], trend: "flat", color: "#0E5C57", status: "good" },
  ],
  luna: [
    { id: "hs1", label: "Stool", icon: "droplet", value: "7/10", history: [6, 6, 7, 6, 7, 7, 7], trend: "flat", color: "#2E9E6B", status: "good" },
    { id: "hs2", label: "Appetite", icon: "bowl", value: "7/10", history: [7, 7, 6, 7, 6, 6, 7], trend: "flat", color: "#137A72", status: "good" },
    { id: "hs3", label: "Activity", icon: "activity", value: "5/10", history: [4, 5, 4, 5, 4, 5, 5], trend: "flat", color: "#F4795F", status: "good" },
    { id: "hs4", label: "Weight", icon: "scale", value: "9.4", unit: "lb", history: [9.8, 9.7, 9.6, 9.5, 9.5, 9.4, 9.4], trend: "down", color: "#F0A93B", status: "watch" },
    { id: "hs5", label: "Hydration", icon: "droplet", value: "Watch", history: [5, 5, 5, 6, 6, 6, 6], trend: "up", color: "#F0A93B", status: "watch" },
  ],
  milo: [
    { id: "hs1", label: "Appetite", icon: "bowl", value: "10/10", history: [9, 9, 10, 9, 10, 9, 10], trend: "up", color: "#137A72", status: "good" },
    { id: "hs2", label: "Stool", icon: "droplet", value: "9/10", history: [8, 8, 9, 8, 9, 9, 9], trend: "up", color: "#2E9E6B", status: "good" },
    { id: "hs3", label: "Activity", icon: "activity", value: "10/10", history: [9, 10, 9, 10, 9, 10, 10], trend: "up", color: "#F4795F", status: "good" },
    { id: "hs4", label: "Weight", icon: "scale", value: "38", unit: "lb", history: [35, 35.8, 36.4, 37, 37.4, 37.8, 38], trend: "up", color: "#0E5C57", status: "good" },
  ],
};

export const PATTERN_CARDS: Record<string, PatternCard[]> = {
  buddy: [
    { id: "p1", type: "correlation", title: "Itching and chicken treats", body: "Itching tends to rise within 24–48 hours after chicken-based treats.", evidence: "Out of 5 chicken-treat days in June, itching averaged 6.4 vs. 4.8 on non-chicken days.", petId: "buddy" },
    { id: "p2", type: "progress", title: "Stool improving steadily", body: "Stool consistency improved 38% over the past week since switching treats.", evidence: "Score went from 3/5 to 8/10 in 7 days.", petId: "buddy" },
    { id: "p3", type: "attention", title: "Weight trend: +3.2 lb in 6 weeks", body: "Weight has crept up since the food trial began.", evidence: "70 → 71.2 lb in 6 weeks. Discuss portion adjustment at dermatology check.", petId: "buddy" },
  ],
  luna: [
    { id: "p1", type: "attention", title: "Water intake trending up", body: "Water intake ~15% above baseline this week. Worth noting at kidney recheck.", evidence: "Tracked via daily water bowl logs since June 18.", petId: "luna" },
    { id: "p2", type: "progress", title: "Weight stable", body: "Weight holding at 9.4 lb over the past month — good sign for kidney management.", petId: "luna" },
    { id: "p3", type: "insight", title: "SDMA recheck window", body: "Vet recommended SDMA recheck 6 weeks from last visit — book for mid-July.", petId: "luna" },
  ],
  milo: [
    { id: "p1", type: "progress", title: "Right on growth curve", body: "Weight gain matches the healthy puppy growth curve — 38 lb at 12 months.", petId: "milo" },
    { id: "p2", type: "insight", title: "Activity consistently high", body: "Averaging 42 min/day of exercise — great for joint development.", petId: "milo" },
  ],
};

export const UPCOMING: Record<string, UpcomingItem[]> = {
  buddy: [
    { id: "u1", label: "Bordetella vaccine", detail: "Due in 12 days", date: "Jul 6", type: "vaccine" },
    { id: "u2", label: "Dermatology recheck", detail: "Greenfield Vet · 9:30a", date: "Jul 2", type: "appointment" },
    { id: "u3", label: "Apoquel refill", detail: "5 days left", date: "Jun 29", type: "refill" },
    { id: "u4", label: "Brush teeth", detail: "Evening routine", date: "Daily", type: "medication" },
  ],
  luna: [
    { id: "u1", label: "Kidney recheck (SDMA)", detail: "Bloodwork due", date: "Jul 9", type: "appointment" },
    { id: "u2", label: "Rabies booster", detail: "Due in 5 weeks", date: "Jul 30", type: "vaccine" },
  ],
  milo: [
    { id: "u1", label: "DHPP booster", detail: "Final puppy shot", date: "Jul 12", type: "vaccine" },
    { id: "u2", label: "Neuter consult", detail: "Greenfield Vet", date: "Aug 4", type: "appointment" },
  ],
};

export const TRENDS: Record<string, Record<string, number[]>> = {
  buddy: {
    appetite: [8, 8, 7, 9, 9, 9, 9],
    stool: [3, 3, 4, 5, 7, 7, 8],
    itching: [4, 5, 6, 6, 7, 6, 6],
    activity: [6, 7, 5, 8, 7, 8, 8],
    weight: [70, 70.4, 70.8, 71, 71, 71.2, 71.2],
  },
  luna: {
    appetite: [7, 7, 6, 7, 6, 6, 7],
    stool: [6, 6, 7, 6, 7, 7, 7],
    itching: [1, 1, 1, 2, 1, 1, 1],
    activity: [4, 5, 4, 5, 4, 5, 5],
    weight: [9.8, 9.7, 9.6, 9.5, 9.5, 9.4, 9.4],
  },
  milo: {
    appetite: [9, 9, 10, 9, 10, 9, 10],
    stool: [8, 8, 9, 8, 9, 9, 9],
    itching: [0, 1, 0, 0, 1, 0, 0],
    activity: [9, 10, 9, 10, 9, 10, 10],
    weight: [35, 35.8, 36.4, 37, 37.4, 37.8, 38],
  },
};

export const SMART_INSIGHT: Record<string, string> = {
  buddy: "Buddy's stool has been firmer for 4 of the last 5 logs since switching treats. Itching tends to rise 24–48h after chicken-based treats.",
  luna: "Luna's water intake is up ~15% this week. Worth noting at the kidney recheck — keep logging the water bowl.",
  milo: "Milo gained 3 lb this month — right on the growth curve for his age. Keep the current portion size.",
};

export const TIMELINE: Record<string, TimelineEntry[]> = {
  buddy: [
    { id: "t1", petId: "buddy", date: "2026-06-25", time: "8:10a", category: "stool", title: "Stool improved", detail: "Formed, score 4/5", value: 8 },
    { id: "t2", petId: "buddy", date: "2026-06-25", time: "7:45a", category: "food", title: "Breakfast: lamb kibble", detail: "1.5 cups" },
    { id: "t3", petId: "buddy", date: "2026-06-25", time: "7:30a", category: "skin", title: "Itching 4/10", detail: "Less paw licking", value: 4 },
    { id: "t4", petId: "buddy", date: "2026-06-24", time: "6:20p", category: "activity", title: "Walk: 34 minutes", detail: "Neighborhood loop", value: 8 },
    { id: "t5", petId: "buddy", date: "2026-06-24", time: "1:15p", category: "scan", title: "Poop scan saved", detail: "Score 3.5/5 · mucus possible", value: 7, urgency: "green" },
    { id: "t6", petId: "buddy", date: "2026-06-24", time: "12:30p", category: "skin", title: "Itching 6/10", detail: "Focused on paws", value: 6 },
    { id: "t7", petId: "buddy", date: "2026-06-24", time: "8:00a", category: "food", title: "Treat: salmon chew", detail: "New treat trial" },
    { id: "t8", petId: "buddy", date: "2026-06-24", time: "7:40a", category: "food", title: "Breakfast: lamb kibble", detail: "1.5 cups" },
    { id: "t9", petId: "buddy", date: "2026-06-22", time: "9:00a", category: "weight", title: "Weight: 71.0 lb", detail: "+0.4 lb from last week", value: 71 },
    { id: "t10", petId: "buddy", date: "2026-06-21", time: "5:30p", category: "meds", title: "Apoquel given", detail: "16mg evening dose" },
    { id: "t11", petId: "buddy", date: "2026-06-18", time: "10:00a", category: "vet", title: "Dermatology visit", detail: "Started food trial + Omega-3" },
    { id: "t12", petId: "buddy", date: "2026-06-17", time: "8:00a", category: "food", title: "Treat: chicken biscuit", detail: "Last chicken-based treat before trial" },
  ],
  luna: [
    { id: "t1", petId: "luna", date: "2026-06-25", time: "7:50a", category: "food", title: "Wet food breakfast", detail: "Renal diet · ate fully" },
    { id: "t2", petId: "luna", date: "2026-06-25", time: "7:00a", category: "activity", title: "Water intake noted", detail: "Drinking more than usual", value: 6 },
    { id: "t3", petId: "luna", date: "2026-06-23", time: "9:00a", category: "weight", title: "Weight: 9.4 lb", detail: "-0.1 lb — keep watching", value: 9.4 },
    { id: "t4", petId: "luna", date: "2026-06-20", time: "11:00a", category: "vet", title: "Senior wellness check", detail: "SDMA slightly elevated" },
    { id: "t5", petId: "luna", date: "2026-06-19", time: "6:00p", category: "symptom", title: "Drinking noted", detail: "Finished water bowl faster than usual" },
  ],
  milo: [
    { id: "t1", petId: "milo", date: "2026-06-25", time: "8:15a", category: "activity", title: "Walk: 45 minutes", detail: "Park + fetch", value: 10 },
    { id: "t2", petId: "milo", date: "2026-06-25", time: "7:30a", category: "food", title: "Breakfast: puppy formula", detail: "2 cups" },
    { id: "t3", petId: "milo", date: "2026-06-24", time: "9:00a", category: "weight", title: "Weight: 38.0 lb", detail: "Right on growth curve", value: 38 },
    { id: "t4", petId: "milo", date: "2026-06-23", time: "5:30p", category: "activity", title: "Puppy class", detail: "Graduation week!", value: 9 },
  ],
};

export const RECORDS: Record<string, Record<string, RecordItem[]>> = {
  buddy: {
    Vaccines: [
      { id: "v1", title: "Rabies (3-year)", subtitle: "Greenfield Vet", date: "Mar 2025", status: "ok" },
      { id: "v2", title: "DHPP", subtitle: "Up to date", date: "Mar 2025", status: "ok" },
      { id: "v3", title: "Bordetella", subtitle: "Due in 12 days", date: "Jul 2026", status: "due" },
    ],
    Medications: [
      { id: "m1", title: "Apoquel 16mg", subtitle: "Itch control · 1x daily", date: "Refill Jun 29", status: "due" },
      { id: "m2", title: "Omega-3 chew", subtitle: "Skin support · 1x daily", date: "Ongoing", status: "ok" },
    ],
    Conditions: [
      { id: "co1", title: "Atopic dermatitis", subtitle: "Managed with diet + meds", date: "Since 2024" },
      { id: "co2", title: "Food sensitivity", subtitle: "Chicken protein", date: "Since 2023" },
    ],
    Allergies: [
      { id: "a1", title: "Chicken protein", subtitle: "GI + skin reaction", date: "Confirmed" },
      { id: "a2", title: "Seasonal pollen", subtitle: "Spring flare-ups", date: "Suspected" },
    ],
    "Vet visits": [
      { id: "vv1", title: "Dermatology recheck", subtitle: "Greenfield Vet · Dr. Chen", date: "Jun 18, 2026" },
      { id: "vv2", title: "Annual wellness", subtitle: "Greenfield Vet · Dr. Chen", date: "Mar 4, 2026" },
    ],
    "Lab results": [
      { id: "l1", title: "CBC / Chemistry", subtitle: "Within normal limits", date: "Mar 2026", status: "ok" },
      { id: "l2", title: "Skin cytology", subtitle: "Mild yeast noted", date: "Jun 2026" },
    ],
    Documents: [
      { id: "d1", title: "Adoption records", subtitle: "PDF · 2021", date: "2021" },
      { id: "d2", title: "Vaccine certificate", subtitle: "PDF · 2025", date: "2025" },
      { id: "d3", title: "Food trial journal", subtitle: "PDF · June 2026", date: "2026" },
    ],
    Insurance: [
      { id: "i1", title: "Healthy Paws", subtitle: "Policy #HP-44821 · 80% coverage", date: "Active" },
    ],
    Microchip: [
      { id: "mc1", title: "HomeAgain", subtitle: "#985112004567890", date: "Registered" },
    ],
    "Emergency contacts": [
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180 · Mon–Sat 8–6", date: "Primary" },
      { id: "e2", title: "BluePearl ER", subtitle: "24/7 emergency · (555) 911-0000 · 3.2 mi", date: "Emergency" },
    ],
  },
  luna: {
    Vaccines: [
      { id: "v1", title: "Rabies", subtitle: "Due in 5 weeks", date: "Jul 2026", status: "due" },
      { id: "v2", title: "FVRCP", subtitle: "Up to date", date: "Feb 2026", status: "ok" },
    ],
    Medications: [],
    Conditions: [
      { id: "co1", title: "Early kidney disease", subtitle: "IRIS Stage 1 monitoring", date: "Since 2026" },
    ],
    Allergies: [],
    "Vet visits": [
      { id: "vv1", title: "Senior wellness", subtitle: "Greenfield Vet · Dr. Patel", date: "Jun 20, 2026" },
    ],
    "Lab results": [
      { id: "l1", title: "SDMA", subtitle: "Slightly elevated (16)", date: "Jun 2026", status: "due" },
      { id: "l2", title: "Urinalysis", subtitle: "USG low-normal", date: "Jun 2026" },
    ],
    Documents: [],
    Insurance: [],
    Microchip: [
      { id: "mc1", title: "24PetWatch", subtitle: "#956000012345678", date: "Registered" },
    ],
    "Emergency contacts": [
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180 · Mon–Sat", date: "Primary" },
      { id: "e2", title: "Cat ER Center", subtitle: "24/7 · (555) 911-0011 · 4.8 mi", date: "Emergency" },
    ],
  },
  milo: {
    Vaccines: [
      { id: "v1", title: "DHPP (booster)", subtitle: "Final puppy shot due", date: "Jul 2026", status: "due" },
      { id: "v2", title: "Rabies", subtitle: "Given", date: "May 2026", status: "ok" },
    ],
    Medications: [],
    Conditions: [],
    Allergies: [],
    "Vet visits": [
      { id: "vv1", title: "Puppy wellness", subtitle: "Greenfield Vet · Dr. Chen", date: "May 12, 2026" },
    ],
    "Lab results": [],
    Documents: [],
    Insurance: [],
    Microchip: [
      { id: "mc1", title: "HomeAgain", subtitle: "#985112009998887", date: "Registered" },
    ],
    "Emergency contacts": [
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180 · Mon–Sat", date: "Primary" },
      { id: "e2", title: "BluePearl ER", subtitle: "24/7 · (555) 911-0000 · 3.2 mi", date: "Emergency" },
    ],
  },
};

export const REMINDERS: Record<string, Reminder[]> = {
  buddy: [
    { id: "r1", label: "Apoquel", detail: "Itch medication", time: "6:00 PM", enabled: true, repeat: "Daily" },
    { id: "r2", label: "Omega-3 chew", detail: "With breakfast", time: "7:30 AM", enabled: true, repeat: "Daily" },
    { id: "r3", label: "Refill Apoquel", detail: "5 days of supply left", time: "Jun 29", enabled: true, repeat: "Once" },
    { id: "r4", label: "12-hour symptom check", detail: "Digestion follow-up", time: "8:00 PM", enabled: false, repeat: "Once" },
    { id: "r5", label: "Brush teeth", detail: "Evening routine", time: "9:00 PM", enabled: true, repeat: "Daily" },
  ],
  luna: [
    { id: "r1", label: "Kidney recheck", detail: "Book SDMA bloodwork", time: "Jul 9", enabled: true, repeat: "Once" },
    { id: "r2", label: "Log water intake", detail: "Track daily", time: "8:00 PM", enabled: true, repeat: "Daily" },
  ],
  milo: [
    { id: "r1", label: "DHPP booster", detail: "Final puppy shot", time: "Jul 12", enabled: true, repeat: "Once" },
  ],
};

export const DEVICES: ConnectedDevice[] = [
  { id: "tractive", name: "Tractive GPS", brand: "Tractive", connected: false, dataTypes: ["Activity", "Sleep", "Location"] },
  { id: "petpace", name: "PetPace Collar", brand: "PetPace", connected: false, dataTypes: ["Resting HR", "Respiratory rate", "Activity"] },
  { id: "fi", name: "Fi Smart Collar", brand: "Fi", connected: false, dataTypes: ["Activity", "Sleep", "Location", "Scratching"] },
  { id: "health", name: "Health Export", brand: "Apple Health-style", connected: false, dataTypes: ["Activity", "Sleep", "Heart rate"] },
];

// --- FOOD INTELLIGENCE DATA ---
export const FOOD_PRODUCTS: Record<string, FoodProduct> = {
  "chicken-kibble": {
    id: "chicken-kibble",
    name: "Premium Chicken & Rice Kibble",
    brand: "National Pet Foods",
    type: "kibble",
    score: "B−",
    scoreColor: "#D99117",
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80",
    species: ["dog"],
    lifeStage: ["Adult"],
    proteinSource: "Chicken meal",
    proteinPct: 24,
    fatPct: 14,
    fiberPct: 3.5,
    kcalPerCup: 390,
    ingredientFlags: [
      { type: "concern", label: "Chicken protein", detail: "Matches Buddy's known chicken sensitivity — may trigger itching" },
      { type: "watch", label: "High legume content", detail: "Peas and lentils appear in top 6 ingredients" },
      { type: "positive", label: "Omega-3 added", detail: "Flaxseed and fish oil support skin and coat health" },
      { type: "positive", label: "No artificial colors", detail: "Clean label — no synthetic dyes" },
    ],
    nutritionFit: {
      score: "Poor",
      color: "#D14343",
      summary: "Chicken protein is contraindicated for Buddy based on allergy history.",
      details: ["Chicken triggers both GI and skin reactions for Buddy", "Moderate protein at 24% — adequate but not premium", "Legume content is higher than ideal for golden retrievers"],
    },
    recallHistory: [],
    purityEvidence: {
      testing: "Third-party tested but results not published publicly",
      sourcing: "Ingredients sourced from multiple countries",
      manufacturing: "Co-manufactured at shared facilities",
      score: "Moderate",
    },
    brandTransparency: {
      countryOfOrigin: "USA (manufactured)",
      manufacturingDisclosed: true,
      supplierDisclosure: "Partial — protein sources named, botanicals not detailed",
      contactAvailable: true,
      score: "Good",
    },
    cleanerAlternatives: [
      { name: "Wild Salmon & Sweet Potato", brand: "Open Paw", score: "A−", why: "Novel protein, legume-free, single-source fish" },
      { name: "Limited Ingredient Duck", brand: "Pure Pet", score: "A", why: "Single protein, no fillers, batch-tested purity" },
      { name: "Venison & Ancient Grains", brand: "Earth Hound", score: "B+", why: "Novel protein, grain-inclusive, no legumes" },
    ],
    sources: [
      { label: "AAFCO nutritional adequacy", url: "#" },
      { label: "Dog Food Advisor review", url: "#" },
    ],
  },
  "salmon-treats": {
    id: "salmon-treats",
    name: "Salmon Crunchy Chews",
    brand: "Happy Tails",
    type: "treat",
    score: "C+",
    scoreColor: "#D99117",
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&q=80",
    species: ["dog", "cat"],
    lifeStage: ["All life stages"],
    proteinSource: "Salmon",
    proteinPct: 45,
    fatPct: 18,
    fiberPct: 1,
    kcalPerPiece: 35,
    ingredientFlags: [
      { type: "positive", label: "Novel protein (salmon)", detail: "Good for dogs with chicken sensitivities" },
      { type: "watch", label: "Calorie-dense", detail: "35 kcal/piece — easy to overfeed; limit to 1–2/day" },
      { type: "positive", label: "Mixed tocopherols", detail: "Natural preservative — no BHA/BHT" },
      { type: "watch", label: "Added glycerin", detail: "Palatability enhancer — may soften stool in large amounts" },
    ],
    nutritionFit: {
      score: "Fair",
      color: "#D99117",
      summary: "A reasonable occasional treat for Buddy in small amounts.",
      details: ["Novel protein is safe for chicken-allergic dogs", "Calorie density means strict portion control is important", "Watch stool consistency when introducing"],
    },
    recallHistory: [
      { date: "Mar 2023", reason: "Voluntary recall — potential moisture issue in one lot", scope: "Lot #HT2303B only" },
    ],
    purityEvidence: {
      testing: "Brand publishes batch-testing results for contaminants",
      sourcing: "Wild-caught Alaskan salmon",
      manufacturing: "Own facility in Oregon, USA",
      score: "Strong",
    },
    brandTransparency: {
      countryOfOrigin: "USA",
      manufacturingDisclosed: true,
      supplierDisclosure: "Full — fishery and lot numbers published",
      contactAvailable: true,
      score: "Excellent",
    },
    cleanerAlternatives: [
      { name: "Single-Ingredient Freeze-Dried Salmon", brand: "Pure Bites", score: "A+", why: "One ingredient, zero additives, 3 kcal/piece" },
      { name: "Air-Dried Fish Skins", brand: "Ocean Chew", score: "A", why: "Single ingredient, natural dental benefit, low calorie" },
    ],
    sources: [
      { label: "Happy Tails batch test results", url: "#" },
      { label: "FDA recall database entry", url: "#" },
    ],
  },
};

export function getFoodProduct(id: string): FoodProduct | undefined {
  return FOOD_PRODUCTS[id];
}
