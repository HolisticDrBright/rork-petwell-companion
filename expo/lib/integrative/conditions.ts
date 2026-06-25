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
  // ── Richer protocol fields (used by the Natural Support detail screen) ──
  whoFor?: string;
  whoNotFor?: string;
  environment?: string[];
  timeline?: string;
  evidence?: EvidenceGrade;
  /** Concise text an owner can hand to (or read with) their vet. */
  vetSummary?: string;
}

export const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: "pancreatitis",
    title: "Pancreatitis low-fat support",
    system: "hepatic",
    pattern: "Fat maldigestion / pancreatic inflammation",
    whoFor: "Dogs recovering from or prone to pancreatitis, once a vet confirms it's safe to eat.",
    whoNotFor: "Any pet with acute/severe signs (repeated vomiting, severe pain) — that needs a vet now, not a home plan. Cats need a feline-specific approach.",
    environment: ["Block garbage, counters, and table-scrap access", "Keep meal times calm and scheduled", "Tell everyone in the home: no fatty treats"],
    timeline: "Acute signs are a vet emergency. With care, many dogs improve over days to weeks; fat control continues for life to prevent relapse.",
    evidence: "B",
    vetSummary: "Owner pursuing low-fat dietary support for suspected/known pancreatitis. Tracking appetite, vomiting, stool, energy, and weight. Requesting guidance on therapeutic diet choice and when to recheck.",
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
    whoFor: "Pets with mild, non-emergency loose stool or a sensitive stomach.",
    whoNotFor: "Pets with blood in stool, repeated vomiting, lethargy, or a very young/old pet declining quickly — see a vet.",
    environment: ["Keep fresh water available", "Avoid sudden diet changes", "Stay current on parasite prevention"],
    timeline: "Many simple cases settle within 2–4 days of bland support; reintroduce the normal diet over 5–7 days.",
    evidence: "B",
    vetSummary: "Owner using a short bland gut-reset for mild GI upset. Tracking stool score/frequency, food, water, energy. Requesting fecal testing if recurrent and guidance on diet transition.",
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
    whoFor: "Itchy pets with chronic or seasonal skin signs, alongside a vet work-up.",
    whoNotFor: "Pets with facial swelling, hives, breathing trouble, or spreading/oozing sores — urgent vet care.",
    environment: ["Wipe paws and coat after walks", "Wash bedding weekly, fragrance-free", "Switch to stainless/ceramic bowls", "Reduce indoor allergens and fragrances"],
    timeline: "Skin work takes weeks — an elimination diet runs 8–12 weeks. Consistency matters more than any single product.",
    evidence: "A",
    vetSummary: "Owner supporting chronic itch with diet, omega-3s, and environment changes. Tracking itch score, affected areas/photos, foods, and flare timing. Requesting elimination-trial guidance and infection check.",
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
    whoFor: "Pets needing urinary/renal hydration support, or diagnosed early kidney change.",
    whoNotFor: "A male cat straining or unable to urinate — that is an emergency, not a hydration plan.",
    environment: ["Offer several fresh water stations", "Consider a pet water fountain", "Reduce stress, especially for cats"],
    timeline: "Hydration habits build over weeks; if kidney disease is diagnosed, support is lifelong and vet-guided.",
    evidence: "A",
    vetSummary: "Owner increasing dietary moisture and water access for renal/urinary support. Tracking intake, urination, appetite, weight. Requesting bloodwork/urinalysis and renal-diet guidance if indicated.",
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
    whoFor: "Overweight pets cleared by a vet to begin a measured weight-loss plan.",
    whoNotFor: "Pets with sudden weight change plus excess thirst/urination (possible diabetes) before a vet check; cats must never be crash-dieted.",
    environment: ["Feed in puzzle feeders to slow eating", "Increase activity gradually", "Weigh in every 2 weeks"],
    timeline: "Aim for slow, steady loss (~1–2% body weight/week for dogs; even slower for cats). Expect months, not weeks.",
    evidence: "A",
    vetSummary: "Owner on a measured-calorie weight-loss plan. Tracking weight, body condition, food/treat calories, activity. Requesting a target weight, calorie goal, and metabolic-disease screen.",
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
    whoFor: "Pets with stiffness or known arthritis, for long-term comfort support.",
    whoNotFor: "Pets that are non-weight-bearing, dragging a limb, or suddenly wobbly — urgent vet care.",
    environment: ["Add ramps and non-slip rugs", "Provide a warm, soft orthopedic bed", "Keep nails trimmed; avoid slippery floors"],
    timeline: "Weight and activity changes help within weeks; joint support builds over 4–8 weeks. This is ongoing maintenance.",
    evidence: "A",
    vetSummary: "Owner supporting mobility with weight control, omega-3s, and low-impact activity. Tracking stiffness, activity tolerance, weight. Requesting pain-management options and physical-therapy/acupuncture referral.",
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
    whoFor: "Pets with mild–moderate anxiety or stress-driven behavior.",
    whoNotFor: "Pets with self-injury, panic, aggression risk, or a sudden senior behavior change — see a behavior vet to rule out pain/illness.",
    environment: ["Create a safe 'den' space", "Keep a predictable daily routine", "Use a species-appropriate pheromone diffuser"],
    timeline: "Behavior change takes weeks of consistency; pair any support with training and environment work.",
    evidence: "C",
    vetSummary: "Owner addressing anxiety with routine, enrichment, and gut-brain support. Tracking triggers, calming strategies, appetite/sleep. Requesting behavior-plan guidance and medication review for interactions.",
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
  {
    id: "dental_inflammation",
    title: "Dental inflammation support",
    system: "dental",
    pattern: "Periodontal inflammation / oral discomfort",
    whoFor: "Pets with bad breath, tartar, or mild gum inflammation, for at-home support between vet dental care.",
    whoNotFor: "Pets that won't eat, have facial swelling, or a broken/bleeding tooth — see a vet promptly.",
    environment: ["Introduce daily tooth-brushing gradually", "Offer VOHC-accepted dental chews (counted in calories)", "Avoid hard items that can fracture teeth"],
    timeline: "Home care slows buildup over weeks, but established tartar/gingivitis needs a professional cleaning to resolve.",
    evidence: "B",
    vetSummary: "Owner supporting oral health with brushing and dental chews. Tracking breath, chewing, dropped food, appetite. Requesting a dental exam and grading of periodontal status.",
    redFlags: [
      "Not eating or clear mouth pain",
      "Facial swelling or a broken, bleeding tooth",
      "Lethargy with a foul mouth odor",
    ],
    foodFirst: [
      {
        title: "Dental-supportive diet or chews",
        detail: "A VOHC-accepted dental diet or chew can help reduce plaque/tartar as part of daily care (count the calories).",
        evidence: "B",
        source: "Veterinary Oral Health Council–accepted products.",
      },
      {
        title: "Keep meals soft if the mouth is sore",
        detail: "Soften kibble with warm water while gums are tender, and keep nutrition up.",
        evidence: "C",
        source: "Supportive oral-care practice.",
      },
    ],
    lifestyle: [
      "Brush teeth daily with pet-safe toothpaste (never human toothpaste)",
      "Use dental chews/toys appropriate to chewing style",
      "Schedule professional cleanings as your vet advises",
    ],
    considerItems: ["omega3", "probiotic"],
    whatToTrack: ["Breath and gum color", "Chewing comfort and dropped food", "Appetite", "Any loose or broken teeth"],
    whenToAskVet: [
      "Won't eat, drooling, or pawing at the mouth",
      "Facial swelling or a broken tooth",
      "Persistent bad breath despite home care (time for a dental exam)",
    ],
    notes: ["Home care helps prevention, but it can't reverse established periodontal disease — a professional cleaning is the foundation."],
  },
  {
    id: "ear_yeast",
    title: "Ear yeast / allergy watch",
    system: "skin",
    pattern: "Allergy-driven otitis / yeast overgrowth (TCM: Damp-Heat)",
    whoFor: "Pets with recurrent itchy, smelly ears tied to allergies, for support alongside a vet ear exam.",
    whoNotFor: "Pets with a painful, swollen, or discharging ear, head tilt, or balance loss — see a vet before putting anything in the ear.",
    environment: ["Keep ears dry after baths and swims", "Wash bedding fragrance-free", "Reduce environmental allergens"],
    timeline: "Ear flares can settle in 1–2 weeks once the cause is treated, but allergic ears recur without addressing the root allergy.",
    evidence: "B",
    vetSummary: "Owner managing recurrent allergic ear flares with drying, allergen reduction, and skin-barrier support. Tracking ear odor/itch, head-shaking, photos. Requesting otoscopic exam and cytology before any ear product.",
    redFlags: [
      "Painful, swollen, hot, or discharging ear",
      "Head tilt, circling, or loss of balance",
      "Sudden hearing loss or bleeding from the ear",
    ],
    foodFirst: [
      {
        title: "Address the underlying allergy",
        detail: "Recurrent yeast ears are usually a symptom of allergy — a vet-guided diet trial or allergy plan targets the root cause.",
        evidence: "A",
        source: "Dermatology consensus: otitis is often secondary to allergy.",
      },
      {
        title: "Skin-barrier support",
        detail: "Omega-3-rich foods may support the skin and ear-canal barrier over time.",
        evidence: "B",
        source: "Omega-3s in allergic skin disease.",
      },
    ],
    lifestyle: [
      "Dry ears gently after baths/swimming",
      "Have your vet check and clean ears before using any product",
      "Keep allergy management consistent year-round",
    ],
    considerItems: ["omega3", "probiotic", "duck"],
    whatToTrack: ["Ear odor, redness, and itch", "Head-shaking frequency", "Photos of each ear", "Flare timing vs season/diet"],
    whenToAskVet: [
      "Pain, swelling, or discharge → urgent",
      "Head tilt or balance problems",
      "Repeat flares (time to target the underlying allergy)",
    ],
    notes: ["Never put drops or cleaners in a painful ear without a vet exam — a ruptured eardrum changes what's safe to use."],
  },
  {
    id: "senior_maintenance",
    title: "Senior pet maintenance",
    system: "metabolic",
    pattern: "Healthy-aging support (multi-system)",
    whoFor: "Senior pets without an acute problem, to support comfortable, healthy aging.",
    whoNotFor: "Any senior with sudden changes (weight loss, increased thirst, new pain) — those need a vet work-up, not just maintenance.",
    environment: ["Add ramps, rugs, and soft bedding", "Keep food/water easy to reach", "Maintain a calm, predictable routine"],
    timeline: "Ongoing. Reassess every 6 months; seniors change faster, so trends matter.",
    evidence: "B",
    vetSummary: "Owner on a senior wellness routine (weight, mobility, hydration, dental, cognition). Tracking weight, appetite, activity, water. Requesting twice-yearly exams and baseline senior bloodwork.",
    redFlags: [
      "Unplanned weight loss or appetite drop",
      "Increased thirst/urination",
      "New or worsening pain, confusion, or collapse",
    ],
    foodFirst: [
      {
        title: "Right-sized senior nutrition",
        detail: "Feed a balanced senior diet adjusted to hold an ideal body condition; keep quality protein up unless your vet advises otherwise.",
        evidence: "B",
        source: "Senior nutrition guidance.",
      },
      {
        title: "Hydration and joint support",
        detail: "Favor moisture (especially for cats) and omega-3-rich foods for joints and cognition.",
        evidence: "B",
        source: "Omega-3s and moisture in senior care.",
      },
    ],
    lifestyle: [
      "Twice-yearly vet checks and senior bloodwork",
      "Gentle, regular low-impact activity",
      "Dental care and weight monitoring",
    ],
    considerItems: ["omega3", "glucosamine", "probiotic"],
    whatToTrack: ["Weight and body condition", "Appetite and water intake", "Mobility and energy", "Any new lumps or behavior changes"],
    whenToAskVet: [
      "Any sudden change in weight, thirst, appetite, or behavior",
      "New pain or mobility loss",
      "To set a senior screening schedule",
    ],
    notes: ["The biggest senior win is catching change early — consistent logging turns 'seemed fine' into a clear trend for your vet."],
    catGuidance: "Senior cats hide illness well: weigh regularly, prioritize hydration, and book twice-yearly exams to catch kidney/thyroid changes early.",
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
  dental: "dental_inflammation",
};

/** Stable display order for the Natural Support protocol library. */
export const PROTOCOL_ORDER: string[] = [
  "chronic_diarrhea",
  "itchy_skin",
  "pancreatitis",
  "kidney_hydration",
  "arthritis",
  "obesity_metabolic",
  "dental_inflammation",
  "anxiety",
  "ear_yeast",
  "senior_maintenance",
];

export function conditionById(id: string): ConditionTemplate | undefined {
  return CONDITION_TEMPLATES.find((c) => c.id === id);
}

export function defaultConditionForSystem(systemId: string): ConditionTemplate | undefined {
  const id = DEFAULT_CONDITION_FOR_SYSTEM[systemId];
  return id ? conditionById(id) : undefined;
}
