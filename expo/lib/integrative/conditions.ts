import type { EvidenceGrade } from "./types";

export interface FoodFirstStep {
  title: string;
  detail: string;
  evidence: EvidenceGrade;
  source: string;
}

export interface ConditionTemplate {
  id: string;
  title: string;
  system: string;
  pattern: string;
  redFlags: string[];
  foodFirst: FoodFirstStep[];
  lifestyle: string[];
  considerItems: string[]; // catalog ids the engine filters by species/safety
  whatToTrack: string[];
  whenToAskVet: string[];
  notes: string[];
  catGuidance?: string;
}

export const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: "pancreatitis",
    title: "Pancreatitis low-fat support",
    system: "hepatic",
    pattern: "Fat maldigestion / pancreatic inflammation",
    redFlags: [
      "Repeated vomiting",
      "Severe belly pain (hunched, splinting, won't lie down)",
      "Not eating with lethargy",
      "Collapse or weakness",
      "Yellow gums or eyes (jaundice)",
    ],
    foodFirst: [
      {
        title: "Feed a low-fat plan (dogs)",
        detail:
          "Once your vet confirms it's safe to eat, choose a low-fat diet (a vet therapeutic low-fat food, or roughly <10% fat on a dry-matter basis) in small, frequent meals.",
        evidence: "B",
        source: "Low-fat nutrition is standard supportive care for canine pancreatitis.",
      },
      {
        title: "No fatty treats or table scraps",
        detail:
          "Avoid bacon, cheese, fatty meats, oils, and pan drippings — even one high-fat treat can trigger a relapse.",
        evidence: "B",
        source: "Dietary fat is a recognized relapse trigger.",
      },
      {
        title: "Hydration support",
        detail: "Offer fresh water often; a little plain low-sodium broth can encourage drinking once eating is okay.",
        evidence: "C",
        source: "Supportive-care practice.",
      },
    ],
    lifestyle: [
      "Keep meals scheduled and portioned; block garbage and counter access",
      "Work toward a healthy weight gradually",
      "Reduce stress around mealtimes",
    ],
    considerItems: ["white_fish", "probiotic", "omega3", "digestive_enzymes", "milk_thistle"],
    whatToTrack: [
      "Appetite and each meal (food log)",
      "Vomiting episodes — count and content (vomit log)",
      "Stool consistency (stool log)",
      "Energy level",
      "Weight weekly",
    ],
    whenToAskVet: [
      "Repeated vomiting, belly pain, or not eating → see a vet now",
      "Before starting any enzyme, herb, or supplement",
      "If signs return after improving (relapse)",
    ],
    notes: [
      "Relapse often follows a high-fat meal within 24–72 hours — keep fat strictly controlled even after recovery.",
      "Build a food + stool/vomit log and export a vet-ready report for your appointment.",
    ],
    catGuidance:
      "Cats are different: feline pancreatitis is usually NOT managed with aggressive low-fat dieting, and keeping a cat eating is critical. Never withhold food from a cat without veterinary advice — follow your vet's species-specific plan.",
  },
  {
    id: "chronic_diarrhea",
    title: "Chronic diarrhea gut-reset support",
    system: "gut",
    pattern: "Microbiome imbalance / digestive inflammation",
    redFlags: [
      "Blood in stool or black/tarry stool",
      "Repeated vomiting",
      "Lethargy or weakness",
      "Can't keep water down",
      "A puppy/kitten or senior declining quickly",
    ],
    foodFirst: [
      {
        title: "Short gut-reset bland diet",
        detail:
          "With your vet's okay, feed a bland diet (plain cooked lean protein + a digestible carbohydrate, or a vet GI diet) for a few days, then transition back over 5–7 days.",
        evidence: "B",
        source: "Bland diets + gradual transitions are standard for GI upset.",
      },
      {
        title: "Add soluble fiber",
        detail: "A little plain pumpkin can help firm up stool.",
        evidence: "C",
        source: "Soluble-fiber guidance.",
      },
      {
        title: "Find diet triggers",
        detail: "Track foods/treats; if it recurs, ask your vet about a guided elimination trial.",
        evidence: "B",
        source: "Elimination trials for food-responsive enteropathy.",
      },
    ],
    lifestyle: [
      "Keep fresh water available and watch hydration",
      "Stay current on parasite prevention (ask your vet about a fecal test)",
      "Avoid sudden diet changes",
    ],
    considerItems: ["probiotic", "pumpkin", "white_fish", "bone_broth", "slippery_elm"],
    whatToTrack: [
      "Stool score and frequency (stool log)",
      "Food and treats (food log)",
      "Water intake",
      "Energy and appetite",
    ],
    whenToAskVet: [
      "Blood, black/tarry stool, or repeated vomiting → see a vet now",
      "Diarrhea lasting more than 48–72 hours or recurring",
      "Any weight loss",
    ],
    notes: ["Reintroduce the regular diet slowly — a too-fast switch is a common cause of relapse."],
  },
  {
    id: "itchy_skin",
    title: "Itchy skin / allergy support",
    system: "skin",
    pattern: "Allergic / atopic inflammation; damp-heat pattern (TCM)",
    redFlags: [
      "Facial swelling, hives, or trouble breathing",
      "Open, spreading, or oozing sores",
      "Severe pain or not eating",
    ],
    foodFirst: [
      {
        title: "Vet-guided elimination diet",
        detail: "An 8–12 week elimination diet is the gold-standard way to identify food triggers.",
        evidence: "A",
        source: "Dermatology consensus on elimination trials.",
      },
      {
        title: "Consider a novel / cooling protein",
        detail:
          "Some itchy pets do better on a novel protein; in TCM, cooling proteins (duck, white fish, rabbit) may suit heat-pattern itch while warming proteins (lamb, chicken) may aggravate it.",
        evidence: "C",
        source: "Diet trials in allergic skin disease; TCM food energetics.",
      },
      {
        title: "Omega-3-rich foods",
        detail: "Sardines or a fish-oil topper may support the skin barrier.",
        evidence: "B",
        source: "Omega-3s in canine atopic dermatitis.",
      },
    ],
    lifestyle: [
      "Wipe paws and coat after walks to cut pollen contact",
      "Bathe with a gentle, vet-recommended shampoo",
      "Keep flea prevention current year-round",
      "Reduce indoor allergens (wash bedding, vacuum)",
    ],
    considerItems: ["omega3", "sardines", "duck", "probiotic"],
    whatToTrack: [
      "Itch score (0–10) daily",
      "Affected areas + photos",
      "Foods/treats and any new products",
      "Flare timing vs. season or environment",
    ],
    whenToAskVet: [
      "Swelling, hives, or breathing trouble → urgent",
      "Open or infected sores, or ear pain",
      "No improvement after diet and environment changes",
    ],
    notes: ["Skin allergies are managed, not cured — consistency over weeks matters more than any single product."],
  },
  {
    id: "kidney_hydration",
    title: "Kidney hydration support",
    system: "renal",
    pattern: "Dehydration / increased renal workload",
    redFlags: [
      "Straining or unable to urinate (especially a male cat) → emergency",
      "Not eating with vomiting",
      "Sudden weakness or collapse",
    ],
    foodFirst: [
      {
        title: "Boost water content of meals",
        detail: "Favor wet/canned food and add water or low-sodium broth to meals to increase hydration.",
        evidence: "B",
        source: "Increased dietary moisture supports urinary/renal health.",
      },
      {
        title: "Vet therapeutic kidney diet (if diagnosed)",
        detail:
          "If your vet has diagnosed kidney disease, a renal diet (controlled phosphorus and protein) is the most evidence-based dietary step.",
        evidence: "A",
        source: "Renal therapeutic diets in CKD.",
      },
      {
        title: "Limit high-sodium foods",
        detail: "Skip salty treats and table scraps.",
        evidence: "B",
        source: "Sodium guidance in renal/urinary support.",
      },
    ],
    lifestyle: [
      "Offer several fresh water stations; consider a pet fountain",
      "Track water intake and urination",
      "Reduce stress (especially for cats)",
    ],
    considerItems: ["white_fish", "bone_broth", "omega3", "cranberry"],
    whatToTrack: [
      "Water intake (mL/day if you can)",
      "Urination frequency/volume; any straining or blood",
      "Appetite and weight",
      "Energy",
    ],
    whenToAskVet: [
      "Straining or unable to urinate (especially a male cat) → emergency now",
      "Not eating, vomiting, or marked lethargy",
      "Blood in urine",
    ],
    notes: ["A male cat that can't urinate is a life-threatening emergency — go now, this plan does not apply."],
  },
  {
    id: "obesity_metabolic",
    title: "Obesity / metabolic support",
    system: "metabolic",
    pattern: "Weight / insulin dysregulation",
    redFlags: [
      "Sudden weakness, collapse, or labored breathing",
      "Excessive thirst/urination with weight loss (possible diabetes) → see a vet",
    ],
    foodFirst: [
      {
        title: "Measured portions to a calorie target",
        detail: "Ask your vet for a daily calorie target and measure every meal with a scale or measuring cup.",
        evidence: "A",
        source: "Calorie control is the foundation of weight loss.",
      },
      {
        title: "Satiety / weight-management diet",
        detail: "A vet weight-management diet helps pets feel full while losing fat.",
        evidence: "B",
        source: "Therapeutic weight-loss diets.",
      },
      {
        title: "Smarter treats",
        detail: "Swap high-fat treats for green beans, a little white fish, or kibble counted from the daily allowance.",
        evidence: "C",
        source: "Treat-calorie management.",
      },
    ],
    lifestyle: [
      "Increase activity gradually (leash walks for dogs; food puzzles and play for cats)",
      "Weigh-ins every 2 weeks; aim for slow, steady loss",
      "Feed in puzzle feeders to slow eating",
    ],
    considerItems: ["omega3", "glucosamine"],
    whatToTrack: [
      "Weight every 1–2 weeks",
      "Body condition score",
      "Daily food + treats (calories)",
      "Activity minutes",
    ],
    whenToAskVet: [
      "Before a weight-loss plan (to rule out metabolic disease)",
      "Excessive thirst/urination or rapid weight change",
      "Trouble breathing or exercise intolerance",
    ],
    notes: ["Aim for ~1–2% body weight loss per week — faster isn't safer, especially for cats (risk of fatty liver)."],
    catGuidance:
      "Cats must lose weight slowly and never be crash-dieted or fasted — rapid weight loss can cause hepatic lipidosis. Always do feline weight loss under veterinary supervision.",
  },
  {
    id: "arthritis",
    title: "Arthritis mobility support",
    system: "msk",
    pattern: "Joint wear / osteoarthritis (TCM: Wind-Damp / Blood stasis)",
    redFlags: [
      "Non-weight-bearing or dragging a limb",
      "Sudden severe pain or known trauma",
      "Wobbliness or loss of bladder/bowel control (possible spinal) → urgent",
    ],
    foodFirst: [
      {
        title: "Reach and keep a lean weight",
        detail: "Every extra pound stresses joints — weight control is the single most effective mobility step.",
        evidence: "A",
        source: "Weight management in canine osteoarthritis.",
      },
      {
        title: "Omega-3-rich diet or topper",
        detail: "EPA/DHA may support joint comfort.",
        evidence: "B",
        source: "Omega-3s in osteoarthritis.",
      },
    ],
    lifestyle: [
      "Gentle, regular low-impact exercise (leash walks, swimming)",
      "Ramps, non-slip rugs, and soft orthopedic bedding",
      "Keep nails trimmed; provide a warm, draft-free rest area",
      "Ask your vet about physical therapy or veterinary acupuncture",
    ],
    considerItems: ["glucosamine", "omega3", "sardines", "turmeric"],
    whatToTrack: [
      "Mobility (stairs, jumping, stiffness after rest)",
      "Activity tolerance",
      "Pain signs and weight",
      "Response to each change",
    ],
    whenToAskVet: [
      "Non-weight-bearing, dragging, or wobbliness → urgent",
      "Before pain medication or new supplements",
      "No improvement or clear worsening",
    ],
    notes: ["Never give human pain relievers (ibuprofen, acetaminophen) — many are toxic to pets, and acetaminophen is fatal to cats."],
  },
  {
    id: "anxiety",
    title: "Anxiety / stress support",
    system: "behavior",
    pattern: "Stress / anxiety response; gut-brain axis",
    redFlags: [
      "Self-injury, panic that won't settle, or aggression risk",
      "Not eating or drinking due to stress",
      "Sudden behavior change in a senior (possible pain/illness) → see a vet",
    ],
    foodFirst: [
      {
        title: "Consistent meals + calm routine",
        detail: "Predictable feeding times and a calm environment support a settled nervous system.",
        evidence: "C",
        source: "Routine and predictability in behavior management.",
      },
      {
        title: "Gut-brain support",
        detail: "A balanced gut (a probiotic-supported routine) may support mood via the gut-brain axis.",
        evidence: "C",
        source: "Emerging gut-brain-axis research.",
      },
    ],
    lifestyle: [
      "A predictable daily routine and a safe 'den' space",
      "Enrichment: sniff walks, food puzzles, and play",
      "Gradual desensitization / counter-conditioning for triggers",
      "Pheromone diffuser (dog: Adaptil; cat: Feliway)",
    ],
    considerItems: ["l_theanine", "chamomile", "probiotic"],
    whatToTrack: [
      "Trigger events and intensity",
      "What helps calm them",
      "Appetite and sleep",
      "Frequency of anxious episodes",
    ],
    whenToAskVet: [
      "Self-harm, panic, or aggression → see a behavior vet",
      "Sudden change (to rule out pain or illness)",
      "Before calming supplements if your pet is on other medications",
    ],
    notes: ["Behavior change takes weeks of consistency — pair any product with training and environment changes."],
  },
];

export const DEFAULT_CONDITION_FOR_SYSTEM: Record<string, string> = {
  gut: "chronic_diarrhea",
  skin: "itchy_skin",
  hepatic: "pancreatitis",
  renal: "kidney_hydration",
  metabolic: "obesity_metabolic",
  msk: "arthritis",
  behavior: "anxiety",
  immune: "itchy_skin",
};

export function conditionById(id: string): ConditionTemplate | undefined {
  return CONDITION_TEMPLATES.find((c) => c.id === id);
}

export function defaultConditionForSystem(systemId: string): ConditionTemplate | undefined {
  const id = DEFAULT_CONDITION_FOR_SYSTEM[systemId];
  return id ? conditionById(id) : undefined;
}
