import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getUserId } from "@/lib/backend";
import type { CareOccurrence } from "@/services/careScheduleService";
import { storage } from "@/services/storage";

const PREFIX = "petwell-scheduled-care:";
let queue: Promise<unknown> = Promise.resolve();

function scope(user: string, petId: string) {
  return `${PREFIX}${user}:${petId}:`;
}

export async function recurringAlertsEnabled(petId: string) {
  const user = getUserId();
  return user ? storage.getJSON(scope(user, petId), false) : false;
}

export async function setRecurringAlertsEnabled(petId: string, enabled: boolean) {
  const user = getUserId();
  if (!user) return;
  await storage.setJSON(scope(user, petId), enabled);
}

export function reconcileRecurringAlerts(petId: string, slots: CareOccurrence[]) {
  const user = getUserId();
  if (!user || Platform.OS === "web") return Promise.resolve();
  const prefix = scope(user, petId);
  const sync = queue.then(async () => {
    if (getUserId() !== user) return;
    const enabled = await storage.getJSON(prefix, false);
    const permissions = await Notifications.getPermissionsAsync();
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const available = Math.max(0, Math.min(24, 60 - existing.filter(item => !item.identifier.startsWith(prefix)).length));
    const planned = new Map<string, number>();
    if (enabled && permissions.granted) {
      for (const slot of slots.filter(slot => !slot.completed_at).slice().sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))) {
        const date = Date.parse(slot.scheduled_at);
        if (date <= Date.now() || !Number.isFinite(date)) continue;
        if (planned.size >= available) break;
        planned.set(`${prefix}${slot.schedule_id}:${date}`, date);
      }
    }
    for (const old of existing) {
      if (old.identifier.startsWith(prefix) && !planned.delete(old.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(old.identifier);
      }
    }
    for (const [identifier, date] of planned) {
      if (getUserId() !== user) break;
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: "Petwell reminder", body: "A care task is due. Open Petwell to see details." },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(date) },
      });
    }
  });
  queue = sync.catch(() => {});
  return sync;
}

export function clearRecurringAlerts() {
  if (Platform.OS === "web") return Promise.resolve();
  const cleanup = queue.then(async () => {
    for (const item of await Notifications.getAllScheduledNotificationsAsync()) {
      if (item.identifier.startsWith(PREFIX)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
    }
  }).catch(() => {});
  queue = cleanup;
  return cleanup;
}
