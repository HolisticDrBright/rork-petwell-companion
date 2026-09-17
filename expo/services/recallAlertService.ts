// Per-pet recall alerts: when an imported FDA recall matches a brand the user
// has logged as a pet's food, raise ONE local notification per (pet, recall)
// that deep-links to the recall's FDA source. Brand-level honesty: the copy
// says the recall MAY affect a food this pet eats — never that the exact
// product was recalled. Matching itself is pure (lib/food/recallNotify.ts).
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getMode } from "@/lib/backend";
import { matchRecallsToPets, type FedLogForMatching, type RecallForMatching } from "@/lib/food/recallNotify";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const SEEN_KEY = "petwell.recallAlerts.seen.v1";
const LAST_RUN_KEY = "petwell.recallAlerts.lastRun.v1";
const MAX_NOTIFICATIONS_PER_RUN = 3;
const LOG_WINDOW_DAYS = 120;
const RECALL_WINDOW_DAYS = 365;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export const recallAlertService = {
  /**
   * Check the user's fed brands against verified recalls and notify once per
   * new (pet, recall) match. Throttled to one sweep per day; safe to call on
   * every home-screen focus. No-ops on web, in local mode, or without
   * notification permission already granted (never prompts).
   */
  async checkAndNotify(petNames: Map<string, string>): Promise<number> {
    if (Platform.OS === "web") return 0;
    if (!(isSupabaseConfigured && getMode() === "remote")) return 0;
    try {
      const last = await AsyncStorage.getItem(LAST_RUN_KEY);
      if (last && Date.now() - new Date(last).getTime() < 20 * 60 * 60 * 1000) return 0;

      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) return 0;

      const [recallRes, logRes] = await Promise.all([
        supabase
          .from("recall_events")
          .select("id, brand_id, reason, source_url, recall_date, brand_match_level, food_brands(name)")
          .eq("evidence_status", "verified_official")
          .not("brand_id", "is", null)
          .gte("recall_date", daysAgoIso(RECALL_WINDOW_DAYS).slice(0, 10))
          .limit(200),
        supabase
          .from("food_logs")
          .select("pet_id, product_id, label")
          .gte("fed_at", daysAgoIso(LOG_WINDOW_DAYS))
          .limit(500),
      ]);
      const recallRows = recallRes.data ?? [];
      const logRows = logRes.data ?? [];
      if (recallRows.length === 0 || logRows.length === 0) {
        await AsyncStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
        return 0;
      }

      const productIds = [...new Set(logRows.map((l) => l.product_id).filter(Boolean))] as string[];
      const productBrand = new Map<string, string | null>();
      if (productIds.length) {
        const { data: prods } = await supabase.from("food_products").select("id, brand_id").in("id", productIds);
        for (const p of prods ?? []) productBrand.set(p.id, p.brand_id);
      }

      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
      const recalls: RecallForMatching[] = recallRows.map((r) => ({
        id: r.id,
        brandId: r.brand_id,
        brandName: one(r.food_brands as { name: string } | { name: string }[] | null)?.name ?? null,
        reason: r.reason,
        sourceUrl: r.source_url,
        recallDate: r.recall_date,
      }));
      const logs: FedLogForMatching[] = logRows
        .filter((l) => petNames.has(l.pet_id))
        .map((l) => ({ petId: l.pet_id, productId: l.product_id, label: l.label ?? "" }));

      const alerts = matchRecallsToPets(recalls, logs, productBrand);

      const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
      const seen = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);
      let sent = 0;
      for (const alert of alerts) {
        const key = `${alert.petId}:${alert.recallId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (sent >= MAX_NOTIFICATIONS_PER_RUN) continue; // mark seen, don't spam
        const pet = petNames.get(alert.petId) ?? "your pet";
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Food recall may affect ${pet}`,
            body: `${alert.brandName ?? "A brand"} ${pet} has eaten has an FDA recall (brand-level match): ${alert.reason.slice(0, 120)}. Tap for the FDA notice.`,
            data: { url: alert.url },
          },
          trigger: null, // deliver now
        });
        sent++;
      }
      await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
      await AsyncStorage.setItem(LAST_RUN_KEY, new Date().toISOString());
      return sent;
    } catch {
      return 0; // alerts are best-effort, never break the home screen
    }
  },
};
