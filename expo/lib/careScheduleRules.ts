export const SCHEDULE_KINDS = [
  ["meal", "Meal"], ["med", "Medication"], ["walk", "Walk"], ["water", "Water"],
  ["litter", "Litter"], ["grooming", "Grooming"], ["custom", "Custom"],
] as const;
export const RECURRENCES = [
  ["FREQ=DAILY", "Daily"], ["FREQ=HOURLY;INTERVAL=8", "Every 8 hours"],
  ["FREQ=WEEKLY", "Weekly"], ["FREQ=MONTHLY", "Monthly"], ["FREQ=DAILY;COUNT=1", "One time"],
] as const;
export const SCHEDULE_TEMPLATES = {
  dog: { kind: "walk", title: "Daily walk", instructions: "Adjust the time and route for your dog." },
  cat: { kind: "litter", title: "Check litter box", instructions: "Scoop and check that the litter box is clean." },
} as const;

type ScheduleTemplate = {
  kind: (typeof SCHEDULE_KINDS)[number][0];
  title: string;
  instructions: string;
  rrule?: string;
};

export function scheduleTemplates(species: "dog" | "cat", breed: string, ageYears: number): ScheduleTemplate[] {
  const templates: ScheduleTemplate[] = [SCHEDULE_TEMPLATES[species]];
  if (ageYears < 1) {
    templates.push({
      kind: "meal",
      title: species === "cat" ? "Kitten meal reminder" : "Puppy meal reminder",
      instructions: "Set the times and portions from your pet’s feeding plan.",
      rrule: "FREQ=HOURLY;INTERVAL=8",
    });
  }
  if (/poodle|bichon|shih tzu|persian|maine coon|ragdoll/i.test(breed)) {
    templates.push({ kind: "grooming", title: "Coat check and brushing", instructions: "Adjust the frequency for your pet’s coat." });
  }
  return templates;
}
