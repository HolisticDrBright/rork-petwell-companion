import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  CARE_ITEMS,
  INSIGHT_CARDS,
  PETS,
  REMINDERS,
  SMART_INSIGHT,
  TIMELINE,
  TODAY_ISO,
  TRENDS,
  UPCOMING,
} from "@/constants/mockData";
import { getUserId, initBackend } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import {
  petsService,
  remindersService,
  timelineService,
  type NewPetInput,
} from "@/services";
import type { CareItem, Pet, Reminder, TimelineEntry } from "@/types/pet";

const STORAGE_KEY = "petwell.state.v1";
const ONBOARD_KEY = "petwell.onboarded.v1";

interface PersistedState {
  selectedPetId: string;
  careDone: Record<string, string[]>;
  reminderState: Record<string, boolean>;
  logs: Record<string, TimelineEntry[]>;
  premium: boolean;
}

const DEFAULT_STATE: PersistedState = {
  selectedPetId: PETS[0].id,
  careDone: {},
  reminderState: {},
  logs: {},
  premium: false,
};

const EMPTY_INSIGHTS: { type: "pattern" | "progress" | "attention"; title: string; body: string }[] = [];

function defaultTrends(weightLb: number): Record<string, number[]> {
  const w = weightLb || 10;
  return {
    appetite: [7, 7, 7, 7, 7, 7, 7],
    stool: [6, 6, 6, 6, 6, 6, 6],
    itching: [1, 1, 1, 1, 1, 1, 1],
    activity: [6, 6, 6, 6, 6, 6, 6],
    weight: [w, w, w, w, w, w, w],
  };
}

export const [PetProvider, usePets] = createContextHook(() => {
  const queryClient = useQueryClient();

  // Local UI prefs (selected pet, premium) + offline fallback data.
  const [local, setLocal] = useState<PersistedState | null>(null);
  const [extraPets, setExtraPets] = useState<Pet[]>([]);

  const stateQuery = useQuery({
    queryKey: ["petwell-state"],
    queryFn: async (): Promise<PersistedState> => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE;
      try {
        return { ...DEFAULT_STATE, ...(JSON.parse(raw) as PersistedState) };
      } catch {
        return DEFAULT_STATE;
      }
    },
  });

  const onboardQuery = useQuery({
    queryKey: ["petwell-onboarded"],
    queryFn: async (): Promise<boolean> => {
      const raw = await AsyncStorage.getItem(ONBOARD_KEY);
      return raw === "true";
    },
  });

  // Establish the backend once; seed demo pets for this user when remote.
  const backendQuery = useQuery({
    queryKey: ["backend-init"],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await initBackend();
      if (res.mode === "remote") {
        try {
          await petsService.ensureDemoData();
        } catch (e) {
          console.warn("[petwell] demo seed skipped:", e);
        }
      }
      return res;
    },
  });
  const remoteMode = backendQuery.data?.mode === "remote";

  const petsQuery = useQuery({
    queryKey: ["pets"],
    enabled: remoteMode,
    queryFn: () => petsService.listPets(),
  });
  const remoteReady = remoteMode && petsQuery.isSuccess && (petsQuery.data?.length ?? 0) > 0;

  const loaded = stateQuery.isSuccess;
  const persisted: PersistedState = local ?? stateQuery.data ?? DEFAULT_STATE;

  const persist = useCallback(async (next: PersistedState) => {
    setLocal(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write errors
    }
  }, []);

  const pets: Pet[] = useMemo(
    () => (remoteReady ? (petsQuery.data as Pet[]) : [...PETS, ...extraPets]),
    [remoteReady, petsQuery.data, extraPets]
  );

  const selectedPet: Pet = useMemo(() => {
    const id = persisted.selectedPetId;
    return (
      pets.find((p) => p.id === id) ??
      pets.find((p) => p.demoKey === id) ??
      pets[0]
    );
  }, [pets, persisted.selectedPetId]);

  const petId = selectedPet.id;
  const trendKey = selectedPet.demoKey ?? selectedPet.id;

  // Remote per-pet data (disabled in local mode).
  const careQuery = useQuery({
    queryKey: ["care", petId],
    enabled: remoteReady && !!petId,
    queryFn: () => petsService.getCareItems(petId),
  });
  const remindersQuery = useQuery({
    queryKey: ["reminders", petId],
    enabled: remoteReady && !!petId,
    queryFn: () => remindersService.listReminders(petId),
  });
  const timelineQuery = useQuery({
    queryKey: ["timeline", petId],
    enabled: remoteReady && !!petId,
    queryFn: () => timelineService.listEvents(petId),
  });

  const careItems: CareItem[] = useMemo(() => {
    if (remoteReady) return careQuery.data ?? [];
    const base = CARE_ITEMS[selectedPet.id] ?? [];
    const override = persisted.careDone[selectedPet.id];
    return override ? base.map((c) => ({ ...c, done: override.includes(c.id) })) : base;
  }, [remoteReady, careQuery.data, selectedPet.id, persisted.careDone]);

  const reminders: Reminder[] = useMemo(() => {
    if (remoteReady) return remindersQuery.data ?? [];
    const base = REMINDERS[selectedPet.id] ?? [];
    return base.map((r) => {
      const override = persisted.reminderState[`${selectedPet.id}:${r.id}`];
      return override === undefined ? r : { ...r, enabled: override };
    });
  }, [remoteReady, remindersQuery.data, selectedPet.id, persisted.reminderState]);

  const timeline: TimelineEntry[] = useMemo(() => {
    if (remoteReady) return timelineQuery.data ?? [];
    const base = TIMELINE[selectedPet.id] ?? [];
    const extra = persisted.logs[selectedPet.id] ?? [];
    return [...extra, ...base];
  }, [remoteReady, timelineQuery.data, selectedPet.id, persisted.logs]);

  const selectPet = useCallback(
    (id: string) => {
      persist({ ...persisted, selectedPetId: id });
    },
    [persisted, persist]
  );

  const toggleCareItem = useCallback(
    (pid: string, itemId: string) => {
      if (remoteReady) {
        const list = (queryClient.getQueryData(["care", pid]) as CareItem[] | undefined) ?? careItems;
        const item = list.find((c) => c.id === itemId);
        const next = !(item?.done ?? false);
        queryClient.setQueryData(["care", pid], (old: CareItem[] = list) =>
          old.map((c) => (c.id === itemId ? { ...c, done: next } : c))
        );
        petsService
          .setCareItemDone(itemId, next)
          .catch((e) => console.warn("[petwell] care toggle failed:", e))
          .finally(() => queryClient.invalidateQueries({ queryKey: ["care", pid] }));
        return;
      }
      const base = CARE_ITEMS[pid] ?? [];
      const initialDone = base.filter((c) => c.done).map((c) => c.id);
      const currentList = persisted.careDone[pid] ?? initialDone;
      const nextList = currentList.includes(itemId)
        ? currentList.filter((id) => id !== itemId)
        : [...currentList, itemId];
      persist({ ...persisted, careDone: { ...persisted.careDone, [pid]: nextList } });
    },
    [remoteReady, queryClient, careItems, persisted, persist]
  );

  const toggleReminder = useCallback(
    (key: string, value: boolean) => {
      if (remoteReady) {
        const reminderId = key.includes(":") ? key.split(":")[1] : key;
        queryClient.setQueryData(["reminders", petId], (old: Reminder[] = []) =>
          old.map((r) => (r.id === reminderId ? { ...r, enabled: value } : r))
        );
        remindersService
          .setEnabled(reminderId, value)
          .catch((e) => console.warn("[petwell] reminder toggle failed:", e))
          .finally(() => queryClient.invalidateQueries({ queryKey: ["reminders", petId] }));
        return;
      }
      persist({ ...persisted, reminderState: { ...persisted.reminderState, [key]: value } });
    },
    [remoteReady, queryClient, petId, persisted, persist]
  );

  const addLog = useCallback(
    (pid: string, entry: TimelineEntry) => {
      if (remoteReady) {
        queryClient.setQueryData(["timeline", pid], (old: TimelineEntry[] = []) => [entry, ...old]);
        timelineService
          .addEvent(pid, {
            category: entry.category,
            title: entry.title,
            detail: entry.detail,
            value: entry.value,
            urgency: entry.urgency,
            date: entry.date,
            time: entry.time,
            source: "manual",
          })
          .catch((e) => console.warn("[petwell] log failed:", e))
          .finally(() => queryClient.invalidateQueries({ queryKey: ["timeline", pid] }));
        return;
      }
      persist({ ...persisted, logs: { ...persisted.logs, [pid]: [entry, ...(persisted.logs[pid] ?? [])] } });
    },
    [remoteReady, queryClient, persisted, persist]
  );

  const addPet = useCallback(
    async (input: NewPetInput): Promise<Pet | null> => {
      if (remoteMode) {
        try {
          const pet = await petsService.createPet(input);
          await queryClient.invalidateQueries({ queryKey: ["pets"] });
          await persist({ ...persisted, selectedPetId: pet.id });
          return pet;
        } catch (e) {
          console.warn("[petwell] create pet failed:", e);
          return null;
        }
      }
      const localPet: Pet = {
        id: `local-${Date.now()}`,
        name: input.name,
        species: input.species,
        breed: input.breed ?? "",
        ageYears: input.ageYears ?? 0,
        sex: input.sex ?? "male",
        weightLb: input.weightLb ?? 0,
        photo: input.photo ?? "",
        status: "stable",
        statusNote: "New",
        recentChange: "Profile created",
        riskWatch: "Nothing flagged yet",
        conditions: input.conditions ?? [],
        allergies: [],
      };
      setExtraPets((prev) => [...prev, localPet]);
      await persist({ ...persisted, selectedPetId: localPet.id });
      return localPet;
    },
    [remoteMode, queryClient, persisted, persist]
  );

  const setPremium = useCallback(
    (value: boolean) => {
      persist({ ...persisted, premium: value });
      const uid = getUserId();
      if (remoteMode && uid) {
        supabase
          .from("profiles")
          .update({ premium: value })
          .eq("id", uid)
          .then(({ error }) => {
            if (error) console.warn("[petwell] premium sync failed:", error.message);
          });
      }
    },
    [persisted, persist, remoteMode]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, "true");
      await onboardQuery.refetch();
    } catch {
      // ignore
    }
  }, [onboardQuery]);

  const derived = useMemo(
    () => ({
      trends: TRENDS[trendKey] ?? defaultTrends(selectedPet.weightLb),
      smartInsight:
        SMART_INSIGHT[trendKey] ??
        "Keep logging meals, symptoms, and activity — Petwell will surface patterns here as data builds.",
      insightCards: INSIGHT_CARDS[trendKey] ?? EMPTY_INSIGHTS,
      upcoming: UPCOMING[trendKey] ?? [],
    }),
    [trendKey, selectedPet.weightLb]
  );

  return useMemo(
    () => ({
      isLoading: !loaded || onboardQuery.isLoading,
      mode: remoteReady ? ("remote" as const) : ("local" as const),
      onboarded: onboardQuery.data ?? false,
      pets,
      selectedPet,
      selectPet,
      addPet,
      careItems,
      toggleCareItem,
      reminders,
      toggleReminder,
      addLog,
      todayIso: TODAY_ISO,
      premium: persisted.premium,
      setPremium,
      completeOnboarding,
      trends: derived.trends,
      smartInsight: derived.smartInsight,
      insightCards: derived.insightCards,
      timeline,
      upcoming: derived.upcoming,
    }),
    [
      loaded,
      remoteReady,
      onboardQuery.isLoading,
      onboardQuery.data,
      pets,
      selectedPet,
      selectPet,
      addPet,
      careItems,
      toggleCareItem,
      reminders,
      toggleReminder,
      addLog,
      persisted.premium,
      setPremium,
      completeOnboarding,
      derived,
      timeline,
    ]
  );
});
