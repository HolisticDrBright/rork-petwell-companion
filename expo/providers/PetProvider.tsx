import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import {
  ATTENTION_ITEMS,
  CARE_ITEMS,
  HEALTH_SIGNALS,
  PATTERN_CARDS,
  PETS,
  REMINDERS,
  SMART_INSIGHT,
  TIMELINE,
  TRENDS,
  UPCOMING,
} from "@/constants/mockData";
import type { AttentionItem, CareItem, HealthSignal, PatternCard, Pet, Reminder } from "@/types/pet";

const STORAGE_KEY = "petwell.state.v1";
const ONBOARD_KEY = "petwell.onboarded.v1";

interface PersistedState {
  selectedPetId: string;
  careDone: Record<string, string[]>;
  reminderState: Record<string, boolean>;
  premium: boolean;
}

const DEFAULT_STATE: PersistedState = {
  selectedPetId: PETS[0].id,
  careDone: {},
  reminderState: {},
  premium: false,
};

export const [PetProvider, usePets] = createContextHook(() => {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);

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
  const resolved = loaded ? { ...DEFAULT_STATE, ...stateQuery.data, ...state } : null;
  const current = resolved ?? DEFAULT_STATE;

  const persist = useCallback(async (next: PersistedState) => {
    setState(next);
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
      premium: current.premium,
      setPremium,
      completeOnboarding,
      trends: TRENDS[selectedPet.id],
      smartInsight: SMART_INSIGHT[selectedPet.id],
      insightCards: PATTERN_CARDS[selectedPet.id] ?? [],
      timeline: TIMELINE[selectedPet.id] ?? [],
      upcoming: UPCOMING[selectedPet.id] ?? [],
      attentionItems: ATTENTION_ITEMS[selectedPet.id] ?? [],
      healthSignals: HEALTH_SIGNALS[selectedPet.id] ?? [],
      patternCards: PATTERN_CARDS[selectedPet.id] ?? [],
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
      current.premium,
      setPremium,
      completeOnboarding,
    ]
  );
});
