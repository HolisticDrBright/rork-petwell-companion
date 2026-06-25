import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { programById, summarizeProgress, type ProgramProgress } from "@/lib/integrative/programs";

/**
 * Local-first persistence for Progress Programs. Runs are stored in AsyncStorage
 * so a program can be started, logged daily, and summarized fully offline. (Remote
 * sync is best-effort and layered on top via the integrative service.)
 */

const KEY = "petwell.programs.v1";

export interface ProgramRun {
  id: string;
  petId: string;
  templateId: string;
  startedAt: string; // ISO date
  status: "active" | "completed" | "stopped";
  loggedDays: number[]; // 1-based day indices that have been logged
  lastLoggedAt?: string;
}

async function loadAll(): Promise<ProgramRun[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProgramRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(runs: ProgramRun[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // best-effort
  }
}

export interface ProgramRunView extends ProgramRun {
  progress: ProgramProgress;
}

function withProgress(run: ProgramRun): ProgramRunView | null {
  const template = programById(run.templateId);
  if (!template) return null;
  const progress = summarizeProgress(template, run.loggedDays.length, run.status);
  return { ...run, progress };
}

export function useProgramRuns(petId: string) {
  const [runs, setRuns] = useState<ProgramRunView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    const all = await loadAll();
    const views = all
      .filter((r) => r.petId === petId)
      .map(withProgress)
      .filter((r): r is ProgramRunView => r !== null)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
    setRuns(views);
    setLoading(false);
  }, [petId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await loadAll();
      if (!active) return;
      const views = all
        .filter((r) => r.petId === petId)
        .map(withProgress)
        .filter((r): r is ProgramRunView => r !== null)
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
      setRuns(views);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [petId]);

  const start = useCallback(
    async (templateId: string): Promise<string | null> => {
      const template = programById(templateId);
      if (!template) return null;
      const all = await loadAll();
      // Reuse an existing active run for the same template + pet.
      const existing = all.find(
        (r) => r.petId === petId && r.templateId === templateId && r.status === "active",
      );
      if (existing) {
        await refresh();
        return existing.id;
      }
      const run: ProgramRun = {
        id: `${templateId}-${Date.now()}`,
        petId,
        templateId,
        startedAt: new Date().toISOString().slice(0, 10),
        status: "active",
        loggedDays: [],
      };
      await saveAll([run, ...all]);
      await refresh();
      return run.id;
    },
    [petId, refresh],
  );

  const logDay = useCallback(
    async (runId: string) => {
      const all = await loadAll();
      const next = all.map((r) => {
        if (r.id !== runId) return r;
        const template = programById(r.templateId);
        const total = template?.days ?? r.loggedDays.length + 1;
        const nextDay = Math.min(total, r.loggedDays.length + 1);
        const loggedDays = r.loggedDays.includes(nextDay) ? r.loggedDays : [...r.loggedDays, nextDay];
        const status: ProgramRun["status"] = loggedDays.length >= total ? "completed" : r.status;
        return { ...r, loggedDays, status, lastLoggedAt: new Date().toISOString() };
      });
      await saveAll(next);
      await refresh();
    },
    [refresh],
  );

  const stop = useCallback(
    async (runId: string) => {
      const all = await loadAll();
      const next = all.map((r) => (r.id === runId ? { ...r, status: "stopped" as const } : r));
      await saveAll(next);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (runId: string) => {
      const all = await loadAll();
      await saveAll(all.filter((r) => r.id !== runId));
      await refresh();
    },
    [refresh],
  );

  return { runs, loading, start, logDay, stop, remove, refresh };
}

/** Read active program runs for a pet (used by the vet report). */
export async function getActiveProgramRuns(petId: string): Promise<ProgramRunView[]> {
  const all = await loadAll();
  return all
    .filter((r) => r.petId === petId && r.status !== "stopped")
    .map(withProgress)
    .filter((r): r is ProgramRunView => r !== null);
}
