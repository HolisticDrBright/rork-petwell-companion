import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Reminder } from "@/types/pet";

import { storage } from "./storage";

/**
 * Local notifications for reminders. Schedules a daily device notification at a
 * reminder's time, and cancels it when the reminder is turned off. Local-only
 * (no server/push) and fully offline. Web has no scheduled notifications, so it
 * degrades to a no-op. Maps reminderId -> scheduled notification id so we can
 * cancel later.
 */

const MAP_KEY = "petwell.reminderNotifs.v1";
const isWeb = Platform.OS === "web";

// Show reminders while the app is foregrounded too.
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Parse a time label like "8:00a", "8:00 AM", "8a", or "20:00" into 24h parts. */
export function parseTimeLabel(label: string | undefined): { hour: number; minute: number } | null {
  if (!label) return null;
  const s = label.trim().toLowerCase();
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])m?$/);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const minute = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const pm = ampm[3] === "p";
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hour = parseInt(h24[1], 10);
    const minute = parseInt(h24[2], 10);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }
  return null;
}

async function ensureReady(): Promise<boolean> {
  if (isWeb) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/** Explicitly request notification permission (e.g. from a settings toggle). */
export async function requestNotificationPermission(): Promise<boolean> {
  return ensureReady();
}

async function loadMap(): Promise<Record<string, string>> {
  return storage.getJSON<Record<string, string>>(MAP_KEY, {});
}

async function cancel(reminderId: string, map: Record<string, string>): Promise<void> {
  const id = map[reminderId];
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already gone
  }
  delete map[reminderId];
}

/**
 * Reconcile one reminder's scheduled notification with its enabled state.
 * Returns true if a notification is now scheduled.
 */
export async function syncReminder(reminder: Reminder, enabled: boolean): Promise<boolean> {
  if (isWeb) return false;
  const map = await loadMap();
  await cancel(reminder.id, map);

  let scheduled = false;
  if (enabled) {
    const time = parseTimeLabel(reminder.time);
    const ready = await ensureReady();
    if (ready && time) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.label || "Petwell reminder",
            body: reminder.detail || "Time for your pet's care task.",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: time.hour,
            minute: time.minute,
          },
        });
        map[reminder.id] = id;
        scheduled = true;
      } catch {
        // scheduling failed (e.g. permission revoked mid-flight)
      }
    }
  }
  await storage.setJSON(MAP_KEY, map);
  return scheduled;
}

/** Cancel a reminder's notification (e.g. when it's deleted). */
export async function cancelReminder(reminderId: string): Promise<void> {
  if (isWeb) return;
  const map = await loadMap();
  await cancel(reminderId, map);
  await storage.setJSON(MAP_KEY, map);
}

export const notificationsService = {
  parseTimeLabel,
  requestNotificationPermission,
  syncReminder,
  cancelReminder,
};
