import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import {
  getAuthInfo,
  getUserId,
  initBackend,
  signInWithEmail,
  signOutToAnonymous,
  signUpWithEmail,
  type AuthResult,
} from "@/lib/backend";
import { shouldShowDemoData } from "@/lib/dataMode";
import { resolveSelectedPet } from "@/lib/pets/select";
import { clampAge, clampWeight } from "@/lib/petValidation";
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
  /** Pets the user created in local mode — persisted so they survive reloads. */
  extraPets: Pet[];
  premium: boolean;
}

const DEFAULT_STATE: PersistedState = {
  selectedPetId: PETS[0].id,
  careDone: {},
  reminderState: {},
  logs: {},
  extraPets: [],
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
      // Auto-seed demo pets ONLY in dev/demo mode. Production users start with the
      // add-pet flow (or the explicit "Try demo profile" action in Settings).
      if (res.mode === "remote" && shouldShowDemoData) {
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

  // Backend readiness is SEPARATE from "has at least one pet". A real remote user
  // can legitimately have zero pets (production no longer auto-seeds demo pets),
  // so we must not conflate the two — doing so used to flip a real account into
  // "local" mode and crash on the missing pet. `backendReady` means "the pet
  // source has settled" (remote list loaded, or local state loaded).
  const backendReady = remoteMode ? petsQuery.isSuccess : stateQuery.isSuccess;

  const loaded = stateQuery.isSuccess;
  const persisted: PersistedState = local ?? stateQuery.data ?? DEFAULT_STATE;

  // Functional persist: each write computes from the latest committed state, so
  // two mutations in the same tick can't clobber each other (lost-update race).
  const persist = useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      setLocal((prev) => {
        const base = prev ?? stateQuery.data ?? DEFAULT_STATE;
        const next = updater(base);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [stateQuery.data]
  );

  // Remote pets in remote mode; otherwise the local set. Demo pets (PETS) are
  // only included in dev/demo mode — production never shows mock pets, only the
  // user's own (extraPets), so a brand-new or offline production app is genuinely
  // empty (→ first-pet flow), not fake.
  const pets: Pet[] = useMemo(
    () =>
      remoteMode
        ? (petsQuery.data ?? [])
        : shouldShowDemoData
          ? [...PETS, ...persisted.extraPets]
          : persisted.extraPets,
    [remoteMode, petsQuery.data, persisted.extraPets]
  );

  const hasPets = pets.length > 0;

  // `null` when there are no pets yet — every consumer must handle that. The
  // first-pet gate (app/(tabs)/_layout) keeps pet screens from mounting until
  // a pet exists, but the type stays honest.
  const selectedPet: Pet | null = useMemo(
    () => resolveSelectedPet(pets, persisted.selectedPetId),
    [pets, persisted.selectedPetId]
  );

  const petId = selectedPet?.id ?? null;
  const trendKey = selectedPet?.demoKey ?? selectedPet?.id ?? null;

  // Remote per-pet data — only when remote AND a pet is selected. No pet ⇒ the
  // queries stay disabled, so nothing fetches with a null id.
  const petQueriesEnabled = remoteMode && !!petId;
  const careQuery = useQuery({
    queryKey: ["care", petId],
    enabled: petQueriesEnabled,
    queryFn: () => petsService.getCareItems(petId as string),
  });
  const remindersQuery = useQuery({
    queryKey: ["reminders", petId],
    enabled: petQueriesEnabled,
    queryFn: () => remindersService.listReminders(petId as string),
  });
  const timelineQuery = useQuery({
    queryKey: ["timeline", petId],
    enabled: petQueriesEnabled,
    queryFn: () => timelineService.listEvents(petId as string),
  });

  const careItems: CareItem[] = useMemo(() => {
    if (remoteMode) return careQuery.data ?? [];
    if (!selectedPet) return [];
    const base = CARE_ITEMS[selectedPet.id] ?? [];
    const override = persisted.careDone[selectedPet.id];
    return override ? base.map((c) => ({ ...c, done: override.includes(c.id) })) : base;
  }, [remoteMode, careQuery.data, selectedPet, persisted.careDone]);

  const reminders: Reminder[] = useMemo(() => {
    if (remoteMode) return remindersQuery.data ?? [];
    if (!selectedPet) return [];
    const base = REMINDERS[selectedPet.id] ?? [];
    return base.map((r) => {
      const override = persisted.reminderState[`${selectedPet.id}:${r.id}`];
      return override === undefined ? r : { ...r, enabled: override };
    });
  }, [remoteMode, remindersQuery.data, selectedPet, persisted.reminderState]);

  const timeline: TimelineEntry[] = useMemo(() => {
    if (remoteMode) return timelineQuery.data ?? [];
    if (!selectedPet) return [];
    const base = TIMELINE[selectedPet.id] ?? [];
    const extra = persisted.logs[selectedPet.id] ?? [];
    return [...extra, ...base];
  }, [remoteMode, timelineQuery.data, selectedPet, persisted.logs]);

  const selectPet = useCallback(
    (id: string) => {
      persist((prev) => ({ ...prev, selectedPetId: id }));
    },
    [persist]
  );

  const toggleCareItem = useCallback(
    (pid: string, itemId: string) => {
      if (remoteMode) {
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
      persist((prev) => {
        const currentList = prev.careDone[pid] ?? initialDone;
        const nextList = currentList.includes(itemId)
          ? currentList.filter((id) => id !== itemId)
          : [...currentList, itemId];
        return { ...prev, careDone: { ...prev.careDone, [pid]: nextList } };
      });
    },
    [remoteMode, queryClient, careItems, persist]
  );

  const toggleReminder = useCallback(
    (key: string, value: boolean) => {
      if (remoteMode) {
        // key is `${petId}:${reminderId}` — target the cache by the pet in the
        // key, not the currently-selected pet.
        const [keyPid, keyReminderId] = key.includes(":") ? key.split(":") : [petId, key];
        queryClient.setQueryData(["reminders", keyPid], (old: Reminder[] = []) =>
          old.map((r) => (r.id === keyReminderId ? { ...r, enabled: value } : r))
        );
        remindersService
          .setEnabled(keyReminderId, value)
          .catch((e) => console.warn("[petwell] reminder toggle failed:", e))
          .finally(() => queryClient.invalidateQueries({ queryKey: ["reminders", keyPid] }));
        return;
      }
      persist((prev) => ({ ...prev, reminderState: { ...prev.reminderState, [key]: value } }));
    },
    [remoteMode, queryClient, petId, persist]
  );

  const addLog = useCallback(
    (pid: string, entry: TimelineEntry) => {
      if (remoteMode) {
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
            imagePath: entry.imagePath,
          })
          .catch((e) => console.warn("[petwell] log failed:", e))
          .finally(() => queryClient.invalidateQueries({ queryKey: ["timeline", pid] }));
        return;
      }
      persist((prev) => ({ ...prev, logs: { ...prev.logs, [pid]: [entry, ...(prev.logs[pid] ?? [])] } }));
    },
    [remoteMode, queryClient, persist]
  );

  const addPet = useCallback(
    async (input: NewPetInput): Promise<Pet | null> => {
      if (remoteMode) {
        try {
          const pet = await petsService.createPet(input);
          await queryClient.invalidateQueries({ queryKey: ["pets"] });
          persist((prev) => ({ ...prev, selectedPetId: pet.id }));
          return pet;
        } catch (e) {
          console.warn("[petwell] create pet failed:", e);
          return null;
        }
      }
      const localPet: Pet = {
        id: `local-${Date.now()}`,
        name: input.name.trim() || "New pet",
        species: input.species,
        breed: input.breed ?? "",
        ageYears: clampAge(input.ageYears),
        sex: input.sex ?? "male",
        weightLb: clampWeight(input.weightLb),
        photo: input.photo ?? "",
        status: "stable",
        statusNote: "New",
        recentChange: "Profile created",
        riskWatch: "Nothing flagged yet",
        conditions: input.conditions ?? [],
        allergies: [],
      };
      persist((prev) => ({
        ...prev,
        extraPets: [...prev.extraPets, localPet],
        selectedPetId: localPet.id,
      }));
      return localPet;
    },
    [remoteMode, queryClient, persist]
  );

  // Explicit "Try demo profile" — seeds Buddy/Luna/Milo on demand (after a user
  // action) even in production, so the app can be tried without real data. The
  // seeded pets carry demo_key and are labeled DEMO in the UI.
  const loadDemoProfile = useCallback(async (): Promise<boolean> => {
    if (!remoteMode) return false;
    try {
      await petsService.ensureDemoData();
      await queryClient.invalidateQueries({ queryKey: ["pets"] });
      return true;
    } catch (e) {
      console.warn("[petwell] load demo profile failed:", e);
      return false;
    }
  }, [remoteMode, queryClient]);

  // ── Auth (email + password) ──
  const [authInfo, setAuthInfo] = useState<{ email: string | null; isAnonymous: boolean }>({
    email: null,
    isAnonymous: true,
  });

  useEffect(() => {
    const a = getAuthInfo();
    setAuthInfo({ email: a.email, isAnonymous: a.isAnonymous });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      const email = u?.email ?? null;
      const isAnonymous = u?.is_anonymous ?? !u?.email;
      // Keep the same object reference when nothing changed (e.g. hourly token
      // refresh) so consumers don't re-render needlessly.
      setAuthInfo((prev) => (prev.email === email && prev.isAnonymous === isAnonymous ? prev : { email, isAnonymous }));
    });
    return () => sub.subscription.unsubscribe();
  }, [backendQuery.data?.mode]);

  /** Best-effort: upload locally-created pets to the account on first auth. */
  const migrateLocalPets = useCallback(async () => {
    if (!remoteMode) return;
    const base = local ?? stateQuery.data ?? DEFAULT_STATE;
    if (base.extraPets.length === 0) return;
    for (const p of base.extraPets) {
      try {
        await petsService.createPet({
          name: p.name,
          species: p.species,
          breed: p.breed,
          ageYears: p.ageYears,
          weightLb: p.weightLb,
          photo: p.photo || undefined,
          conditions: p.conditions,
        });
      } catch (e) {
        console.warn("[petwell] pet migration skipped:", e);
      }
    }
    persist((prev) => ({ ...prev, extraPets: [] }));
    await queryClient.invalidateQueries({ queryKey: ["pets"] });
  }, [remoteMode, local, stateQuery.data, persist, queryClient]);

  const refreshAfterAuth = useCallback(async () => {
    const a = getAuthInfo();
    setAuthInfo({ email: a.email, isAnonymous: a.isAnonymous });
    await migrateLocalPets();
    await queryClient.invalidateQueries();
  }, [migrateLocalPets, queryClient]);

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const res = await signUpWithEmail(email, password);
      if (res.ok) await refreshAfterAuth();
      return res;
    },
    [refreshAfterAuth]
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const res = await signInWithEmail(email, password);
      if (res.ok) await refreshAfterAuth();
      return res;
    },
    [refreshAfterAuth]
  );

  const signOut = useCallback(async () => {
    await signOutToAnonymous();
    const a = getAuthInfo();
    setAuthInfo({ email: a.email, isAnonymous: a.isAnonymous });
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const setPremium = useCallback(
    (value: boolean) => {
      persist((prev) => ({ ...prev, premium: value }));
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
    [persist, remoteMode]
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
      trends: (trendKey ? TRENDS[trendKey] : undefined) ?? defaultTrends(selectedPet?.weightLb ?? 0),
      smartInsight:
        (trendKey ? SMART_INSIGHT[trendKey] : undefined) ??
        "Keep logging meals, symptoms, and activity — Petwell will surface patterns here as data builds.",
      insightCards: (trendKey ? INSIGHT_CARDS[trendKey] : undefined) ?? EMPTY_INSIGHTS,
      upcoming: (trendKey ? UPCOMING[trendKey] : undefined) ?? [],
    }),
    [trendKey, selectedPet?.weightLb]
  );

  return useMemo(
    () => ({
      isLoading: !loaded || onboardQuery.isLoading,
      // `backendReady` = the pet source has settled (remote list loaded / local
      // state loaded). Distinct from `hasPets` so the first-pet gate can tell
      // "still loading" apart from "genuinely no pets".
      backendReady,
      hasPets,
      mode: remoteMode ? ("remote" as const) : ("local" as const),
      onboarded: onboardQuery.data ?? false,
      pets,
      selectedPet,
      selectPet,
      addPet,
      loadDemoProfile,
      careItems,
      toggleCareItem,
      reminders,
      toggleReminder,
      addLog,
      // Real "today" in production; the fixed demo date only in dev/demo mode so
      // sample data lines up. Never ship 2026-06-25 as "today" to real users.
      todayIso: shouldShowDemoData ? TODAY_ISO : new Date().toISOString().slice(0, 10),
      premium: persisted.premium,
      setPremium,
      completeOnboarding,
      trends: derived.trends,
      smartInsight: derived.smartInsight,
      insightCards: derived.insightCards,
      timeline,
      upcoming: derived.upcoming,
      // Auth
      authEmail: authInfo.email,
      isAuthenticated: remoteMode && !authInfo.isAnonymous && !!authInfo.email,
      canUseAuth: remoteMode,
      signUp,
      signIn,
      signOut,
    }),
    [
      loaded,
      backendReady,
      hasPets,
      onboardQuery.isLoading,
      onboardQuery.data,
      pets,
      selectedPet,
      selectPet,
      addPet,
      loadDemoProfile,
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
      authInfo,
      remoteMode,
      signUp,
      signIn,
      signOut,
    ]
  );
});
