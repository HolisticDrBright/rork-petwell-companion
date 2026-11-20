import type { VetCitation } from "../../../supabase/functions/_shared/grounding";

// A narrow offline baseline that only points to published general guidance.
const emergency: VetCitation = {
  source_id: "avma-pet-first-aid",
  title: "First aid for pets",
  publisher: "American Veterinary Medical Association",
  quote_or_section: "Emergency and poisoning guidance",
  url: "https://ebusiness.avma.org/files/productdownloads/mcm-client-brochures-pet-first-aid-2023.pdf",
};
const general: VetCitation = {
  source_id: "cornell-urgent-care",
  title: "Urgent Care",
  publisher: "Cornell University College of Veterinary Medicine",
  quote_or_section: "Urgent care and emergencies",
  url: "https://www.vet.cornell.edu/hospitals/services/urgent-care",
};

export function triageReferences(urgency: string, concern: string, species: string): VetCitation[] {
  const refs = [urgency === "red" || /poison|toxin/i.test(concern) ? emergency : general];
  if (species === "cat" && /breath|pant/i.test(concern)) refs.push({
    source_id: "cornell-cat-breathing",
    title: "Dyspnea (Difficulty Breathing)", publisher: "Cornell Feline Health Center",
    quote_or_section: "Difficulty breathing",
    url: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/dyspnea-difficulty-breathing",
  });
  return refs;
}
