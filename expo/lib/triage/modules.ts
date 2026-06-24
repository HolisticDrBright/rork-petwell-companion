import type { ConcernModule, Question } from "./types";

/**
 * Concern modules. Each module's questions are ordered red-flag → core →
 * refine. The engine asks them adaptively (skipping any whose `when` fails) and
 * red-flag answers can only RAISE urgency.
 *
 * Copy may use {name}; the UI/engine substitutes the pet's name.
 */

// Universal emergency screener, asked first for every concern. A "yes" here is
// an immediate emergency and short-circuits the interview.
const screener: Question = {
  id: "screen",
  text: "Quick safety check first — is {name} showing any of these right now?",
  why: "A few signs mean 'go now' no matter the cause — breathing trouble, pale or blue gums, collapse, or a seizure. I always check these first so we never miss an emergency.",
  kind: "redflag",
  shortCircuit: true,
  options: [
    {
      id: "breathing",
      label: "Struggling to breathe, or pale / blue gums",
      redFlag: "breathing",
      urgencyFloor: "red",
    },
    {
      id: "collapse",
      label: "Collapsed, seizuring, or won't wake up",
      redFlag: "collapse",
      urgencyFloor: "red",
    },
    {
      id: "none",
      label: "None of these right now",
      support: "No breathing trouble, collapse, or pale-gum signs reported",
    },
  ],
};

const DIARRHEA: ConcernModule = {
  id: "diarrhea",
  label: "Digestive / diarrhea",
  icon: "droplet",
  baseUrgency: "green",
  changesUrgency: [
    "Blood in stool or vomit",
    "Repeated vomiting",
    "Weakness, collapse, or pale gums",
    "Not able to keep water down",
    "A puppy or kitten under 6 months",
    "Possible toxin exposure",
  ],
  homeCare: [
    "Offer small amounts of water often and check that {name} keeps it down.",
    "Feed a bland meal (plain rice with a simple cooked protein) in small portions.",
    "Pause new treats or foods and note it in the timeline.",
    "Save a stool photo each time so you can track improvement.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.conditions.some((c) => /food|sensitiv/i.test(c)) || ctx.pet.allergies.length > 0) {
      out.diet = 1;
    }
    return out;
  },
  causes: [
    { id: "diet", name: "Diet change or treat intolerance", note: "Common and usually settles with simple care." },
    { id: "gi", name: "Mild gastrointestinal upset", note: "Often self-limiting over 24–48 hours." },
    { id: "parasite", name: "Parasites", note: "More likely with park, boarding, or puppy exposure." },
    { id: "infection", name: "Infection", note: "Viral or bacterial; consider recent exposure." },
    { id: "serious", name: "Pancreatitis, toxin, or obstruction", note: "Considered only if red flags appear." },
  ],
  questions: [
    screener,
    {
      id: "blood",
      text: "Is there blood in the stool?",
      why: "Blood can signal a more serious GI problem, so it raises urgency right away.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "No blood", support: "No blood reported", causeWeights: { diet: 1, gi: 1 } },
        { id: "streaks", label: "A few red streaks", redFlag: "bloodStoolVomit", points: 2 },
        { id: "lots", label: "Lots of blood or very dark/tarry", redFlag: "bloodStoolVomit", urgencyFloor: "orange", points: 3 },
      ],
    },
    {
      id: "vomit",
      text: "Is there vomiting too?",
      why: "Diarrhea plus repeated vomiting raises dehydration risk and changes what we worry about.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "No vomiting", support: "No vomiting alongside it" },
        { id: "once", label: "Once or twice", points: 1 },
        { id: "repeat", label: "Repeated vomiting", redFlag: "repeatedVomiting", points: 2 },
      ],
    },
    {
      id: "energy",
      text: "How is {name}'s energy?",
      why: "Weakness is one of the clearest signs that something needs faster care.",
      kind: "redflag",
      options: [
        { id: "normal", label: "Normal and playful", support: "Energy is normal" },
        { id: "quiet", label: "A little quiet", points: 1 },
        { id: "weak", label: "Weak or very tired", urgencyFloor: "orange", points: 2, causeWeights: { serious: 1 } },
      ],
    },
    {
      id: "water",
      text: "Are they drinking and keeping water down?",
      why: "Staying hydrated is the single most important thing during diarrhea at home.",
      kind: "core",
      options: [
        { id: "yes", label: "Yes, drinking normally", support: "Hydrating normally" },
        { id: "little", label: "Drinking only a little", points: 1 },
        { id: "no", label: "Not drinking / can't keep it down", urgencyFloor: "orange", points: 2 },
      ],
    },
    {
      id: "episodes",
      text: "How many episodes today?",
      why: "Frequency helps gauge fluid loss and how fast things are moving.",
      kind: "core",
      options: [
        { id: "12", label: "1–2 times", causeWeights: { gi: 1 } },
        { id: "35", label: "3–5 times", points: 1 },
        { id: "6", label: "6 or more", urgencyFloor: "amber", points: 2 },
      ],
    },
    {
      id: "exposure",
      text: "Anything new — food, treats, trash, plants, or medication?",
      why: "Recent diet or toxin exposure is the most common cause — and the most fixable.",
      kind: "core",
      allowUnsure: true,
      options: [
        { id: "treats", label: "New treats or food", causeWeights: { diet: 3 }, support: "Started after a diet change" },
        { id: "toxin", label: "Trash, chemicals, toxic plant, or human meds", redFlag: "toxin", causeWeights: { serious: 2 } },
        { id: "none", label: "Nothing new", causeWeights: { gi: 1 } },
      ],
    },
    {
      id: "social",
      text: "Recent boarding, dog park, travel, or known parasite exposure?",
      why: "Group settings and travel raise the chance of infectious or parasitic causes.",
      kind: "refine",
      allowUnsure: true,
      when: (ctx) => !ctx.picked.exposure || ctx.picked.exposure.id !== "toxin",
      options: [
        { id: "yes", label: "Yes, recently", causeWeights: { parasite: 2, infection: 2 } },
        { id: "no", label: "No", causeWeights: { diet: 1 } },
      ],
    },
  ],
};

const VOMITING: ConcernModule = {
  id: "vomiting",
  label: "Vomiting",
  icon: "wave",
  baseUrgency: "green",
  changesUrgency: [
    "Repeated or non-stop vomiting",
    "Blood or coffee-ground material",
    "Can't keep any water down",
    "A painful or bloated belly",
    "A possible swallowed object or toxin",
    "A very young, senior, or unwell pet",
  ],
  homeCare: [
    "Rest the stomach: remove food for a few hours, then offer small sips of water.",
    "If vomiting stops, reintroduce small bland meals.",
    "Remove access to plants, trash, and small objects {name} could swallow.",
    "Log each episode and what came up.",
  ],
  causes: [
    { id: "gi", name: "Mild gastritis / GI upset", note: "Common; often settles with stomach rest." },
    { id: "diet", name: "Dietary indiscretion or new food", note: "Scavenging or a recent diet change." },
    { id: "obstruction", name: "Foreign body or obstruction", note: "Considered if an object was swallowed or vomiting won't stop." },
    { id: "serious", name: "Pancreatitis, toxin, or systemic illness", note: "Considered with pain, repeated vomiting, or red flags." },
    { id: "infection", name: "Infection", note: "Viral or bacterial gastroenteritis." },
  ],
  questions: [
    screener,
    {
      id: "blood",
      text: "Is there blood in the vomit (fresh red or coffee-ground)?",
      why: "Blood or coffee-ground material points to bleeding in the stomach and raises urgency.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "No blood", support: "No blood in the vomit" },
        { id: "some", label: "A little blood", redFlag: "bloodStoolVomit", points: 2 },
        { id: "lots", label: "Lots, or coffee-ground look", redFlag: "bloodStoolVomit", urgencyFloor: "orange", points: 3 },
      ],
    },
    {
      id: "count",
      text: "How many times has {name} vomited?",
      why: "Repeated vomiting drives dehydration and changes the plan.",
      kind: "redflag",
      options: [
        { id: "once", label: "Once", support: "A single episode so far", causeWeights: { gi: 1 } },
        { id: "23", label: "2–3 times", points: 1 },
        { id: "repeat", label: "Repeatedly / can't stop", redFlag: "repeatedVomiting", urgencyFloor: "orange", points: 2 },
      ],
    },
    {
      id: "water",
      text: "Can they keep water down?",
      why: "Holding water down is the key to managing vomiting safely at home.",
      kind: "redflag",
      options: [
        { id: "yes", label: "Yes", support: "Holding water down" },
        { id: "sips", label: "Small sips only", points: 1 },
        { id: "no", label: "Nothing stays down", urgencyFloor: "orange", points: 2 },
      ],
    },
    {
      id: "belly",
      text: "How does the belly and posture look?",
      why: "A painful, hunched, or bloated belly can mean a more serious problem.",
      kind: "core",
      options: [
        { id: "normal", label: "Normal and comfortable", support: "Comfortable belly and posture" },
        { id: "quiet", label: "A bit quiet", points: 1 },
        { id: "pain", label: "Painful, hunched, or bloated", urgencyFloor: "orange", points: 2, causeWeights: { serious: 2, obstruction: 1 } },
      ],
    },
    {
      id: "object",
      text: "Any chance they ate a toy, bone, string, or something toxic?",
      why: "A swallowed object or toxin can be an emergency even if they seem okay now.",
      kind: "core",
      allowUnsure: true,
      options: [
        { id: "no", label: "No", causeWeights: { gi: 1 } },
        { id: "maybe", label: "Maybe / yes", redFlag: "toxin", causeWeights: { obstruction: 3 } },
      ],
    },
    {
      id: "diet",
      text: "Any new food, or scavenging in the trash/yard?",
      why: "A recent diet change or scavenging is a very common, fixable trigger.",
      kind: "core",
      options: [
        { id: "food", label: "New food or treats", causeWeights: { diet: 2 }, support: "Started after a diet change" },
        { id: "scav", label: "Got into trash / scavenged", causeWeights: { gi: 2, diet: 1 } },
        { id: "none", label: "Nothing new", causeWeights: { gi: 1 } },
      ],
    },
  ],
};

const SKIN: ConcernModule = {
  id: "skin",
  label: "Skin / itching",
  icon: "sparkle",
  baseUrgency: "green",
  changesUrgency: [
    "Facial swelling, hives, or breathing trouble",
    "Spreading or oozing sores",
    "Strong odor or greasy, painful skin",
    "Ear pain or constant head shaking",
    "Not eating or acting unwell",
  ],
  homeCare: [
    "Check the skin and paws in good light; note redness, odor, and any sores.",
    "Pause any new food, shampoo, or bedding introduced recently.",
    "Wipe {name}'s paws after walks to cut down pollen contact.",
    "Save a clear photo to the timeline to track the area.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.allergies.some((a) => /chicken|food/i.test(a)) || ctx.pet.conditions.some((c) => /food/i.test(c))) out.food = 2;
    if (ctx.pet.conditions.some((c) => /atop|skin|derm/i.test(c))) out.allergy = 2;
    return out;
  },
  causes: [
    { id: "allergy", name: "Environmental or seasonal allergy", note: "Paw licking + seasonal pattern fits allergy." },
    { id: "food", name: "Food sensitivity", note: "Worth a diet review, especially with a known trigger." },
    { id: "flea", name: "Flea allergy or irritation", note: "Check for flea dirt even with prevention." },
    { id: "hotspot", name: "Hot spot / localized irritation", note: "A focused, moist, angry patch." },
    { id: "yeast", name: "Yeast or bacterial skin infection", note: "Odor or greasy skin points here." },
  ],
  questions: [
    screener,
    {
      id: "swelling",
      text: "Any facial swelling or hives (e.g. after a bite, sting, or new food)?",
      why: "Sudden swelling or hives can be an allergic reaction that needs prompt care.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "No swelling or hives", support: "No facial swelling or hives" },
        { id: "yes", label: "Yes — puffy face or hives", urgencyFloor: "orange", points: 3, causeWeights: { allergy: 1 } },
      ],
    },
    {
      id: "sore",
      text: "Any open, spreading, or oozing sore?",
      why: "Open or spreading sores can get infected and may need treatment sooner.",
      kind: "redflag",
      options: [
        { id: "no", label: "No sores", support: "No open or spreading sores" },
        { id: "spot", label: "One small spot", points: 1, causeWeights: { hotspot: 2 } },
        { id: "big", label: "Large, spreading, or very painful", urgencyFloor: "amber", points: 1, causeWeights: { yeast: 2, hotspot: 1 } },
      ],
    },
    {
      id: "where",
      text: "Where is the itching mostly?",
      why: "Location points us toward allergy vs. a localized or infectious problem.",
      kind: "core",
      options: [
        { id: "paws", label: "Paws / licking feet", causeWeights: { allergy: 2 }, support: "Paw-focused licking — a classic allergy pattern" },
        { id: "belly", label: "Belly or armpits", causeWeights: { allergy: 2 } },
        { id: "all", label: "All over", causeWeights: { allergy: 1, flea: 1 } },
        { id: "spot", label: "One focused spot", causeWeights: { hotspot: 2 } },
      ],
    },
    {
      id: "signs",
      text: "Any redness, hair loss, odor, scabs, or fleas?",
      why: "These signs separate a simple itch from an infection or flea problem.",
      kind: "core",
      allowUnsure: true,
      options: [
        { id: "red", label: "Redness only", causeWeights: { allergy: 1 } },
        { id: "odor", label: "Odor or greasy skin", points: 1, causeWeights: { yeast: 3 }, support: "Odor/greasy skin points toward a skin infection" },
        { id: "fleas", label: "Fleas or flea dirt", causeWeights: { flea: 3 } },
        { id: "none", label: "None of these" },
      ],
    },
    {
      id: "new",
      text: "Anything new — food, treats, shampoo, bedding, or more time on grass?",
      why: "New contact items and foods are frequent triggers we can remove.",
      kind: "core",
      allowUnsure: true,
      options: [
        { id: "food", label: "New food or treats", causeWeights: { food: 3 }, support: "New food/treats — a possible trigger" },
        { id: "product", label: "New shampoo or bedding", causeWeights: { allergy: 1, hotspot: 1 } },
        { id: "grass", label: "More time on grass / outdoors", causeWeights: { allergy: 2 } },
        { id: "none", label: "Nothing new" },
      ],
    },
    {
      id: "ears",
      text: "Any ear smell or head shaking?",
      why: "Ears and skin allergies often flare together — it changes the plan.",
      kind: "refine",
      allowUnsure: true,
      options: [
        { id: "yes", label: "Yes, ears involved", points: 1, causeWeights: { yeast: 2, allergy: 1 } },
        { id: "no", label: "Ears seem fine", support: "Ears seem fine" },
      ],
    },
  ],
};

const URINARY: ConcernModule = {
  id: "urinary",
  label: "Urinary issue",
  icon: "toilet",
  baseUrgency: "amber",
  changesUrgency: [
    "Straining with little or no urine (especially a male cat)",
    "Crying out, vomiting, or hiding",
    "A hard, painful belly",
    "Blood clots or no urine for many hours",
    "Lethargy or not eating",
  ],
  homeCare: [
    "Keep fresh water available and note how much {name} drinks.",
    "Keep the litter box spotless and reduce household stress.",
    "Track each trip to urinate and roughly how much comes out.",
    "Save a photo if you see blood or unusual color.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.species === "cat" && ctx.pet.sex === "male") out.obstruction = 1;
    if (ctx.pet.conditions.some((c) => /kidney|renal/i.test(c))) out.kidney = 2;
    return out;
  },
  causes: [
    { id: "uti", name: "Urinary tract infection or inflammation", note: "Frequent, painful, or bloody urination." },
    { id: "fic", name: "Stress cystitis (FIC)", note: "Very common in cats, often stress-linked." },
    { id: "stones", name: "Crystals or bladder stones", note: "Can cause blood and straining." },
    { id: "obstruction", name: "Urethral blockage", note: "An emergency, especially in male cats — can't pass urine." },
    { id: "kidney", name: "Kidney involvement", note: "Consider with drinking changes or known kidney history." },
  ],
  questions: [
    screener,
    {
      id: "stream",
      text: "Is {name} able to pass urine normally?",
      why: "A pet — especially a male cat — that strains but can't pass urine is a true emergency.",
      kind: "redflag",
      options: [
        { id: "normal", label: "Yes, normal amounts", support: "Producing urine normally" },
        { id: "straining", label: "Straining, only small amounts", redFlag: "cantUrinate", urgencyFloor: "orange", points: 2, causeWeights: { obstruction: 2, stones: 1 } },
        { id: "none", label: "Nothing comes out / crying in the box", redFlag: "cantUrinate", urgencyFloor: "orange", points: 3, causeWeights: { obstruction: 3 } },
      ],
    },
    {
      id: "blood",
      text: "Any blood in the urine?",
      why: "Blood points toward infection, crystals, or stones.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "No visible blood", support: "No visible blood in urine" },
        { id: "tinge", label: "Pink or red tinge", points: 1, causeWeights: { uti: 2, fic: 1, stones: 1 } },
        { id: "clots", label: "Lots of blood or clots", urgencyFloor: "orange", points: 2, causeWeights: { stones: 2 } },
      ],
    },
    {
      id: "systemic",
      text: "Any vomiting, hiding, or very low energy?",
      why: "Those signs alongside a urinary problem can mean it's becoming serious.",
      kind: "redflag",
      options: [
        { id: "no", label: "No, otherwise normal", support: "Eating and acting normally otherwise" },
        { id: "yes", label: "Yes — off, hiding, or vomiting", urgencyFloor: "orange", points: 2, causeWeights: { obstruction: 1, kidney: 1 } },
      ],
    },
    {
      id: "pattern",
      text: "What does the urinating look like?",
      why: "The pattern helps separate infection, inflammation, and stones.",
      kind: "core",
      options: [
        { id: "freq", label: "More often, small amounts", causeWeights: { uti: 2, fic: 2 } },
        { id: "accidents", label: "Accidents in the house", causeWeights: { uti: 1, fic: 1 } },
        { id: "licking", label: "Licking the area a lot", causeWeights: { fic: 1, uti: 1 } },
      ],
    },
    {
      id: "stress",
      text: "Any recent stress — a move, new pet, or litter change?",
      why: "Stress is a leading trigger for feline urinary inflammation (FIC).",
      kind: "refine",
      when: (ctx) => ctx.pet.species === "cat",
      allowUnsure: true,
      options: [
        { id: "yes", label: "Yes, something changed", causeWeights: { fic: 3 }, support: "Recent stress can trigger feline cystitis" },
        { id: "no", label: "No real changes" },
      ],
    },
  ],
};

const EYE: ConcernModule = {
  id: "eye",
  label: "Eye redness or discharge",
  icon: "eye",
  baseUrgency: "amber",
  changesUrgency: [
    "A painful, cloudy, or bulging eye",
    "Holding the eye shut or pawing at it",
    "Sudden vision changes",
    "Known chemical or trauma to the eye",
    "Thick discharge that keeps returning",
  ],
  homeCare: [
    "Stop {name} from rubbing or pawing the eye (a cone helps).",
    "Gently wipe away discharge with a clean, damp cloth.",
    "Don't use leftover or human eye drops unless your vet okays it.",
    "Photograph the eye in good light to track changes.",
  ],
  causes: [
    { id: "conjunctivitis", name: "Conjunctivitis / irritation", note: "Redness with mild discharge." },
    { id: "allergy", name: "Allergic or environmental irritation", note: "Often both eyes, clear and watery." },
    { id: "ulcer", name: "Corneal scratch or ulcer", note: "Painful, squinting — needs a stain test." },
    { id: "infection", name: "Eye infection", note: "Thick yellow/green discharge." },
    { id: "serious", name: "Glaucoma or other urgent eye problem", note: "Cloudy, bulging, or sudden vision loss." },
  ],
  questions: [
    screener,
    {
      id: "pain",
      text: "How painful or changed does the eye look?",
      why: "A very painful, cloudy, or bulging eye can threaten vision and needs prompt care.",
      kind: "redflag",
      options: [
        { id: "mild", label: "Mildly red or watery", support: "Mild redness, eye open and comfortable" },
        { id: "shut", label: "Held shut and painful", urgencyFloor: "orange", points: 2, causeWeights: { ulcer: 2 } },
        { id: "cloudy", label: "Cloudy, bulging, or suddenly different", urgencyFloor: "orange", points: 3, causeWeights: { serious: 3 } },
      ],
    },
    {
      id: "injury",
      text: "Any recent scratch, chemical, or foreign object?",
      why: "Trauma or chemicals can scratch the cornea — an urgent, treatable problem.",
      kind: "redflag",
      allowUnsure: true,
      options: [
        { id: "no", label: "Not that I know of", causeWeights: { conjunctivitis: 1 } },
        { id: "yes", label: "Yes — scratch, chemical, or object", urgencyFloor: "orange", points: 2, causeWeights: { ulcer: 3 } },
      ],
    },
    {
      id: "discharge",
      text: "What does the discharge look like?",
      why: "Discharge type helps separate allergy, irritation, and infection.",
      kind: "core",
      options: [
        { id: "clear", label: "Clear and watery", causeWeights: { allergy: 2, conjunctivitis: 1 }, support: "Clear, watery discharge" },
        { id: "thick", label: "Thick yellow or green", points: 1, causeWeights: { infection: 3 } },
        { id: "none", label: "Little or none" },
      ],
    },
    {
      id: "both",
      text: "One eye or both, and any squinting?",
      why: "One squinty eye suggests a local injury; both often means allergy or infection.",
      kind: "core",
      options: [
        { id: "one", label: "One eye, squinting/pawing", urgencyFloor: "amber", points: 1, causeWeights: { ulcer: 2, conjunctivitis: 1 } },
        { id: "both", label: "Both eyes", causeWeights: { allergy: 2, infection: 1 } },
        { id: "mild", label: "One eye, not bothered much", causeWeights: { conjunctivitis: 2 } },
      ],
    },
    {
      id: "vision",
      text: "Any sign of vision trouble — bumping into things?",
      why: "Sudden vision change is urgent and points to a deeper eye problem.",
      kind: "refine",
      allowUnsure: true,
      options: [
        { id: "no", label: "Vision seems normal", support: "Vision seems normal" },
        { id: "yes", label: "Yes, seems to be struggling", urgencyFloor: "orange", points: 2, causeWeights: { serious: 2 } },
      ],
    },
  ],
};

const EAR: ConcernModule = {
  id: "ear",
  label: "Ear smell or discharge",
  icon: "ear",
  baseUrgency: "amber",
  changesUrgency: [
    "A head tilt, circling, or loss of balance",
    "An ear that's painful or swollen shut",
    "Sudden hearing changes",
    "Spreading redness or facial swelling",
  ],
  homeCare: [
    "Don't insert cotton swabs — just wipe the outer ear if needed.",
    "Note odor, the color of any discharge, and which ear is affected.",
    "Keep {name}'s ears dry after baths or swimming.",
    "Book a vet to look inside and clean safely if it persists.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.conditions.length || ctx.pet.allergies.length) out.allergy = 2;
    return out;
  },
  causes: [
    { id: "infection", name: "Ear infection (yeast or bacterial)", note: "Odor, discharge, and head shaking." },
    { id: "allergy", name: "Allergy-related ear inflammation", note: "Often both ears; common with skin allergies." },
    { id: "foreign", name: "Foreign material (e.g. grass awn)", note: "Sudden, usually one ear." },
    { id: "mites", name: "Ear mites", note: "Dark, crumbly debris; more common in young pets." },
    { id: "deep", name: "Deep or middle-ear problem", note: "Considered with pain, tilt, or balance loss." },
  ],
  questions: [
    screener,
    {
      id: "balance",
      text: "Any head tilt, circling, balance loss, or an ear too painful to touch?",
      why: "Those signs can mean a deeper or middle-ear problem that needs prompt care.",
      kind: "redflag",
      options: [
        { id: "no", label: "No, just the ear bothering them", support: "No balance loss or severe ear pain" },
        { id: "yes", label: "Yes — tilt, wobble, or severe pain", urgencyFloor: "orange", points: 2, causeWeights: { deep: 3 } },
      ],
    },
    {
      id: "signs",
      text: "What are you noticing about the ear?",
      why: "Odor and discharge usually mean infection; redness alone can be early.",
      kind: "core",
      options: [
        { id: "shake", label: "Head shaking / scratching", causeWeights: { infection: 2, allergy: 1 } },
        { id: "odor", label: "Odor or discharge", points: 1, causeWeights: { infection: 3 }, support: "Odor/discharge suggests an ear infection" },
        { id: "debris", label: "Dark, crumbly debris", causeWeights: { mites: 3 } },
        { id: "red", label: "Redness or swelling", causeWeights: { infection: 2, allergy: 1 } },
      ],
    },
    {
      id: "sides",
      text: "One ear or both?",
      why: "One ear suggests a local cause; both often means an allergy driver.",
      kind: "core",
      options: [
        { id: "one", label: "Just one", causeWeights: { infection: 1, foreign: 2 } },
        { id: "both", label: "Both ears", causeWeights: { allergy: 2 } },
      ],
    },
    {
      id: "history",
      text: "Any history of allergies/skin issues, or recent swimming/baths?",
      why: "Both are common setups for ear infections, and it guides prevention.",
      kind: "refine",
      allowUnsure: true,
      options: [
        { id: "allergy", label: "Allergies or skin issues", causeWeights: { allergy: 2 } },
        { id: "water", label: "Recent water / bath", causeWeights: { infection: 2 } },
        { id: "neither", label: "Neither" },
      ],
    },
  ],
};

const TEETH: ConcernModule = {
  id: "teeth",
  label: "Teeth / gums",
  icon: "tooth",
  baseUrgency: "green",
  changesUrgency: [
    "Pale or blue gums",
    "Facial swelling or a jaw lump",
    "Not eating or dropping food",
    "Heavy bleeding from the mouth",
  ],
  homeCare: [
    "Offer softer food if chewing looks painful.",
    "Lift the lip in good light and note tartar, redness, or broken teeth.",
    "Avoid hard chews that could crack a tooth further.",
    "Book a dental check — most mouth problems need a professional look.",
  ],
  causes: [
    { id: "dental", name: "Dental disease / tartar", note: "Bad breath and buildup over time." },
    { id: "gingivitis", name: "Gingivitis / gum inflammation", note: "Red, swollen gum margins." },
    { id: "fracture", name: "Broken or loose tooth", note: "Can be painful and get infected." },
    { id: "abscess", name: "Tooth-root abscess", note: "Considered with facial swelling." },
    { id: "pain", name: "Oral pain affecting eating", note: "Eating on one side or dropping food." },
  ],
  questions: [
    screener,
    {
      id: "gums",
      text: "What color are the gums?",
      why: "Pale, white, or blue gums are a whole-body emergency, not just a mouth issue.",
      kind: "redflag",
      options: [
        { id: "pink", label: "Healthy pink", support: "Gums are a healthy pink" },
        { id: "pale", label: "Pale, white, or blue", redFlag: "paleGums", urgencyFloor: "red" },
        { id: "redgum", label: "Bright red or bleeding a lot", urgencyFloor: "amber", points: 1, causeWeights: { gingivitis: 2 } },
      ],
    },
    {
      id: "signs",
      text: "What are you seeing in the mouth?",
      why: "These signs separate routine tartar from a painful or broken tooth.",
      kind: "core",
      options: [
        { id: "breath", label: "Bad breath / tartar", causeWeights: { dental: 3 }, support: "Tartar and bad breath point to dental disease" },
        { id: "gum", label: "Red, swollen gums", causeWeights: { gingivitis: 2 } },
        { id: "broken", label: "Broken or loose tooth", urgencyFloor: "amber", points: 1, causeWeights: { fracture: 3 } },
        { id: "drool", label: "Drooling or dropping food", points: 1, causeWeights: { pain: 2 } },
      ],
    },
    {
      id: "eating",
      text: "Is {name} eating normally?",
      why: "Trouble eating tells us how much the mouth is bothering them.",
      kind: "core",
      options: [
        { id: "yes", label: "Eating well", support: "Still eating well" },
        { id: "slow", label: "Slower / chewing on one side", points: 1, causeWeights: { pain: 2 } },
        { id: "no", label: "Not eating", urgencyFloor: "orange", points: 2 },
      ],
    },
    {
      id: "swelling",
      text: "Any facial swelling or a lump near the jaw?",
      why: "Swelling under an eye or along the jaw can mean an infected tooth root.",
      kind: "refine",
      allowUnsure: true,
      options: [
        { id: "no", label: "No swelling", support: "No facial swelling" },
        { id: "yes", label: "Yes, there's a swelling", urgencyFloor: "orange", points: 2, causeWeights: { abscess: 3 } },
      ],
    },
  ],
};

const MOBILITY: ConcernModule = {
  id: "mobility",
  label: "Limping or stiffness",
  icon: "footprint",
  baseUrgency: "green",
  changesUrgency: [
    "A dangling, clearly broken, or unusable limb",
    "Dragging legs, wobbliness, or back/neck pain",
    "Known trauma (car, fall)",
    "Crying out in pain or a hot, swollen joint",
  ],
  homeCare: [
    "Rest {name} and limit jumping, stairs, and rough play for now.",
    "Note which leg and whether it's worse after rest or activity.",
    "Use ramps and soft bedding to ease the joints.",
    "Don't give human pain meds — many are toxic to pets.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.ageYears >= 8) out.arthritis = 2;
    return out;
  },
  causes: [
    { id: "softTissue", name: "Soft-tissue strain or sprain", note: "Common; often improves with rest." },
    { id: "injury", name: "Acute injury", note: "Sudden onset, usually one leg." },
    { id: "arthritis", name: "Arthritis / joint wear", note: "Gradual stiffness, worse after rest." },
    { id: "fracture", name: "Fracture or serious injury", note: "Considered if the leg can't bear weight." },
    { id: "spinal", name: "Back or neck (spinal) problem", note: "Wobbliness, dragging, or pain along the spine." },
  ],
  questions: [
    screener,
    {
      id: "trauma",
      text: "Any recent trauma — hit by a car, a fall, or an obvious injury?",
      why: "Known trauma raises the chance of a fracture or internal injury.",
      kind: "redflag",
      options: [
        { id: "no", label: "No known injury", support: "No known injury" },
        { id: "yes", label: "Yes, something happened", redFlag: "trauma", urgencyFloor: "orange", points: 2, causeWeights: { injury: 2, fracture: 1 } },
      ],
    },
    {
      id: "weight",
      text: "Can they put weight on the leg?",
      why: "A leg that can't bear any weight or dangles needs prompt attention.",
      kind: "redflag",
      options: [
        { id: "yes", label: "Yes, bearing weight", support: "Still bearing weight on it" },
        { id: "favor", label: "Favoring it / light touches", points: 1, causeWeights: { softTissue: 2 } },
        { id: "no", label: "Won't use it / it dangles", urgencyFloor: "orange", points: 2, causeWeights: { fracture: 3 } },
      ],
    },
    {
      id: "onset",
      text: "How did it start?",
      why: "Sudden vs. gradual onset points to injury vs. arthritis.",
      kind: "core",
      options: [
        { id: "sudden", label: "Suddenly", causeWeights: { injury: 2 } },
        { id: "gradual", label: "Gradual / stiff over time", causeWeights: { arthritis: 3 }, support: "Gradual stiffness fits arthritis" },
        { id: "comes", label: "Comes and goes", causeWeights: { softTissue: 2 } },
      ],
    },
    {
      id: "where",
      text: "Where does the problem seem to be?",
      why: "Back or neck involvement is more serious than a single sore leg.",
      kind: "core",
      options: [
        { id: "leg", label: "One leg", causeWeights: { injury: 1, softTissue: 1 } },
        { id: "stiff", label: "Stiff in several joints / after rest", causeWeights: { arthritis: 2 } },
        { id: "spine", label: "Back/neck pain or wobbliness", urgencyFloor: "orange", points: 2, causeWeights: { spinal: 3 } },
      ],
    },
  ],
};

const APPETITE: ConcernModule = {
  id: "appetite",
  label: "Not eating",
  icon: "bone",
  baseUrgency: "amber",
  changesUrgency: [
    "A cat not eating for more than 24–48 hours",
    "Vomiting, diarrhea, or a painful belly",
    "Not drinking, or weakness/hiding",
    "Rapid weight loss",
  ],
  homeCare: [
    "Offer a small amount of a favorite or slightly warmed food.",
    "Make sure fresh water is easy to reach and track intake.",
    "Reduce stress and keep meals in a quiet spot.",
    "Note exactly how long since {name}'s last real meal.",
  ],
  causes: [
    { id: "pickiness", name: "Diet change or pickiness", note: "Bright, otherwise normal pet." },
    { id: "gi", name: "Nausea / GI upset", note: "Often with drooling, lip-licking, or vomiting." },
    { id: "dental", name: "Mouth or dental pain", note: "Interested in food but reluctant to chew." },
    { id: "illness", name: "Underlying illness", note: "Worth a look if it lasts or other signs appear." },
    { id: "stress", name: "Stress or environment change", note: "New home, pet, or routine." },
  ],
  questions: [
    screener,
    {
      id: "gi",
      text: "Any vomiting, diarrhea, or a painful belly?",
      why: "GI signs alongside not eating point to nausea or something more serious.",
      kind: "redflag",
      options: [
        { id: "none", label: "None of those", support: "No vomiting or diarrhea" },
        { id: "some", label: "A little", points: 1, causeWeights: { gi: 2 } },
        { id: "lots", label: "Repeated vomiting or painful belly", redFlag: "repeatedVomiting", urgencyFloor: "orange", points: 2, causeWeights: { illness: 1 } },
      ],
    },
    {
      id: "duration",
      text: "How long since {name} ate a real meal?",
      why: "Cats especially can get seriously ill if they don't eat for more than a day or two.",
      kind: "redflag",
      options: [
        { id: "today", label: "Just today", causeWeights: { pickiness: 1 } },
        { id: "day", label: "About a day", points: 1 },
        { id: "long", label: "2+ days", urgencyFloor: "orange", points: 2, causeWeights: { illness: 1 } },
      ],
    },
    {
      id: "water",
      text: "Are they still drinking water?",
      why: "Not drinking on top of not eating raises dehydration risk.",
      kind: "core",
      options: [
        { id: "yes", label: "Yes", support: "Still drinking water" },
        { id: "less", label: "Less than usual", points: 1 },
        { id: "no", label: "Not really", urgencyFloor: "orange", points: 2 },
      ],
    },
    {
      id: "demeanor",
      text: "How are they otherwise?",
      why: "A bright, playful pet is reassuring; a withdrawn one is more concerning.",
      kind: "core",
      options: [
        { id: "bright", label: "Bright and normal", causeWeights: { pickiness: 2 }, support: "Bright and otherwise normal" },
        { id: "quiet", label: "A bit quiet", points: 1, causeWeights: { gi: 1 } },
        { id: "withdrawn", label: "Withdrawn, hiding, or weak", urgencyFloor: "orange", points: 2, causeWeights: { illness: 2 } },
      ],
    },
    {
      id: "context",
      text: "Anything new — food change, stress, or mouth pain?",
      why: "These are common, fixable reasons a pet goes off food.",
      kind: "refine",
      allowUnsure: true,
      options: [
        { id: "diet", label: "New food or stress/change", causeWeights: { pickiness: 2, stress: 2 } },
        { id: "mouth", label: "Seems like mouth/teeth hurt", causeWeights: { dental: 2 } },
        { id: "none", label: "Nothing obvious", causeWeights: { illness: 1 } },
      ],
    },
  ],
};

const ENERGY: ConcernModule = {
  id: "energy",
  label: "Low energy",
  icon: "battery",
  baseUrgency: "amber",
  changesUrgency: [
    "Pale, white, or blue gums",
    "Collapse, fainting, or trouble standing",
    "Fast or labored breathing",
    "Not eating or drinking, or a senior pet worsening fast",
  ],
  homeCare: [
    "Let {name} rest in a cool, quiet spot and offer water.",
    "Check gum color (should be bubble-gum pink) and breathing at rest.",
    "Note appetite, toileting, and any other change.",
    "Recheck soon — book a vet if the low energy lasts or worsens.",
  ],
  priors: (ctx) => {
    const out: Record<string, number> = {};
    if (ctx.pet.ageYears >= 8) out.illness = 1;
    return out;
  },
  causes: [
    { id: "mild", name: "Temporary tiredness", note: "Heat, big exercise, or an off day." },
    { id: "illness", name: "Brewing illness or infection", note: "Worth a look if it persists." },
    { id: "gi", name: "GI upset", note: "Nausea can sap energy." },
    { id: "pain", name: "Pain or discomfort", note: "Quiet pets are sometimes sore." },
    { id: "serious", name: "Heart, blood, or metabolic problem", note: "Considered with pale gums or collapse." },
  ],
  questions: [
    screener,
    {
      id: "gums",
      text: "Gum color and breathing at rest?",
      why: "Pale/blue gums or labored breathing turn 'tired' into an emergency.",
      kind: "redflag",
      options: [
        { id: "ok", label: "Pink gums, breathing easily", support: "Pink gums, breathing comfortably" },
        { id: "bad", label: "Pale/blue gums or hard breathing", redFlag: "paleGums", urgencyFloor: "red", causeWeights: { serious: 2 } },
        { id: "unsure", label: "Not sure", points: 1 },
      ],
    },
    {
      id: "eat",
      text: "Eating and drinking normally?",
      why: "Appetite and thirst are quick windows into how unwell a pet feels.",
      kind: "core",
      options: [
        { id: "yes", label: "Yes, normal", causeWeights: { mild: 1 } },
        { id: "less", label: "Reduced", points: 1, causeWeights: { illness: 1 } },
        { id: "no", label: "Barely / not at all", urgencyFloor: "orange", points: 2, causeWeights: { illness: 1 } },
      ],
    },
    {
      id: "other",
      text: "Any other signs?",
      why: "A second sign helps point us toward the cause.",
      kind: "core",
      options: [
        { id: "gi", label: "Also vomiting or diarrhea", causeWeights: { gi: 2 } },
        { id: "pain", label: "Limping or seems sore", causeWeights: { pain: 2 } },
        { id: "heat", label: "Hot day or hard exercise first", causeWeights: { mild: 2 }, support: "Recent heat or hard exercise can explain tiredness" },
        { id: "none", label: "Nothing else obvious", causeWeights: { illness: 1 } },
      ],
    },
    {
      id: "senior",
      text: "Has {name} gone downhill quickly over a day or two?",
      why: "In a senior pet, a fast decline deserves a prompt vet check.",
      kind: "refine",
      when: (ctx) => ctx.pet.ageYears >= 8,
      options: [
        { id: "yes", label: "Yes, fast decline", redFlag: "seniorWorsening", points: 1 },
        { id: "no", label: "No, gradual or steady", support: "Decline is gradual, not sudden" },
      ],
    },
  ],
};

const GENERIC: ConcernModule = {
  id: "generic",
  label: "Something else",
  icon: "more",
  baseUrgency: "green",
  changesUrgency: [
    "Worsening signs",
    "Not eating or drinking",
    "Lethargy, collapse, or pale gums",
    "Lasting more than a few days",
  ],
  homeCare: [
    "Keep a close eye and log what you notice in the timeline.",
    "Make sure {name}'s food and water intake stay normal.",
    "Take a photo or short video of anything visible for your vet.",
    "Set a check-in reminder and book a vet if it worsens.",
  ],
  causes: [
    { id: "minor", name: "Minor self-limiting issue", note: "Most mild signs resolve with monitoring." },
    { id: "early", name: "Early-stage problem", note: "Worth tracking in case it develops." },
  ],
  questions: [
    screener,
    {
      id: "duration",
      text: "How long has this been going on?",
      why: "Duration helps separate a passing issue from something that needs a vet.",
      kind: "core",
      options: [
        { id: "today", label: "Started today" },
        { id: "days", label: "A few days", points: 1 },
        { id: "week", label: "A week or more", urgencyFloor: "amber", points: 1, causeWeights: { early: 2 } },
      ],
    },
    {
      id: "ea",
      text: "How is {name}'s energy and appetite?",
      why: "Normal energy and eating are reassuring signs we can often monitor at home.",
      kind: "core",
      options: [
        { id: "normal", label: "Both normal", support: "Energy and appetite are normal", causeWeights: { minor: 2 } },
        { id: "off", label: "A little off", points: 1 },
        { id: "poor", label: "Low energy & not eating", urgencyFloor: "orange", points: 2, causeWeights: { early: 1 } },
      ],
    },
    {
      id: "trend",
      text: "Is it getting better, worse, or the same?",
      why: "The direction of change is one of the best signals of urgency.",
      kind: "core",
      options: [
        { id: "better", label: "Slowly better", support: "Trending better", causeWeights: { minor: 2 } },
        { id: "same", label: "About the same", points: 1 },
        { id: "worse", label: "Getting worse", urgencyFloor: "amber", points: 2, causeWeights: { early: 2 } },
      ],
    },
  ],
};

export const MODULES: ConcernModule[] = [
  DIARRHEA,
  VOMITING,
  SKIN,
  EAR,
  EYE,
  TEETH,
  MOBILITY,
  APPETITE,
  ENERGY,
  URINARY,
];

export const GENERIC_MODULE = GENERIC;

export interface ConcernOption {
  id: string;
  label: string;
  icon: string;
}

// Entry-screen list: the ten modules in the requested order, then "Something else".
export const CONCERNS: ConcernOption[] = [
  ...MODULES.map((m) => ({ id: m.id, label: m.label, icon: m.icon })),
  { id: "other", label: "Something else", icon: "more" },
];

export function getModule(concernId: string): ConcernModule {
  return MODULES.find((m) => m.id === concernId) ?? GENERIC;
}
