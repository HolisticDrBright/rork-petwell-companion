import type { UrgencyKey } from "@/constants/colors";

export type Species = "dog" | "cat";

export type HealthStatus = "stable" | "watch" | "attention";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  ageYears: number;
  sex: "male" | "female";
  weightLb: number;
  photo: string;
  status: HealthStatus;
  statusNote: string;
  recentChange: string;
  riskWatch: string;
  conditions: string[];
  allergies: string[];
  demoKey?: string; // 'buddy' | 'luna' | 'milo' for seeded demo pets
}

export interface CareItem {
  id: string;
  label: string;
  detail?: string;
  icon: "bowl" | "pill" | "activity" | "tooth" | "heart" | "droplet";
  done: boolean;
}

export type LogCategory =
  | "food"
  | "stool"
  | "skin"
  | "weight"
  | "activity"
  | "meds"
  | "vet"
  | "scan"
  | "symptom";

export interface TimelineEntry {
  id: string;
  petId: string;
  date: string; // ISO date (yyyy-mm-dd)
  time: string;
  category: LogCategory;
  title: string;
  detail?: string;
  value?: number; // numeric for charts (stool score, itching, weight)
  urgency?: UrgencyKey;
}

export interface UpcomingItem {
  id: string;
  label: string;
  detail: string;
  date: string;
  type: "vaccine" | "appointment" | "refill";
}

export interface RecordItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  status?: "ok" | "due" | "overdue";
}

export interface Reminder {
  id: string;
  label: string;
  detail: string;
  time: string;
  enabled: boolean;
  repeat: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  brand: string;
  connected: boolean;
  dataTypes: string[];
}
