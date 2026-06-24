import type { UrgencyKey } from "@/constants/colors";

export interface ConcernOption {
  id: string;
  label: string;
  icon: string;
  category: "digestive" | "skin" | "eyeear" | "mobility" | "general" | "urinary";
}

export interface AnswerOption {
  id: string;
  label: string;
  redFlag?: boolean;
}

export interface TriageQuestion {
  id: string;
  question: string;
  why: string;
  options: AnswerOption[];
  allowUnsure?: boolean;
  category?: string; // groups questions
}

export interface PossibleCause {
  rank: number;
  name: string;
  note: string;
}

export interface EvidenceSection {
  supports: string[];
  doesNotSupport: string[];
  changesUrgency: string[];
}

export interface TriageResult {
  urgency: UrgencyKey;
  confidence: "Low" | "Moderate" | "High";
  causes: PossibleCause[];
  evidence: EvidenceSection;
  steps: string[];
  disclaimerNote?: string;
}

export interface TriageFlow {
  questions: TriageQuestion[];
  result: TriageResult;
}

export const CONCERNS: ConcernOption[] = [
  { id: "diarrhea", label: "Diarrhea or poop concern", icon: "droplet", category: "digestive" },
  { id: "vomiting", label: "Vomiting", icon: "wave", category: "digestive" },
  { id: "skin", label: "Skin or itching", icon: "sparkle", category: "skin" },
  { id: "ear", label: "Ear smell or discharge", icon: "ear", category: "eyeear" },
  { id: "eye", label: "Eye redness or discharge", icon: "eye", category: "eyeear" },
  { id: "limping", label: "Limping or stiffness", icon: "footprint", category: "mobility" },
  { id: "appetite", label: "Not eating", icon: "bone", category: "general" },
  { id: "energy", label: "Low energy", icon: "battery", category: "general" },
  { id: "urinary", label: "Urinary issue", icon: "toilet", category: "urinary" },
  { id: "other", label: "Something else", icon: "more", category: "general" },
];

export const FLOWS: Record<string, TriageFlow> = {
  diarrhea: {
    questions: [
      {
        id: "q1",
        question: "Is there blood in the stool?",
        why: "Blood can signal a serious GI problem and raises urgency right away.",
        options: [
          { id: "no", label: "No blood" },
          { id: "streaks", label: "A few red streaks", redFlag: true },
          { id: "lots", label: "Lots of blood / very dark", redFlag: true },
        ],
        allowUnsure: true,
        category: "Red flag check",
      },
      {
        id: "q2",
        question: "Is there vomiting too?",
        why: "Diarrhea plus repeated vomiting raises dehydration risk and changes what we worry about.",
        options: [
          { id: "no", label: "No vomiting" },
          { id: "once", label: "Once or twice" },
          { id: "repeated", label: "Repeated vomiting", redFlag: true },
        ],
        allowUnsure: true,
        category: "Red flag check",
      },
      {
        id: "q3",
        question: "How is their energy?",
        why: "Weakness or collapse is a red flag that needs faster care.",
        options: [
          { id: "normal", label: "Normal & playful" },
          { id: "quiet", label: "A little quiet" },
          { id: "weak", label: "Weak or very tired", redFlag: true },
        ],
        category: "Red flag check",
      },
      {
        id: "q4",
        question: "Are they drinking and keeping water down?",
        why: "Staying hydrated is the single most important thing during diarrhea at home.",
        options: [
          { id: "yes", label: "Yes, drinking normally" },
          { id: "little", label: "Drinking a little" },
          { id: "no", label: "Not drinking / can't keep down", redFlag: true },
        ],
        category: "Hydration",
      },
      {
        id: "q5",
        question: "How many episodes today?",
        why: "Frequency helps gauge fluid loss and how quickly things are moving.",
        options: [
          { id: "1-2", label: "1–2 times" },
          { id: "3-5", label: "3–5 times" },
          { id: "6+", label: "6 or more", redFlag: true },
        ],
        category: "Pattern & history",
      },
      {
        id: "q6",
        question: "Any new food, treats, trash, plants, or medication?",
        why: "Recent diet or toxin exposure is the most common cause — and the most fixable.",
        options: [
          { id: "treats", label: "New treats or food" },
          { id: "trash", label: "Got into trash / unknown", redFlag: true },
          { id: "none", label: "Nothing new" },
        ],
        allowUnsure: true,
        category: "Pattern & history",
      },
      {
        id: "q7",
        question: "Recent boarding, dog park, travel, or parasite exposure?",
        why: "Group settings and travel raise the chance of infectious or parasitic causes.",
        options: [
          { id: "yes", label: "Yes, recently" },
          { id: "no", label: "No" },
        ],
        allowUnsure: true,
        category: "Pattern & history",
      },
    ],
    result: {
      urgency: "amber",
      confidence: "Moderate",
      causes: [
        { rank: 1, name: "Diet change or treat intolerance", note: "Started right after new salmon treats — most likely cause." },
        { rank: 2, name: "Mild GI upset", note: "Common and usually self-limiting with supportive home care." },
        { rank: 3, name: "Parasites or infection", note: "Possible if recent park/boarding/daycare exposure." },
        { rank: 4, name: "Pancreatitis or toxin exposure", note: "Only if red flags appear — watch closely." },
      ],
      evidence: {
        supports: ["Started after new treats", "No blood reported", "Energy is normal", "Drinking water"],
        doesNotSupport: ["Multiple episodes suggest more than a minor upset", "New treat timing aligns closely"],
        changesUrgency: ["Blood in stool", "Repeated vomiting", "Weakness or pale gums", "Puppy under 6 months", "Not drinking water", "Fever"],
      },
      steps: [
        "Offer fresh water at all times and watch that they keep it down.",
        "Feed a bland diet (plain boiled protein + rice) in small amounts.",
        "Pause the new treats and log it in the timeline.",
        "Log each stool with a photo so you can track improvement.",
        "Recheck in 12 hours — book a vet if no improvement or red flags appear.",
      ],
      disclaimerNote: "If diarrhea is severe, bloody, or your pet is a puppy or senior, seek veterinary care promptly. Parvo is life-threatening in unvaccinated puppies.",
    },
  },
  skin: {
    questions: [
      {
        id: "q1",
        question: "Where is the itching?",
        why: "Location points us toward allergy vs. localized irritation or infection.",
        options: [
          { id: "paws", label: "Paws / licking feet" },
          { id: "belly", label: "Belly or armpits" },
          { id: "all", label: "All over the body" },
          { id: "spot", label: "One focused spot", redFlag: true },
        ],
        category: "Location & pattern",
      },
      {
        id: "q2",
        question: "Any redness, hair loss, odor, scabs, or fleas?",
        why: "These signs separate simple itch from a skin infection or flea problem.",
        options: [
          { id: "redness", label: "Redness only" },
          { id: "odor", label: "Odor or greasy skin", redFlag: true },
          { id: "fleas", label: "Fleas or flea dirt" },
          { id: "none", label: "None of these" },
        ],
        allowUnsure: true,
        category: "Visual signs",
      },
      {
        id: "q3",
        question: "New food, treats, shampoo, bedding, or grass exposure?",
        why: "New contact items and foods are frequent triggers we can remove.",
        options: [
          { id: "food", label: "New food or treats" },
          { id: "product", label: "New shampoo / bedding" },
          { id: "grass", label: "More time on grass" },
          { id: "none", label: "Nothing new" },
        ],
        allowUnsure: true,
        category: "Pattern & history",
      },
      {
        id: "q4",
        question: "Is licking focused on the paws?",
        why: "Paw-focused licking is a classic environmental/food allergy pattern.",
        options: [
          { id: "yes", label: "Yes, mostly paws" },
          { id: "no", label: "No, elsewhere" },
        ],
        category: "Location & pattern",
      },
      {
        id: "q5",
        question: "Any ear smell or head shaking?",
        why: "Ears and skin allergies often flare together — it changes the plan.",
        options: [
          { id: "yes", label: "Yes, ears involved", redFlag: true },
          { id: "no", label: "Ears seem fine" },
        ],
        allowUnsure: true,
        category: "Visual signs",
      },
    ],
    result: {
      urgency: "amber",
      confidence: "Moderate",
      causes: [
        { rank: 1, name: "Environmental or food allergy", note: "Paw licking + seasonal pattern fits allergy." },
        { rank: 2, name: "Flea irritation", note: "Check for flea dirt even with prevention." },
        { rank: 3, name: "Hot spot (acute moist dermatitis)", note: "If one focused, moist, angry area appears." },
        { rank: 4, name: "Yeast or bacterial skin infection", note: "Odor or greasy skin points here." },
        { rank: 5, name: "Food sensitivity flare", note: "Consistent with Buddy's known chicken sensitivity." },
      ],
      evidence: {
        supports: ["Paw-focused licking", "History of seasonal flare-ups", "No fever or lethargy", "Known food sensitivities"],
        doesNotSupport: ["No odor detected — infection less likely", "No open sores or spreading lesions"],
        changesUrgency: ["Strong odor or greasy skin", "Open, spreading sores", "Ear pain or head shaking", "Swelling of face or hives", "Fever or lethargy"],
      },
      steps: [
        "Check the skin and paws in good light; note redness and any odor.",
        "Pause any new food, shampoo, or bedding introduced recently.",
        "Wipe paws after walks to reduce pollen contact.",
        "Take a clear photo and save it to the timeline to track the area over time.",
        "Book a vet soon if there's odor, spreading sores, or ear involvement.",
      ],
    },
  },
};

// Generic fallback flow
export const GENERIC_FLOW: TriageFlow = {
  questions: [
    {
      id: "q1",
      question: "How long has this been going on?",
      why: "Duration helps separate a passing issue from something that needs a vet.",
      options: [
        { id: "today", label: "Started today" },
        { id: "days", label: "A few days" },
        { id: "week", label: "A week or more", redFlag: true },
      ],
      category: "Red flag check",
    },
    {
      id: "q2",
      question: "How is their energy and appetite?",
      why: "Normal energy and eating are reassuring signs we can monitor at home.",
      options: [
        { id: "normal", label: "Both normal" },
        { id: "off", label: "A little off" },
        { id: "poor", label: "Low energy & not eating", redFlag: true },
      ],
      category: "Red flag check",
    },
    {
      id: "q3",
      question: "Is it getting better, worse, or the same?",
      why: "The direction of change is one of the best signals of urgency.",
      options: [
        { id: "better", label: "Slowly better" },
        { id: "same", label: "About the same" },
        { id: "worse", label: "Getting worse", redFlag: true },
      ],
      category: "Pattern & history",
    },
  ],
  result: {
    urgency: "green",
    confidence: "Low",
    causes: [
      { rank: 1, name: "Minor self-limiting issue", note: "Most mild signs resolve with watchful monitoring." },
      { rank: 2, name: "Early-stage problem", note: "Worth tracking in case it develops." },
    ],
    evidence: {
      supports: ["Energy seems normal", "No severe red flags reported", "Short duration"],
      doesNotSupport: ["Limited information available — add more details in the timeline"],
      changesUrgency: ["Worsening signs", "Not eating or drinking", "Lethargy or collapse", "Lasts more than a few days", "Any red-flag sign appears"],
    },
    steps: [
      "Keep a close eye and log what you notice in the timeline.",
      "Make sure food and water intake stay normal.",
      "Take a photo or video if there's something visible to show your vet.",
      "Set a check-in reminder and book a vet if it worsens.",
    ],
  },
};

export function getFlow(concernId: string): TriageFlow {
  return FLOWS[concernId] ?? GENERIC_FLOW;
}
