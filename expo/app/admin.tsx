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
type QueueItem = { id: string; entity_type: string; entity_id: string | null; priority: number; note: string | null };

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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured) return active && setState("no-backend");
      if (!(await isCurrentUserAdmin())) return active && setState("not-admin");
      const [m, subs, q] = await Promise.all([
        dataQualityService.getMetrics(),
        adminReviewService.listPendingSubmissions(),
        adminReviewService.listOpenQueue(),
      ]);
      if (!active) return;
      setMetrics(m);
      setPending(subs as Submission[]);
      setQueue(q as QueueItem[]);
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

  // Resolve an imported-queue item by dispatching to the right reviewer per entity
  // type. Approve marks the entity admin_reviewed (trusted); reject hides it. Both
  // resolve the queue row so the queue shrinks. Lab tests stay brand/study-level —
  // approving never fabricates product-level purity.
  const queueAction = useCallback(
    async (item: QueueItem, action: "approve" | "reject") => {
      setBusyId(item.id);
      try {
        const eid = item.entity_id;
        if (eid && item.entity_type === "product") {
          await adminReviewService.reviewCatalogProduct(eid, action);
        } else if (eid && item.entity_type === "lab_test") {
          await adminReviewService.setLabStatus(eid, action === "approve" ? "admin_reviewed" : "rejected");
        } else if (eid && item.entity_type === "ocr_label") {
          await adminReviewService.reviewLabelSubmission(eid, action);
        } else if (eid && item.entity_type === "product_submission") {
          await adminReviewService.reviewProductSubmission(eid, action);
        } else {
          await adminReviewService.resolveQueueItem(item.id);
        }
        setQueue((prev) => prev.filter((q) => q.id !== item.id));
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
                <Metric label="Open-database products (pending review)" value={metrics.openDatabaseProducts} warn />
                <Metric label="Brand-claim products" value={metrics.brandClaimProducts} warn />
                <Metric label="Products needing review" value={metrics.needsReviewProducts} warn />
                <Metric label="Lab tests — real" value={metrics.realLabTests} good />
                <Metric label="Lab tests — demo/seed" value={metrics.demoLabTests} warn />
                <Metric label="Lab tests — stale" value={metrics.staleLabTests} warn />
                <Metric label="Recalls (total)" value={metrics.totalRecalls} />
                <Metric label="Recalls unmatched" value={metrics.unmatchedRecalls} warn />
                <Metric label="Submissions pending review" value={metrics.pendingSubmissions} warn last />
              </Card>
            ) : null}

            {/* Imported review queue (OPFF products + web-researched lab evidence) */}
            <View style={[styles.head, { marginTop: Space.lg }]}>
              <ShieldCheck size={18} color={Colors.teal700} />
              <Text style={styles.headText}>Imported review queue ({queue.length})</Text>
            </View>
            <Text style={[styles.sub, { marginBottom: 8 }]}>
              Approve = mark reviewed/trusted · Reject = hide. Lab evidence stays brand/study-level — approving never
              creates product-level purity.
            </Text>
            {queue.length === 0 ? (
              <Card>
                <Text style={styles.sub}>Queue empty — nothing imported is awaiting review.</Text>
              </Card>
            ) : (
              queue.slice(0, 100).map((q) => (
                <Card key={q.id} style={styles.subCard}>
                  <View style={styles.queueHead}>
                    <Text style={styles.queueType}>{q.entity_type.replace(/_/g, " ")}</Text>
                    <Text style={styles.queuePri}>priority {q.priority}</Text>
                  </View>
                  <Text style={styles.subText} numberOfLines={3}>
                    {q.note?.trim() || "(no note)"}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.btn, styles.reject]}
                      onPress={() => queueAction(q, "reject")}
                      disabled={busyId === q.id}
                    >
                      <X size={15} color={Colors.red600} />
                      <Text style={[styles.btnText, { color: Colors.red600 }]}>Reject</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.approve]}
                      onPress={() => queueAction(q, "approve")}
                      disabled={busyId === q.id}
                    >
                      <Check size={15} color="#fff" />
                      <Text style={[styles.btnText, { color: "#fff" }]}>Approve</Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            )}

            {/* OCR label review queue */}
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
  queueHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  queueType: { ...Fonts.tiny, color: Colors.teal700, textTransform: "uppercase" },
  queuePri: { ...Fonts.tiny, color: Colors.inkSoft },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  reject: { backgroundColor: Colors.red100 },
  approve: { backgroundColor: Colors.teal700 },
  btnText: { ...Fonts.small, fontWeight: "800" },
});
