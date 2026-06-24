import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
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
import type { CareItem, Pet, Reminder, TimelineEntry } from "@/types/pet";

const STORAGE_KEY = "petwell.state.v1";
const ONBOARD_KEY = "petwell.onboarded.v1";

interface PersistedState {
  selectedPetId: string;
  careDone: Record<string, string[]>; // petId -> done care item ids
  reminderState: Record<string, boolean>; // reminderId(petId+id) -> enabled
  logs: Record<string, TimelineEntry[]>; // petId -> user-added timeline entries (newest first)
  premium: boolean;
}

const DEFAULT_STATE: PersistedState = {
  selectedPetId: PETS[0].id,
  careDone: {},
  reminderState: {},
  logs: {},
  premium: false,
};

export const [PetProvider, usePets] = createContextHook(() => {
  // `local` holds the user's in-session edits. It stays null until the first
  // edit so that freshly-loaded persisted state wins on startup (initialising
  // it to DEFAULT_STATE would clobber what we just read from storage).
  const [local, setLocal] = useState<PersistedState | null>(null);

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

  const loaded = stateQuery.isSuccess;
  const current: PersistedState = local ?? stateQuery.data ?? DEFAULT_STATE;

  const persist = useCallback(async (next: PersistedState) => {
    setLocal(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write errors silently
    }
  }, []);

  const selectPet = useCallback(
    (id: string) => {
      persist({ ...current, selectedPetId: id });
    },
    [current, persist]
  );

  const toggleCareItem = useCallback(
    (petId: string, itemId: string) => {
      const base = CARE_ITEMS[petId] ?? [];
      const initialDone = base.filter((c) => c.done).map((c) => c.id);
      const currentList = current.careDone[petId] ?? initialDone;
      const nextList = currentList.includes(itemId)
        ? currentList.filter((id) => id !== itemId)
        : [...currentList, itemId];
      persist({
        ...current,
        careDone: { ...current.careDone, [petId]: nextList },
      });
    },
    [current, persist]
  );

  const toggleReminder = useCallback(
    (key: string, value: boolean) => {
      persist({
        ...current,
        reminderState: { ...current.reminderState, [key]: value },
      });
    },
    [current, persist]
  );

  const addLog = useCallback(
    (petId: string, entry: TimelineEntry) => {
      const prev = current.logs[petId] ?? [];
      persist({
        ...current,
        logs: { ...current.logs, [petId]: [entry, ...prev] },
      });
    },
    [current, persist]
  );

  const setPremium = useCallback(
    (value: boolean) => {
      persist({ ...current, premium: value });
    },
    [current, persist]
  );

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, "true");
      await onboardQuery.refetch();
    } catch {
      // ignore
    }
  }, [onboardQuery]);

  const selectedPet: Pet = useMemo(
    () => PETS.find((p) => p.id === current.selectedPetId) ?? PETS[0],
    [current.selectedPetId]
  );

  const careItems: CareItem[] = useMemo(() => {
    const base = CARE_ITEMS[selectedPet.id] ?? [];
    const override = current.careDone[selectedPet.id];
    if (!override) return base;
    return base.map((c) => ({ ...c, done: override.includes(c.id) }));
  }, [selectedPet.id, current.careDone]);

  const reminders: Reminder[] = useMemo(() => {
    const base = REMINDERS[selectedPet.id] ?? [];
    return base.map((r) => {
      const key = `${selectedPet.id}:${r.id}`;
      const override = current.reminderState[key];
      return override === undefined ? r : { ...r, enabled: override };
    });
  }, [selectedPet.id, current.reminderState]);

  // User-added logs (newest first) merged ahead of the seeded timeline so the
  // closed-loop care story is visible: log something, see it land instantly.
  const timeline: TimelineEntry[] = useMemo(() => {
    const base = TIMELINE[selectedPet.id] ?? [];
    const extra = current.logs[selectedPet.id] ?? [];
    return [...extra, ...base];
  }, [selectedPet.id, current.logs]);

  return useMemo(
    () => ({
      isLoading: !loaded || onboardQuery.isLoading,
      onboarded: onboardQuery.data ?? false,
      pets: PETS,
      selectedPet,
      selectPet,
      careItems,
      toggleCareItem,
      reminders,
      toggleReminder,
      addLog,
      todayIso: TODAY_ISO,
      premium: current.premium,
      setPremium,
      completeOnboarding,
      trends: TRENDS[selectedPet.id],
      smartInsight: SMART_INSIGHT[selectedPet.id],
      insightCards: INSIGHT_CARDS[selectedPet.id] ?? [],
      timeline,
      upcoming: UPCOMING[selectedPet.id] ?? [],
    }),
    [
      loaded,
      onboardQuery.isLoading,
      onboardQuery.data,
      selectedPet,
      selectPet,
      careItems,
      toggleCareItem,
      reminders,
      toggleReminder,
      addLog,
      current.premium,
      setPremium,
      completeOnboarding,
      timeline,
    ]
  );
});
