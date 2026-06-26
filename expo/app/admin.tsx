import { Stack } from "expo-router";
import { Check, Database, ShieldCheck, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { isCurrentUserAdmin } from "@/lib/backend";
import { isSupabaseConfigured } from "@/lib/supabase";
import { adminReviewService, dataQualityService } from "@/services";
import type { DataQualityMetrics } from "@/services/dataQualityService";

type Submission = { id: string; raw_ocr_text: string | null; matched_product_id: string | null; created_at: string };

/**
 * Minimal internal admin console. RLS does the real enforcement (every mutation
 * is gated on profiles.is_admin); this screen just gates the UI and surfaces the
 * data-quality metrics + the OCR-label review queue so the workflow isn't purely
 * theoretical. Non-admins and local-mode see a clear message, not a broken screen.
 */
export default function AdminScreen() {
  const [state, setState] = useState<"loading" | "no-backend" | "not-admin" | "ready">("loading");
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [pending, setPending] = useState<Submission[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured) return active && setState("no-backend");
      if (!(await isCurrentUserAdmin())) return active && setState("not-admin");
      const [m, subs] = await Promise.all([
        dataQualityService.getMetrics(),
        adminReviewService.listPendingSubmissions(),
      ]);
      if (!active) return;
      setMetrics(m);
      setPending(subs as Submission[]);
      setState("ready");
    })().catch(() => active && setState("not-admin"));
    return () => {
      active = false;
    };
  }, []);

  const review = useCallback(
    async (id: string, action: "approve" | "reject") => {
      setBusyId(id);
      try {
        await adminReviewService.reviewLabelSubmission(id, action);
        setPending((prev) => prev.filter((s) => s.id !== id));
      } catch {
        // RLS or network — leave it in the list
      } finally {
        setBusyId(null);
      }
    },
    [],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Admin · data quality" }} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
        {state === "loading" ? (
          <ActivityIndicator color={Colors.teal700} style={{ marginTop: 40 }} />
        ) : state === "no-backend" ? (
          <Card>
            <Text style={styles.msg}>Admin tools require the Supabase backend. This build is in local mode.</Text>
          </Card>
        ) : state === "not-admin" ? (
          <Card style={{ gap: 8 }}>
            <ShieldCheck size={22} color={Colors.teal700} />
            <Text style={styles.msg}>This area is for Petwell admins only.</Text>
            <Text style={styles.sub}>Access is enforced by row-level security on your account.</Text>
          </Card>
        ) : (
          <>
            {/* Data-quality metrics */}
            <View style={styles.head}>
              <Database size={18} color={Colors.teal700} />
              <Text style={styles.headText}>Catalog & evidence</Text>
            </View>
            {metrics ? (
              <Card style={{ gap: 0 }}>
                <Metric label="Products" value={metrics.totalProducts} />
                <Metric label="Products with REAL product-level lab" value={metrics.productsWithRealLab} good />
                <Metric label="Products with no lab evidence" value={metrics.productsWithNoLab} warn />
                <Metric label="Lab tests — real" value={metrics.realLabTests} good />
                <Metric label="Lab tests — demo/seed" value={metrics.demoLabTests} warn />
                <Metric label="Lab tests — stale" value={metrics.staleLabTests} warn />
                <Metric label="Recalls (total)" value={metrics.totalRecalls} />
                <Metric label="Recalls unmatched" value={metrics.unmatchedRecalls} warn />
                <Metric label="Submissions pending review" value={metrics.pendingSubmissions} warn last />
              </Card>
            ) : null}

            {/* Review queue */}
            <View style={[styles.head, { marginTop: Space.lg }]}>
              <ShieldCheck size={18} color={Colors.teal700} />
              <Text style={styles.headText}>OCR label review queue ({pending.length})</Text>
            </View>
            {pending.length === 0 ? (
              <Card>
                <Text style={styles.sub}>Nothing pending review.</Text>
              </Card>
            ) : (
              pending.map((s) => (
                <Card key={s.id} style={styles.subCard}>
                  <Text style={styles.subText} numberOfLines={3}>
                    {s.raw_ocr_text?.trim() || "(no text)"}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.btn, styles.reject]}
                      onPress={() => review(s.id, "reject")}
                      disabled={busyId === s.id}
                    >
                      <X size={15} color={Colors.red600} />
                      <Text style={[styles.btnText, { color: Colors.red600 }]}>Reject</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.approve]}
                      onPress={() => review(s.id, "approve")}
                      disabled={busyId === s.id}
                    >
                      <Check size={15} color="#fff" />
                      <Text style={[styles.btnText, { color: "#fff" }]}>Approve</Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, good, warn, last }: { label: string; value: number; good?: boolean; warn?: boolean; last?: boolean }) {
  return (
    <View style={[styles.metric, !last && styles.metricBorder]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, good && { color: Colors.green600 }, warn && value > 0 && { color: Colors.amber600 }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  head: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  headText: { ...Fonts.h3 },
  msg: { ...Fonts.body, color: Colors.ink, lineHeight: 21 },
  sub: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  metric: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  metricBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  metricLabel: { ...Fonts.small, color: Colors.inkSoft, flex: 1 },
  metricValue: { ...Fonts.h3, fontSize: 16, color: Colors.ink },
  subCard: { gap: 10, marginBottom: Space.sm },
  subText: { ...Fonts.small, color: Colors.ink, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  reject: { backgroundColor: Colors.red100 },
  approve: { backgroundColor: Colors.teal700 },
  btnText: { ...Fonts.small, fontWeight: "800" },
});
