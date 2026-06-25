/**
 * Animal-poison emergency contacts + the safety copy that must appear wherever
 * toxins are discussed. These are the two US animal poison control services.
 * Both are staffed 24/7 and may charge a consultation fee.
 */

export interface EmergencyContact {
  id: string;
  name: string;
  /** Human-readable number. */
  display: string;
  /** `tel:` URL for one-tap dialing (E.164). */
  tel: string;
  note: string;
  url: string;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: "aspca_apcc",
    name: "ASPCA Animal Poison Control",
    display: "(888) 426-4435",
    tel: "tel:+18884264435",
    note: "24/7. A consultation fee may apply.",
    url: "https://www.aspca.org/pet-care/animal-poison-control",
  },
  {
    id: "pet_poison_helpline",
    name: "Pet Poison Helpline",
    display: "(855) 764-7661",
    tel: "tel:+18557647661",
    note: "24/7. A per-incident fee may apply.",
    url: "https://www.petpoisonhelpline.com/",
  },
];

/** Shown alongside the call buttons whenever a possible exposure is in view. */
export const POISON_CALL_TO_ACTION =
  "If you think your pet ate or touched something toxic, call your vet or a poison hotline right away — even if they seem fine. Don't wait for symptoms.";

/**
 * The critical "absence ≠ safety" message. Surfaced on every empty search and in
 * the screen footer so a no-match result is never read as "this is safe".
 */
export const NOT_FOUND_NOT_SAFE =
  "Not on this list does NOT mean it's safe. Petwell's database is a starting point, not a complete list. When in doubt, call your vet or a poison hotline.";

/** Standing reminder that Petwell never gives treatment instructions. */
export const NO_TREATMENT_NOTE =
  "Petwell shows what a substance is and signs to watch for — it does not diagnose or give treatment, doses, or first-aid steps. Only a vet or poison control should advise treatment.";
