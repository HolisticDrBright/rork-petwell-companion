import type {
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
    photo:
      "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&q=80",
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
    photo:
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&q=80",
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
    photo:
      "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=400&q=80",
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
  ],
  luna: [
    { id: "c1", label: "Wet food breakfast", detail: "Renal-support diet", icon: "bowl", done: true },
    { id: "c2", label: "Fresh water refresh", detail: "Track intake", icon: "droplet", done: true },
    { id: "c3", label: "Evening play", detail: "10 min wand play", icon: "activity", done: false },
  ],
  milo: [
    { id: "c1", label: "Breakfast", detail: "Puppy growth formula", icon: "bowl", done: true },
    { id: "c2", label: "Morning walk", detail: "45 min · done 8:15a", icon: "activity", done: true },
    { id: "c3", label: "Training session", detail: "Recall practice", icon: "heart", done: false },
    { id: "c4", label: "Brush teeth", detail: "Evening routine", icon: "tooth", done: false },
  ],
};

export const UPCOMING: Record<string, UpcomingItem[]> = {
  buddy: [
    { id: "u1", label: "Bordetella vaccine", detail: "Due in 12 days", date: "Jul 6", type: "vaccine" },
    { id: "u2", label: "Dermatology recheck", detail: "Greenfield Vet · 9:30a", date: "Jul 2", type: "appointment" },
    { id: "u3", label: "Apoquel refill", detail: "5 days left", date: "Jun 29", type: "refill" },
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

// Trend strip mini values (last 7 logs, 0-10 normalized)
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
  buddy:
    "Buddy's stool has been firmer for 4 of the last 5 logs since switching treats. Itching tends to rise 24–48h after chicken-based treats.",
  luna:
    "Luna's water intake is up ~15% this week. Worth noting at the kidney recheck — keep logging the water bowl.",
  milo:
    "Milo gained 3 lb this month — right on the growth curve for his age. Keep the current portion size.",
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
  ],
  luna: [
    { id: "t1", petId: "luna", date: "2026-06-25", time: "7:50a", category: "food", title: "Wet food breakfast", detail: "Renal diet · ate fully" },
    { id: "t2", petId: "luna", date: "2026-06-25", time: "7:00a", category: "activity", title: "Water intake noted", detail: "Drinking more than usual", value: 6 },
    { id: "t3", petId: "luna", date: "2026-06-23", time: "9:00a", category: "weight", title: "Weight: 9.4 lb", detail: "-0.1 lb — keep watching", value: 9.4 },
    { id: "t4", petId: "luna", date: "2026-06-20", time: "11:00a", category: "vet", title: "Senior wellness check", detail: "SDMA slightly elevated" },
  ],
  milo: [
    { id: "t1", petId: "milo", date: "2026-06-25", time: "8:15a", category: "activity", title: "Walk: 45 minutes", detail: "Park + fetch", value: 10 },
    { id: "t2", petId: "milo", date: "2026-06-25", time: "7:30a", category: "food", title: "Breakfast: puppy formula", detail: "2 cups" },
    { id: "t3", petId: "milo", date: "2026-06-24", time: "9:00a", category: "weight", title: "Weight: 38.0 lb", detail: "Right on growth curve", value: 38 },
  ],
};

export const INSIGHT_CARDS: Record<
  string,
  { type: "pattern" | "progress" | "attention"; title: string; body: string }[]
> = {
  buddy: [
    { type: "pattern", title: "Possible pattern found", body: "Itching tends to rise within 24–48 hours after chicken-based treats." },
    { type: "progress", title: "Progress", body: "Stool consistency improved 38% over the past week." },
    { type: "attention", title: "Needs attention", body: "Weight has increased 3.2 lb in 6 weeks." },
  ],
  luna: [
    { type: "attention", title: "Needs attention", body: "Water intake up ~15% this week — note at kidney recheck." },
    { type: "progress", title: "Stable", body: "Weight holding steady at 9.4 lb over the past month." },
  ],
  milo: [
    { type: "progress", title: "Progress", body: "Activity consistently high — averaging 42 min/day." },
    { type: "pattern", title: "On track", body: "Weight gain matches the healthy puppy growth curve." },
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
      { id: "vv1", title: "Dermatology recheck", subtitle: "Greenfield Vet", date: "Jun 18, 2026" },
      { id: "vv2", title: "Annual wellness", subtitle: "Greenfield Vet", date: "Mar 4, 2026" },
    ],
    "Lab results": [
      { id: "l1", title: "CBC / Chemistry", subtitle: "Within normal limits", date: "Mar 2026", status: "ok" },
      { id: "l2", title: "Skin cytology", subtitle: "Mild yeast noted", date: "Jun 2026" },
    ],
    Documents: [
      { id: "d1", title: "Adoption records", subtitle: "PDF", date: "2021" },
      { id: "d2", title: "Vaccine certificate", subtitle: "PDF", date: "2025" },
    ],
    Insurance: [
      { id: "i1", title: "Healthy Paws", subtitle: "Policy #HP-44821 · 80% coverage", date: "Active" },
    ],
    Microchip: [
      { id: "mc1", title: "HomeAgain", subtitle: "#985112004567890", date: "Registered" },
    ],
    "Emergency contacts": [
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180", date: "Mon–Sat" },
      { id: "e2", title: "BluePearl ER", subtitle: "24/7 emergency · (555) 911-0000", date: "Open now" },
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
      { id: "vv1", title: "Senior wellness", subtitle: "Greenfield Vet", date: "Jun 20, 2026" },
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
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180", date: "Mon–Sat" },
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
      { id: "vv1", title: "Puppy wellness", subtitle: "Greenfield Vet", date: "May 12, 2026" },
    ],
    "Lab results": [],
    Documents: [],
    Insurance: [],
    Microchip: [
      { id: "mc1", title: "HomeAgain", subtitle: "#985112009998887", date: "Registered" },
    ],
    "Emergency contacts": [
      { id: "e1", title: "Greenfield Vet", subtitle: "Primary · (555) 240-1180", date: "Mon–Sat" },
    ],
  },
};

export const REMINDERS: Record<string, Reminder[]> = {
  buddy: [
    { id: "r1", label: "Apoquel", detail: "Itch medication", time: "6:00 PM", enabled: true, repeat: "Daily" },
    { id: "r2", label: "Omega-3 chew", detail: "With breakfast", time: "7:30 AM", enabled: true, repeat: "Daily" },
    { id: "r3", label: "Refill Apoquel", detail: "5 days of supply left", time: "Jun 29", enabled: true, repeat: "Once" },
    { id: "r4", label: "12-hour symptom check", detail: "Digestion follow-up", time: "8:00 PM", enabled: false, repeat: "Once" },
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
