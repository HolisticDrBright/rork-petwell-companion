import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

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
  subscribeBackend,
  signInWithEmail,
  signOutToAnonymous,
  signUpWithEmail,
  type AuthResult,
} from "@/lib/backend";
import { config } from "@/lib/config";
import { trendsFromLogs } from "@/lib/health/trends";
import { shouldShowDemoData } from "@/lib/dataMode";
import { resolveSelectedPet } from "@/lib/pets/select";
import { clampAge, clampWeight } from "@/lib/petValidation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
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
  const [authInfo, setAuthInfo] = useState(getAuthInfo);
  const previousIdentity = useRef(authInfo.userId);
  useEffect(() => {
    const sync = () => {
      const next = getAuthInfo();
      if (previousIdentity.current !== next.userId) {
        previousIdentity.current = next.userId;
        const remoteQueries = { predicate: (q: { queryKey: readonly unknown[] }) => !["petwell-state", "petwell-onboarded", "backend-init"].includes(String(q.queryKey[0])) };
        void queryClient.cancelQueries(remoteQueries);
        queryClient.removeQueries(remoteQueries);
      }
      setAuthInfo((prev) => prev.userId === next.userId && prev.email === next.email && prev.isAnonymous === next.isAnonymous ? prev : next);
    };
    const unsubscribe = subscribeBackend(sync);
    sync();
    return unsubscribe;
  }, [queryClient]);
  const remoteMode = !!authInfo.userId;

  const petsQuery = useQuery({
    queryKey: ["pets", authInfo.userId],
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

  // Serialize disk writes and publish only after storage succeeds. A failed
  // write must never look saved or clobber a later write.
  const persistedRef = useRef<PersistedState | null>(null);
  const writeQueue = useRef(Promise.resolve());
  const persist = useCallback((updater: (prev: PersistedState) => PersistedState): Promise<void> => {
    const write = writeQueue.current.catch(() => {}).then(async () => {
      const next = updater(persistedRef.current ?? stateQuery.data ?? DEFAULT_STATE);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistedRef.current = next;
      setLocal(next);
    });
    writeQueue.current = write;
    return write;
  }, [stateQuery.data]);

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
      void persist((prev) => ({ ...prev, selectedPetId: id })).catch(() => Alert.alert("Could not save selection", "Please try again."));
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
      void persist((prev) => {
        const currentList = prev.careDone[pid] ?? initialDone;
        const nextList = currentList.includes(itemId)
          ? currentList.filter((id) => id !== itemId)
          : [...currentList, itemId];
        return { ...prev, careDone: { ...prev.careDone, [pid]: nextList } };
      }).catch(() => Alert.alert("Could not save care update", "Please try again."));
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
      void persist((prev) => ({ ...prev, reminderState: { ...prev.reminderState, [key]: value } })).catch(() => Alert.alert("Could not save reminder", "Please try again."));
    },
    [remoteMode, queryClient, petId, persist]
  );

  const addLog = useCallback(async (pid: string, entry: TimelineEntry, food?: { label: string; productId?: string; foodScanId?: string }): Promise<void> => {
    if (remoteMode) {
      const saved = await timelineService.addEvent(pid, {
        category: entry.category, title: entry.title, detail: entry.detail,
        value: entry.value, urgency: entry.urgency, date: entry.date,
        time: entry.time, source: "manual", imagePath: entry.imagePath, food,
      });
      queryClient.setQueryData(["timeline", pid], (old: TimelineEntry[] = []) => [saved, ...old.filter(e => e.id !== saved.id)]);
      void queryClient.invalidateQueries({ queryKey: ["timeline", pid] });
      return;
    }
    if (config.isProduction) throw new Error("Sign in before saving a log. Your entry has not been saved.");
    await persist(prev => ({ ...prev, logs: { ...prev.logs, [pid]: [entry, ...(prev.logs[pid] ?? [])] } }));
  }, [remoteMode, queryClient, persist]);

  const addPet = useCallback(
    async (input: NewPetInput): Promise<Pet | null> => {
      if (remoteMode) {
        const pet = await petsService.createPet(input);
        queryClient.setQueryData(["pets", getUserId()], (old: Pet[] = []) => [...old.filter(p => p.id !== pet.id), pet]);
        // Selection is a preference; a failed preference write must not report
        // the successfully-created cloud pet as a failed save.
        await persist(prev => ({ ...prev, selectedPetId: pet.id })).catch(() => {});
        void queryClient.invalidateQueries({ queryKey: ["pets"] });
        return pet;
      }
      if (config.isProduction) throw new Error("Sign in before saving a pet. Your details have not been saved.");
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
      await persist((prev) => ({
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

  // Keep legacy device-only data intact. Automatic best-effort migration
  // used to delete the local originals even when an upload failed.
  const refreshAfterAuth = useCallback(async () => {
    setAuthInfo(getAuthInfo());
    await queryClient.invalidateQueries({ queryKey: ["pets"] });
  }, [queryClient]);

  const clearDeviceData = useCallback(async () => {
    await writeQueue.current.catch(() => {});
    const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith("petwell."));
    await AsyncStorage.multiRemove(keys);
    persistedRef.current = DEFAULT_STATE;
    setLocal(DEFAULT_STATE);
    queryClient.clear();
  }, [queryClient]);

  const signUp = useCallback(
    async (email: string, password: string, emailRedirectTo?: string): Promise<AuthResult> => {
      const res = await signUpWithEmail(email, password, emailRedirectTo);
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
    setAuthInfo(a);
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const setPremium = useCallback(
    (value: boolean) => {
      void persist((prev) => ({ ...prev, premium: value })).catch(() => console.warn("[petwell] Could not cache subscription status"));
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
      // Publish the new value to the cache SYNCHRONOUSLY before anyone
      // navigates. A refetch alone resolves a tick too late: the Today screen
      // mounts, still reads onboarded=false, and redirects straight back to
      // onboarding — which restarts it at step 1 and traps the user in a loop
      // that only a full app restart escapes.
      queryClient.setQueryData(["petwell-onboarded"], true);
      await onboardQuery.refetch();
    } catch {
      // ignore
    }
  }, [onboardQuery, queryClient]);

  const derived = useMemo(
    () => ({
      trends: (trendKey ? TRENDS[trendKey] : undefined) ?? trendsFromLogs(timeline),
      smartInsight:
        (trendKey ? SMART_INSIGHT[trendKey] : undefined) ??
        "Keep logging meals, symptoms, and activity — Petwell will surface patterns here as data builds.",
      insightCards: (trendKey ? INSIGHT_CARDS[trendKey] : undefined) ?? EMPTY_INSIGHTS,
      upcoming: (trendKey ? UPCOMING[trendKey] : undefined) ?? [],
    }),
    [trendKey, timeline]
  );

  return useMemo(
    () => ({
      isLoading: !loaded || onboardQuery.isLoading || backendQuery.isPending,
      // `backendReady` = the pet source has settled (remote list loaded / local
      // state loaded). Distinct from `hasPets` so the first-pet gate can tell
      // "still loading" apart from "genuinely no pets".
      backendReady,
      hasPets,
      // The pet list itself failed to load (usually: no connection). Distinct
      // from "still loading" so the tab shell can offer a retry instead of
      // spinning forever.
      petsFailed: remoteMode && petsQuery.isError,
      retryPets: () => void petsQuery.refetch(),
      // The timeline failed to load. Screens derived from it (timeline,
      // patterns, health score) MUST check this: an empty array from a failed
      // request looks exactly like a pet with no logs, and saying "no patterns"
      // or scoring a pet on data we never received is a false statement about
      // their animal's health.
      timelineFailed: remoteMode && timelineQuery.isError,
      timelineLoading: remoteMode && timelineQuery.isPending && petQueriesEnabled,
      retryTimeline: () => void timelineQuery.refetch(),
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
      todayIso: shouldShowDemoData && selectedPet && (selectedPet.demoKey || PETS.some(p => p.id === selectedPet.id)) ? TODAY_ISO : new Date().toISOString().slice(0, 10),
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
      canUseAuth: isSupabaseConfigured && config.useApi,
      requiresSignIn: config.isProduction && !remoteMode,
      clearDeviceData,
      hasDeviceData: persisted.extraPets.length > 0,
      deviceData: persisted,
      signUp,
      signIn,
      signOut,
    }),
    [
      loaded,
      backendQuery.isPending,
      clearDeviceData,
      persisted,
      backendReady,
      hasPets,
      petsQuery,
      timelineQuery,
      petQueriesEnabled,
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
