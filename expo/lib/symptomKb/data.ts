/**
 * Symptom KB seed — a small, curated, SOURCE-BACKED starter set of the
 * highest-value visual features. Offline-first (like lib/toxins/data.ts); the
 * Supabase table (migration 0021) carries vet-curated additions/overrides.
 *
 * Curation rules (see docs/SYMPTOM_KB.md):
 *  - Descriptive + hedged ("can be associated with…"), NEVER a diagnosis.
 *  - Every entry cites a reputable general source and stays `needs_vet_review`.
 *  - Urgency reflects how the OBSERVATION looks; it nudges vet contact but never
 *    overrides the app's deterministic emergency/toxin routing.
 */
import type { KbSource, SymptomKbEntry } from "./types";

const MERCK: KbSource = { name: "Merck Veterinary Manual", url: "https://www.merckvetmanual.com" };
const VCA: KbSource = { name: "VCA Animal Hospitals", url: "https://vcahospitals.com" };
const ASPCA: KbSource = { name: "ASPCA", url: "https://www.aspca.org" };
const CAPC: KbSource = { name: "Companion Animal Parasite Council", url: "https://capcvet.org" };
const AAHA: KbSource = { name: "American Animal Hospital Association", url: "https://www.aaha.org" };
const CORNELL: KbSource = { name: "Cornell Feline Health Center", url: "https://www.vet.cornell.edu" };

const R = "needs_vet_review" as const;

export const SYMPTOM_KB: SymptomKbEntry[] = [
  // ── Stool ──────────────────────────────────────────────────────────────────
  {
    id: "poop-melena", species: "both", area: "poop", feature: "stool_color",
    matchTokens: ["black", "tarry", "melena"], title: "Black or tarry stool",
    mayIndicate:
      "Very dark, black, or tarry stool can be associated with digested blood from the upper digestive tract. It should be checked promptly.",
    urgency: "emergency", watchFor: ["lethargy", "pale gums", "vomiting"], relatedConcern: "diarrhea", source: MERCK, reviewStatus: R,
  },
  {
    id: "poop-hematochezia", species: "both", area: "poop", feature: "stool_blood",
    matchTokens: ["blood", "bloody", "red streak", "hematochezia"], title: "Fresh red blood in stool",
    mayIndicate:
      "Bright red blood or streaks can be associated with irritation or bleeding lower in the digestive tract. Occasional small streaks are common, but ongoing or large amounts should be checked.",
    urgency: "vet_soon", watchFor: ["straining", "diarrhea", "lethargy"], relatedConcern: "diarrhea", source: VCA, reviewStatus: R,
  },
  {
    id: "poop-acholic", species: "both", area: "poop", feature: "stool_color",
    matchTokens: ["pale", "grey", "gray", "clay"], title: "Very pale or clay-colored stool",
    mayIndicate:
      "Unusually pale, grey, or clay-colored stool can be associated with issues in bile flow or the liver and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["yellow gums", "reduced appetite"], relatedConcern: "diarrhea", source: MERCK, reviewStatus: R,
  },
  {
    id: "poop-liquid", species: "both", area: "poop", feature: "stool_consistency",
    matchTokens: ["watery", "liquid", "diarrhea"], title: "Watery or liquid stool",
    mayIndicate:
      "Very loose or watery stool (diarrhea) is common and often settles in a day or two, but should be checked if it persists, is bloody, or the pet seems unwell.",
    urgency: "watch", watchFor: ["dehydration", "lethargy", "repeat episodes"], relatedConcern: "diarrhea", source: ASPCA, reviewStatus: R,
  },
  {
    id: "poop-parasites", species: "both", area: "poop", feature: "foreign_material",
    matchTokens: ["worm", "worms", "segment", "rice"], title: "Visible worms or segments",
    mayIndicate:
      "Visible worms, or small rice-like segments around the stool or rear, can be associated with intestinal parasites. A vet can confirm and treat.",
    urgency: "vet_soon", watchFor: ["weight loss", "scooting"], relatedConcern: "diarrhea", source: CAPC, reviewStatus: R,
  },

  // ── Gums / teeth ────────────────────────────────────────────────────────────
  {
    id: "gums-pale", species: "both", area: "teeth", feature: "gum_color",
    matchTokens: ["pale", "white"], title: "Pale or white gums",
    mayIndicate:
      "Pale or white gums can be associated with poor circulation, blood loss, or anemia and can be urgent — especially with weakness or fast breathing.",
    urgency: "emergency", watchFor: ["weakness", "fast breathing", "collapse"], relatedConcern: "other", source: VCA, reviewStatus: R,
  },
  {
    id: "gums-cyanosis", species: "both", area: "teeth", feature: "gum_color",
    matchTokens: ["blue", "bluish", "purple"], title: "Blue or purple gums",
    mayIndicate: "Bluish or purple gums can be associated with low blood oxygen and is an emergency.",
    urgency: "emergency", watchFor: ["labored breathing", "collapse"], relatedConcern: "other", source: MERCK, reviewStatus: R,
  },
  {
    id: "gums-icterus", species: "both", area: "teeth", feature: "gum_color",
    matchTokens: ["yellow", "jaundice", "icterus"], title: "Yellow gums",
    mayIndicate:
      "A yellow tinge to the gums can be associated with the liver or red blood cells and should be checked promptly.",
    urgency: "vet_soon", watchFor: ["reduced appetite", "dark urine", "lethargy"], relatedConcern: "other", source: MERCK, reviewStatus: R,
  },
  {
    id: "gums-gingivitis", species: "both", area: "teeth", feature: "gum_finding",
    matchTokens: ["inflamed", "gingivitis", "bleeding gum", "red gum"], title: "Red or inflamed gum line",
    mayIndicate:
      "A red, inflamed gum line can be associated with gum disease. It's common and treatable, and worth a dental check.",
    urgency: "watch", watchFor: ["bad breath", "tartar", "difficulty eating"], relatedConcern: "other", source: AAHA, reviewStatus: R,
  },
  {
    id: "teeth-tartar", species: "both", area: "teeth", feature: "teeth_finding",
    matchTokens: ["tartar", "calculus", "brown buildup"], title: "Heavy tartar buildup",
    mayIndicate:
      "Heavy brown buildup on the teeth is associated with dental disease, and a professional cleaning may be needed.",
    urgency: "watch", watchFor: ["bad breath", "red gums"], relatedConcern: "other", source: AAHA, reviewStatus: R,
  },

  // ── Skin ───────────────────────────────────────────────────────────────────
  {
    id: "skin-fleas", species: "both", area: "skin", feature: "parasite",
    matchTokens: ["flea", "fleas", "flea dirt"], title: "Visible fleas or flea dirt",
    mayIndicate:
      "Visible fleas or black specks (flea dirt) usually mean fleas. Treatment is usually straightforward, but a vet visit is worth it if there's a strong reaction or the pet is very young, old, or unwell.",
    urgency: "watch", watchFor: ["scratching", "hair loss", "red skin"], relatedConcern: "skin", source: CAPC, reviewStatus: R,
  },
  {
    id: "skin-tick", species: "both", area: "skin", feature: "parasite",
    matchTokens: ["tick", "ticks"], title: "Attached tick",
    mayIndicate:
      "An attached tick should be removed carefully; ticks can carry disease, so monitor and ask your vet — especially if the pet becomes unwell.",
    urgency: "vet_soon", watchFor: ["lethargy", "lameness", "fever"], relatedConcern: "skin", source: CAPC, reviewStatus: R,
  },
  {
    id: "skin-hotspot", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["hot spot", "moist", "raw", "weeping"], title: "Red, moist raw patch (hot spot)",
    mayIndicate:
      "A red, moist, raw patch that appears quickly can be associated with acute skin irritation (a 'hot spot') and can worsen fast — a vet check is recommended.",
    urgency: "vet_soon", watchFor: ["licking", "pain", "spreading"], relatedConcern: "skin", source: VCA, reviewStatus: R,
  },
  {
    id: "skin-alopecia", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["hair loss", "bald", "scab", "crust"], title: "Hair loss with scabs or crusts",
    mayIndicate:
      "Patchy hair loss with scabs or crusts can be associated with allergies, parasites, or skin infection and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["itching", "odor", "spreading"], relatedConcern: "skin", source: MERCK, reviewStatus: R,
  },

  // ── Ear ────────────────────────────────────────────────────────────────────
  {
    id: "ear-discharge", species: "both", area: "ear", feature: "ear_discharge",
    matchTokens: ["dark", "brown", "black discharge", "debris"], title: "Dark or brown ear discharge",
    mayIndicate:
      "Dark, brown, or black discharge and debris in the ear can be associated with an ear infection or mites and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["head shaking", "odor", "scratching"], relatedConcern: "ear", source: VCA, reviewStatus: R,
  },
  {
    id: "ear-otitis", species: "both", area: "ear", feature: "ear_finding",
    matchTokens: ["red", "swollen", "inflamed"], title: "Red or swollen ear canal",
    mayIndicate:
      "A red, swollen ear canal can be associated with ear inflammation or infection, which is often painful — a vet check is recommended.",
    urgency: "vet_soon", watchFor: ["head tilt", "pain", "odor"], relatedConcern: "ear", source: MERCK, reviewStatus: R,
  },

  // ── Eye ────────────────────────────────────────────────────────────────────
  {
    id: "eye-discharge", species: "both", area: "eye", feature: "eye_discharge",
    matchTokens: ["green", "yellow", "pus", "discharge"], title: "Green or yellow eye discharge",
    mayIndicate:
      "Thick green or yellow eye discharge can be associated with an eye infection and is worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["squinting", "redness", "swelling"], relatedConcern: "eye", source: VCA, reviewStatus: R,
  },
  {
    id: "eye-cloudy", species: "both", area: "eye", feature: "eye_finding",
    matchTokens: ["cloudy", "opaque", "blue haze"], title: "Cloudy or bluish eye",
    mayIndicate:
      "A cloudy or bluish appearance to the eye can be associated with the cornea or lens and should be checked, as some eye problems progress quickly.",
    urgency: "vet_soon", watchFor: ["squinting", "pawing at eye", "vision changes"], relatedConcern: "eye", source: MERCK, reviewStatus: R,
  },
  {
    id: "eye-squint", species: "both", area: "eye", feature: "eye_finding",
    matchTokens: ["squint", "squinting", "closed", "held shut"], title: "Squinting or holding the eye shut",
    mayIndicate:
      "Squinting or holding an eye shut can be associated with eye pain or a surface injury; eye issues can worsen quickly, so a prompt check is recommended.",
    urgency: "vet_soon", watchFor: ["redness", "tearing", "rubbing"], relatedConcern: "eye", source: VCA, reviewStatus: R,
  },

  // ── Stool (expanded) ────────────────────────────────────────────────────────
  {
    id: "poop-mucus", species: "both", area: "poop", feature: "stool_finding",
    matchTokens: ["mucus", "slimy", "slime", "jelly"], title: "Mucus or slimy coating on stool",
    mayIndicate:
      "A slimy or jelly-like coating can be associated with irritation of the lower bowel. Occasional mucus is common; ongoing mucus, especially with blood or diarrhea, is worth a vet check.",
    urgency: "watch", watchFor: ["diarrhea", "straining", "blood"], relatedConcern: "diarrhea", source: MERCK, reviewStatus: R,
  },
  {
    id: "poop-yellow", species: "both", area: "poop", feature: "stool_color",
    matchTokens: ["yellow", "orange", "mustard"], title: "Yellow or orange stool",
    mayIndicate:
      "Yellow or orange stool can be associated with food passing through quickly or a change in bile, and is worth watching; check with your vet if it persists or the pet is unwell.",
    urgency: "watch", watchFor: ["diarrhea", "reduced appetite"], relatedConcern: "diarrhea", source: VCA, reviewStatus: R,
  },
  {
    id: "poop-steatorrhea", species: "both", area: "poop", feature: "stool_finding",
    matchTokens: ["greasy", "oily", "shiny stool"], title: "Greasy or oily-looking stool",
    mayIndicate:
      "Greasy, oily, or unusually shiny stool can be associated with trouble digesting fat and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["weight loss", "increased appetite", "large volume"], relatedConcern: "diarrhea", source: MERCK, reviewStatus: R,
  },
  {
    id: "poop-tapeworm", species: "both", area: "poop", feature: "foreign_material",
    matchTokens: ["tapeworm", "sesame", "white specks", "moving specks"], title: "Small white segments near the rear",
    mayIndicate:
      "Small white rice- or sesame-like segments near the stool or rear can be associated with tapeworms, often linked to fleas. A vet can confirm and treat.",
    urgency: "vet_soon", watchFor: ["scooting", "fleas"], relatedConcern: "diarrhea", source: CAPC, reviewStatus: R,
  },
  {
    id: "cat-urinary-straining", species: "cat", area: "poop", feature: "litter_behavior",
    matchTokens: ["straining", "crying in box", "in and out of box", "frequent trips"], title: "A cat straining in the litter box",
    mayIndicate:
      "A cat straining, making frequent trips, or crying in the litter box can be a urinary emergency — in male cats a blockage is life-threatening and should be seen by a vet right away.",
    urgency: "emergency", watchFor: ["no urine", "vocalizing", "lethargy"], relatedConcern: "urinary", source: CORNELL, reviewStatus: R,
  },

  // ── Gums / teeth (expanded) ─────────────────────────────────────────────────
  {
    id: "teeth-fracture", species: "both", area: "teeth", feature: "teeth_finding",
    matchTokens: ["broken tooth", "fractured", "chipped", "cracked tooth"], title: "Broken or fractured tooth",
    mayIndicate:
      "A broken or fractured tooth can be painful and may expose the inner tooth; a vet check is recommended.",
    urgency: "vet_soon", watchFor: ["reluctant to eat", "pawing at mouth", "bad breath"], relatedConcern: "other", source: AAHA, reviewStatus: R,
  },
  {
    id: "mouth-mass", species: "both", area: "teeth", feature: "gum_finding",
    matchTokens: ["growth", "mass", "lump on gum", "bump"], title: "Growth or lump on the gum",
    mayIndicate:
      "A new growth or lump on the gum should be checked by a vet, as some mouth masses need early attention.",
    urgency: "vet_soon", watchFor: ["bleeding", "difficulty eating", "drooling"], relatedConcern: "other", source: VCA, reviewStatus: R,
  },
  {
    id: "gums-stomatitis-cat", species: "cat", area: "teeth", feature: "gum_finding",
    matchTokens: ["very red", "severe inflammation", "raw gums", "ulcer"], title: "Severe gum inflammation (cat)",
    mayIndicate:
      "Severe, raw, or very red gum inflammation can be associated with painful oral disease in cats and is worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["drooling", "reduced appetite", "weight loss"], relatedConcern: "other", source: CORNELL, reviewStatus: R,
  },
  {
    id: "mouth-bleeding", species: "both", area: "teeth", feature: "gum_finding",
    matchTokens: ["bleeding mouth", "blood in mouth", "bleeding from mouth"], title: "Bleeding from the mouth",
    mayIndicate:
      "Bleeding from the mouth can be associated with dental disease, injury, or a growth and is worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["drooling", "difficulty eating"], relatedConcern: "other", source: MERCK, reviewStatus: R,
  },

  // ── Skin (expanded) ─────────────────────────────────────────────────────────
  {
    id: "skin-ringworm", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["circular", "ring-shaped", "round bald", "crusty ring"], title: "Circular patch of hair loss",
    mayIndicate:
      "A circular or ring-shaped patch of hair loss with scaling can be associated with several skin conditions (including ringworm, which may spread to people) and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["itching", "spreading", "scaling"], relatedConcern: "skin", source: MERCK, reviewStatus: R,
  },
  {
    id: "skin-mass", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["lump", "mass", "growth", "nodule"], title: "New lump or mass under the skin",
    mayIndicate:
      "A new lump or mass under the skin should be checked by a vet — most are harmless, but early evaluation matters.",
    urgency: "vet_soon", watchFor: ["rapid growth", "changes", "discharge"], relatedConcern: "skin", source: VCA, reviewStatus: R,
  },
  {
    id: "skin-pustules", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["pustule", "pimple", "pus bump", "whitehead"], title: "Pimple-like bumps or pustules",
    mayIndicate:
      "Small pimple-like bumps or pustules can be associated with a skin infection and are worth a vet check, especially if spreading.",
    urgency: "vet_soon", watchFor: ["redness", "itching", "odor"], relatedConcern: "skin", source: VCA, reviewStatus: R,
  },
  {
    id: "skin-seborrhea", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["flaky", "dandruff", "scaling", "greasy skin"], title: "Greasy or flaky skin (dandruff)",
    mayIndicate:
      "Greasy, flaky, or heavily scaling skin can be associated with a skin or coat problem and is worth a vet check if it persists.",
    urgency: "watch", watchFor: ["odor", "itching", "hair loss"], relatedConcern: "skin", source: MERCK, reviewStatus: R,
  },
  {
    id: "skin-myiasis", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["maggot", "maggots", "larvae"], title: "Maggots in a wound",
    mayIndicate:
      "Visible maggots in a wound or the coat is an emergency and should be treated by a vet right away.",
    urgency: "emergency", watchFor: ["open wound", "odor", "weakness"], relatedConcern: "skin", source: MERCK, reviewStatus: R,
  },
  {
    id: "skin-interdigital", species: "both", area: "skin", feature: "skin_finding",
    matchTokens: ["between toes", "interdigital", "red paw", "paw redness"], title: "Redness or swelling between the toes",
    mayIndicate:
      "Redness, swelling, or a lump between the toes can be associated with irritation, allergy, or infection and is worth a vet check if it persists.",
    urgency: "watch", watchFor: ["licking paws", "limping", "discharge"], relatedConcern: "skin", source: VCA, reviewStatus: R,
  },
  {
    id: "cat-barbering", species: "cat", area: "skin", feature: "skin_finding",
    matchTokens: ["bald strip", "over-groom", "overgrooming", "symmetrical hair loss"], title: "Bald strip from over-grooming (cat)",
    mayIndicate:
      "A smooth bald strip, often along the belly or legs, can be associated with over-grooming in cats — often linked to itch, pain, or stress — and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["scratching", "behavior change"], relatedConcern: "skin", source: CORNELL, reviewStatus: R,
  },

  // ── Ear (expanded) ──────────────────────────────────────────────────────────
  {
    id: "ear-mites-cat", species: "cat", area: "ear", feature: "ear_discharge",
    matchTokens: ["coffee ground", "coffee-ground", "dry black", "crumbly black"], title: "Dry, coffee-ground ear debris (cat)",
    mayIndicate:
      "Dry, dark, coffee-ground-like ear debris can be associated with ear mites, which are common in cats, and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["scratching ears", "head shaking"], relatedConcern: "ear", source: CORNELL, reviewStatus: R,
  },
  {
    id: "ear-hematoma", species: "both", area: "ear", feature: "ear_finding",
    matchTokens: ["swollen ear flap", "puffy ear", "ballooned ear", "fluid ear flap"], title: "Swollen ear flap",
    mayIndicate:
      "A soft, swollen ear flap can be associated with a collection of blood (aural hematoma), often from head shaking, and is worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["head shaking", "scratching", "pain"], relatedConcern: "ear", source: VCA, reviewStatus: R,
  },
  {
    id: "ear-odor", species: "both", area: "ear", feature: "ear_finding",
    matchTokens: ["yeasty", "foul smell", "smelly ear", "bad odor"], title: "Strong or yeasty ear odor",
    mayIndicate:
      "A strong, foul, or yeasty odor from the ear can be associated with an ear infection and is worth a vet check.",
    urgency: "vet_soon", watchFor: ["discharge", "redness", "scratching"], relatedConcern: "ear", source: MERCK, reviewStatus: R,
  },

  // ── Eye (expanded) ──────────────────────────────────────────────────────────
  {
    id: "eye-proptosis", species: "both", area: "eye", feature: "eye_finding",
    matchTokens: ["bulging", "out of socket", "protruding eye", "popped out"], title: "Bulging eye or eye out of socket",
    mayIndicate:
      "An eye that appears bulging or out of its socket is an emergency and should be seen by a vet right away.",
    urgency: "emergency", watchFor: ["swelling", "bleeding", "distress"], relatedConcern: "eye", source: MERCK, reviewStatus: R,
  },
  {
    id: "eye-cherry", species: "both", area: "eye", feature: "eye_finding",
    matchTokens: ["cherry eye", "red bump corner", "pink mass corner"], title: "Red bump in the eye corner (cherry eye)",
    mayIndicate:
      "A red, fleshy bump in the inner corner of the eye can be associated with a prolapsed tear gland ('cherry eye') and is worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["tearing", "rubbing"], relatedConcern: "eye", source: VCA, reviewStatus: R,
  },
  {
    id: "eye-anisocoria", species: "both", area: "eye", feature: "eye_finding",
    matchTokens: ["uneven pupils", "different size pupils", "one pupil larger", "dilated pupil"], title: "Unequal or very dilated pupils",
    mayIndicate:
      "Pupils that are very unequal in size, or stay very dilated, can be associated with eye or nervous-system problems and are worth a prompt vet check.",
    urgency: "vet_soon", watchFor: ["squinting", "bumping into things", "behavior change"], relatedConcern: "eye", source: MERCK, reviewStatus: R,
  },
  {
    id: "eye-tearing", species: "both", area: "eye", feature: "eye_discharge",
    matchTokens: ["watery eye", "excess tearing", "tear stain", "runny eye"], title: "Excessive tearing or tear staining",
    mayIndicate:
      "Watery eyes or heavy tear staining can be associated with irritation or blocked tear drainage and is worth watching; a vet check helps if it is persistent or with redness.",
    urgency: "watch", watchFor: ["redness", "squinting", "rubbing"], relatedConcern: "eye", source: VCA, reviewStatus: R,
  },
  {
    id: "cat-third-eyelid", species: "cat", area: "eye", feature: "eye_finding",
    matchTokens: ["third eyelid", "haw showing", "white membrane", "nictitating"], title: "Third eyelids showing (cat)",
    mayIndicate:
      "Third eyelids visible across both eyes can be associated with a cat feeling unwell and is worth a vet check, especially with other signs.",
    urgency: "vet_soon", watchFor: ["reduced appetite", "lethargy", "diarrhea"], relatedConcern: "eye", source: CORNELL, reviewStatus: R,
  },
];
