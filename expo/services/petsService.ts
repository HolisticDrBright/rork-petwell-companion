import {
  CARE_ITEMS,
  PETS,
  RECORDS,
  REMINDERS,
  TIMELINE,
} from "@/constants/mockData";
import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/backend";
import type { CareItem, HealthStatus, Pet, Species } from "@/types/pet";
import type { TablesInsert } from "@/types/db";

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age_years: number;
  sex: string | null;
  weight_lb: number;
  photo_url: string | null;
  status: string;
  status_note: string;
  recent_change: string | null;
  risk_watch: string | null;
  demo_key: string | null;
  pet_conditions?: { label: string }[] | null;
  pet_allergies?: { label: string }[] | null;
};

function mapPet(row: PetRow): Pet {
  return {
    id: row.id,
    name: row.name,
    species: (row.species as Species) ?? "dog",
    breed: row.breed ?? "",
    ageYears: Number(row.age_years ?? 0),
    sex: (row.sex as "male" | "female") ?? "male",
    weightLb: Number(row.weight_lb ?? 0),
    photo: row.photo_url ?? "",
    status: (row.status as HealthStatus) ?? "stable",
    statusNote: row.status_note ?? "Stable",
    recentChange: row.recent_change ?? "",
    riskWatch: row.risk_watch ?? "",
    conditions: (row.pet_conditions ?? []).map((c) => c.label),
    allergies: (row.pet_allergies ?? []).map((a) => a.label),
    demoKey: row.demo_key ?? undefined,
  };
}

const PET_SELECT = "*, pet_conditions(label), pet_allergies(label)";

export interface NewPetInput {
  name: string;
  species: Species;
  breed?: string;
  ageYears?: number;
  sex?: "male" | "female";
  weightLb?: number;
  photo?: string;
  conditions?: string[];
}

export const petsService = {
  async listPets(): Promise<Pet[]> {
    const { data, error } = await supabase
      .from("pet_profiles")
      .select(PET_SELECT)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as PetRow[]).map(mapPet);
  },

  async createPet(input: NewPetInput): Promise<Pet> {
    const owner_id = requireUserId();
    const { data, error } = await supabase
      .from("pet_profiles")
      .insert({
        owner_id,
        name: input.name,
        species: input.species,
        breed: input.breed ?? "",
        age_years: input.ageYears ?? 0,
        sex: input.sex ?? null,
        weight_lb: input.weightLb ?? 0,
        photo_url: input.photo ?? null,
        status: "stable",
        status_note: "New",
        recent_change: "Profile created",
        risk_watch: "Nothing flagged yet",
      })
      .select(PET_SELECT)
      .single();
    if (error) throw error;

    const conditions = (input.conditions ?? []).filter((c) => c.trim().length > 0);
    if (conditions.length > 0) {
      await supabase
        .from("pet_conditions")
        .insert(conditions.map((label) => ({ pet_id: (data as PetRow).id, label })));
    }
    return mapPet(data as PetRow);
  },

  async updatePet(id: string, patch: Partial<NewPetInput>): Promise<void> {
    const { error } = await supabase
      .from("pet_profiles")
      .update({
        name: patch.name,
        breed: patch.breed,
        age_years: patch.ageYears,
        weight_lb: patch.weightLb,
        sex: patch.sex,
        photo_url: patch.photo,
      })
      .eq("id", id);
    if (error) throw error;
  },

  async deletePet(id: string): Promise<void> {
    const { error } = await supabase.from("pet_profiles").delete().eq("id", id);
    if (error) throw error;
  },

  async getCareItems(petId: string): Promise<CareItem[]> {
    const { data, error } = await supabase
      .from("care_tasks")
      .select("*")
      .eq("pet_id", petId)
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      detail: r.detail ?? undefined,
      icon: r.icon as CareItem["icon"],
      done: r.done,
    }));
  },

  async setCareItemDone(itemId: string, done: boolean): Promise<void> {
    const { error } = await supabase.from("care_tasks").update({ done }).eq("id", itemId);
    if (error) throw error;
  },

  /** Seed Buddy / Luna / Milo for this user if they have no pets yet. */
  async ensureDemoData(): Promise<void> {
    const owner_id = requireUserId();
    const { count, error } = await supabase
      .from("pet_profiles")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) return;

    for (const pet of PETS) {
      const { data: created, error: petError } = await supabase
        .from("pet_profiles")
        .insert({
          owner_id,
          demo_key: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age_years: pet.ageYears,
          sex: pet.sex,
          weight_lb: pet.weightLb,
          photo_url: pet.photo,
          status: pet.status,
          status_note: pet.statusNote,
          recent_change: pet.recentChange,
          risk_watch: pet.riskWatch,
        })
        .select("id")
        .single();
      if (petError || !created) throw petError ?? new Error("seed failed");
      const petId = created.id;

      const conditions: TablesInsert<"pet_conditions">[] = pet.conditions.map((label) => ({
        pet_id: petId,
        label,
      }));
      const allergies: TablesInsert<"pet_allergies">[] = pet.allergies.map((label) => ({
        pet_id: petId,
        label,
      }));
      const care: TablesInsert<"care_tasks">[] = (CARE_ITEMS[pet.id] ?? []).map((c, i) => ({
        pet_id: petId,
        label: c.label,
        detail: c.detail ?? null,
        icon: c.icon,
        done: c.done,
        sort: i,
      }));
      const reminders: TablesInsert<"reminders">[] = (REMINDERS[pet.id] ?? []).map((r, i) => ({
        pet_id: petId,
        label: r.label,
        detail: r.detail,
        time_label: r.time,
        repeat: r.repeat,
        enabled: r.enabled,
        sort: i,
      }));
      const events: TablesInsert<"timeline_events">[] = (TIMELINE[pet.id] ?? []).map((t) => ({
        pet_id: petId,
        owner_id,
        category: t.category,
        title: t.title,
        detail: t.detail ?? null,
        value: t.value ?? null,
        urgency: t.urgency ?? null,
        event_date: t.date,
        event_time: t.time,
        source: "seed",
      }));

      const records: TablesInsert<"vet_records">[] = [];
      const medications: TablesInsert<"pet_medications">[] = [];
      const sectionMap = RECORDS[pet.id] ?? {};
      Object.entries(sectionMap).forEach(([category, items]) => {
        items.forEach((item, i) => {
          records.push({
            pet_id: petId,
            owner_id,
            category,
            title: item.title,
            subtitle: item.subtitle,
            record_date: item.date,
            status: item.status ?? null,
            sort: i,
          });
          if (category === "Medications") {
            medications.push({
              pet_id: petId,
              name: item.title,
              purpose: item.subtitle,
              refill_date: item.date,
              status: item.status ?? null,
            });
          }
        });
      });

      if (conditions.length) await supabase.from("pet_conditions").insert(conditions);
      if (allergies.length) await supabase.from("pet_allergies").insert(allergies);
      if (medications.length) await supabase.from("pet_medications").insert(medications);
      if (care.length) await supabase.from("care_tasks").insert(care);
      if (reminders.length) await supabase.from("reminders").insert(reminders);
      if (events.length) await supabase.from("timeline_events").insert(events);
      if (records.length) await supabase.from("vet_records").insert(records);
    }
  },
};
