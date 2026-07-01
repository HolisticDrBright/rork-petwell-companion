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
];
