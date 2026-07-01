import { Stack, useFocusEffect, useRouter } from "expo-router";
import { BookOpen, Check, Clock, Download, Pencil, Plus, Share2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { isCurrentUserAdmin } from "@/lib/backend";
import { exportJson } from "@/lib/report/export";
import type { KbUrgency } from "@/lib/symptomKb/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { symptomKbService, type SymptomKbAdminRow } from "@/services/symptomKbService";

const URGENCY_COLOR: Record<KbUrgency, string> = {
  info: Colors.teal700,
  watch: Colors.amber600,
  vet_soon: Colors.coral600,
  emergency: Colors.red600,
};
const URGENCY_BG: Record<KbUrgency, string> = {
  info: Colors.teal50,
  watch: Colors.amber100,
  vet_soon: Colors.coral100,
  emergency: Colors.red100,
};

type Filter = "all" | "pending" | "reviewed";

/**
 * Vet/admin review console for the symptom knowledge base. Entries stay
 * `needs_vet_review` until a licensed vet promotes them. RLS does the real
 * enforcement (only profiles.is_admin can write); this screen gates the UI and
 * drives the local-seed → review → vet_reviewed pipeline.
 */
export default function AdminSymptomKbScreen() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "no-backend" | "not-admin" | "ready">("loading");
  const [rows, setRows] = useState<SymptomKbAdminRow[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await symptomKbService.listAll();
    setRows(list);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured) return active && setState("no-backend");
      if (!(await isCurrentUserAdmin())) return active && setState("not-admin");
      try {
        await load();
      } catch (e) {
        if (active) setNote(e instanceof Error ? e.message : "Couldn't load entries.");
      }
      if (active) setState("ready");
    })();
    return () => {
      active = false;
    };
  }, [load]);

  // Refresh when returning from the add/edit modal.
  useFocusEffect(
    useCallback(() => {
      if (state === "ready") load().catch(() => {});
    }, [state, load]),
  );

  const onExport = useCallback(async () => {
    setNote(null);
    try {
      const payload = {
        app: "Petwell",
        kind: "symptom_kb_review",
        exportedAt: new Date().toISOString(),
        total: rows.length,
        entries: rows.map((r) => ({
          area: r.area, species: r.species, title: r.title, urgency: r.urgency,
          mayIndicate: r.mayIndicate, watchFor: r.watchFor, relatedConcern: r.relatedConcern,
          source: r.source, reviewStatus: r.reviewStatus,
        })),
      };
      const method = await exportJson(payload, "petwell-symptom-kb-review.json");
      setNote(method === "download" ? "Exported the knowledge base as JSON." : "Shared the knowledge base for review.");
    } catch {
      setNote("Couldn't export right now — please try again.");
    }
  }, [rows]);

  const onImport = useCallback(async () => {
    setImporting(true);
    setNote(null);
    const r = await symptomKbService.importSeed();
    if (r.ok) {
      await load();
      setNote(`Imported the bundled seed (${r.count} entries). New rows are pending review.`);
    } else {
      setNote(r.error ?? "Couldn't import the seed.");
    }
    setImporting(false);
  }, [load]);

  const onToggle = useCallback(async (row: SymptomKbAdminRow) => {
    const next = row.reviewStatus === "vet_reviewed" ? "needs_vet_review" : "vet_reviewed";
    setBusyId(row.dbId);
    // Optimistic.
    setRows((prev) => prev.map((r) => (r.dbId === row.dbId ? { ...r, reviewStatus: next } : r)));
    const res = await symptomKbService.setReviewStatus(row.dbId, next);
    if (!res.ok) {
      setRows((prev) => prev.map((r) => (r.dbId === row.dbId ? { ...r, reviewStatus: row.reviewStatus } : r)));
      setNote(res.error ?? "Couldn't update — you may not have admin rights.");
    }
    setBusyId(null);
  }, []);

  if (state !== "ready") {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Symptom KB review" }} />
        {state === "loading" ? (
          <ActivityIndicator color={Colors.teal700} />
        ) : (
          <Text style={styles.msg}>
            {state === "no-backend"
              ? "Connect a Supabase backend to review the knowledge base."
              : "This area is for admins only."}
          </Text>
        )}
      </View>
    );
  }

  const reviewed = rows.filter((r) => r.reviewStatus === "vet_reviewed").length;
  const pending = rows.length - reviewed;
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "reviewed" ? r.reviewStatus === "vet_reviewed" : r.reviewStatus !== "vet_reviewed",
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: "Symptom KB review" }} />

      <View style={styles.titleRow}>
        <BookOpen size={20} color={Colors.teal700} />
        <Text style={styles.title}>Symptom knowledge base</Text>
      </View>
      <Text style={styles.subtitle}>
        Entries stay pending until a licensed vet reviews them. Reviewed entries read as vetted reference; the app
        still defers to the guided triage and a veterinarian.
      </Text>

      <Card style={styles.summary}>
        <Text style={styles.summaryText}>
          <Text style={{ color: Colors.green600, fontWeight: "800" }}>{reviewed}</Text> vet-reviewed ·{" "}
          <Text style={{ color: Colors.amber600, fontWeight: "800" }}>{pending}</Text> pending · {rows.length} total
        </Text>
        <Pressable
          onPress={onImport}
          disabled={importing}
          accessibilityRole="button"
          accessibilityLabel="Import bundled seed into the review queue"
          style={({ pressed }) => [styles.importBtn, pressed && { opacity: 0.85 }]}
        >
          {importing ? (
            <ActivityIndicator color={Colors.teal700} size="small" />
          ) : (
            <>
              <Download size={15} color={Colors.teal700} />
              <Text style={styles.importText}>Import bundled seed</Text>
            </>
          )}
        </Pressable>
        <View style={styles.btnRow}>
          <Pressable
            onPress={() => router.push("/admin-kb-edit")}
            accessibilityRole="button"
            accessibilityLabel="Add a knowledge-base entry"
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.85 }]}
          >
            <Plus size={15} color={Colors.teal700} />
            <Text style={styles.smallBtnText}>Add entry</Text>
          </Pressable>
          <Pressable
            onPress={onExport}
            disabled={rows.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Export the knowledge base for review"
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.85 }, rows.length === 0 && { opacity: 0.5 }]}
          >
            <Share2 size={15} color={Colors.teal700} />
            <Text style={styles.smallBtnText}>Export for review</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.filters}>
        {(["pending", "reviewed", "all"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === "pending" ? "Pending" : f === "reviewed" ? "Reviewed" : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      {note ? <Text style={styles.note}>{note}</Text> : null}

      {rows.length === 0 ? (
        <Card>
          <Text style={styles.empty}>
            No entries in the table yet. Tap &quot;Import bundled seed&quot; to load the bundled reference into the
            review queue.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: Space.sm }}>
          {shown.map((row) => {
            const isReviewed = row.reviewStatus === "vet_reviewed";
            return (
              <Card key={row.dbId} style={{ gap: 8 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.entryTitle}>{row.title}</Text>
                  <View style={[styles.urgency, { backgroundColor: URGENCY_BG[row.urgency] }]}>
                    <Text style={[styles.urgencyText, { color: URGENCY_COLOR[row.urgency] }]}>{row.urgency}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {row.area} · {row.species} · → {row.relatedConcern}
                </Text>
                <Text style={styles.body}>{row.mayIndicate}</Text>
                <Text style={styles.source}>Source: {row.source.name}</Text>
                <View style={styles.rowBottom}>
                  <View style={[styles.statusBadge, isReviewed ? styles.statusReviewed : styles.statusPending]}>
                    {isReviewed ? <Check size={12} color={Colors.green600} /> : <Clock size={12} color={Colors.amber600} />}
                    <Text style={[styles.statusText, { color: isReviewed ? Colors.green600 : Colors.amber600 }]}>
                      {isReviewed ? "Vet-reviewed" : "Pending vet review"}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/admin-kb-edit", params: { id: row.dbId } })}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Edit entry"
                      style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Pencil size={14} color={Colors.teal700} />
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onToggle(row)}
                      disabled={busyId === row.dbId}
                      accessibilityRole="button"
                      accessibilityLabel={isReviewed ? "Mark as pending review" : "Mark as vet-reviewed"}
                      style={({ pressed }) => [
                        styles.toggle,
                        isReviewed ? styles.toggleUndo : styles.toggleApprove,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      {busyId === row.dbId ? (
                        <ActivityIndicator color={isReviewed ? Colors.inkSoft : "#fff"} size="small" />
                      ) : (
                        <Text style={[styles.toggleText, { color: isReviewed ? Colors.inkSoft : "#fff" }]}>
                          {isReviewed ? "Mark pending" : "Mark vet-reviewed"}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, backgroundColor: Colors.cream, alignItems: "center", justifyContent: "center", padding: Space.lg },
  msg: { ...Fonts.body, color: Colors.inkSoft, textAlign: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, lineHeight: 21, marginTop: 4, marginBottom: Space.md },
  summary: { gap: 10 },
  summaryText: { ...Fonts.body, color: Colors.ink },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    paddingVertical: 10,
  },
  importText: { ...Fonts.h3, fontSize: 14, color: Colors.teal700 },
  btnRow: { flexDirection: "row", gap: 8 },
  smallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    paddingVertical: 9,
  },
  smallBtnText: { ...Fonts.small, color: Colors.teal700, fontWeight: "700" },
  filters: { flexDirection: "row", gap: 8, marginTop: Space.md, marginBottom: Space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.teal700 },
  chipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  note: { ...Fonts.small, color: Colors.teal700, marginBottom: Space.sm, lineHeight: 18 },
  empty: { ...Fonts.body, color: Colors.inkSoft, lineHeight: 21 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  entryTitle: { ...Fonts.h3, fontSize: 15, flexShrink: 1 },
  urgency: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  urgencyText: { ...Fonts.tiny, fontWeight: "800", fontSize: 10 },
  meta: { ...Fonts.tiny, color: Colors.inkFaint },
  body: { ...Fonts.small, color: Colors.ink, lineHeight: 19 },
  source: { ...Fonts.tiny, color: Colors.inkFaint },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusReviewed: {},
  statusPending: {},
  statusText: { ...Fonts.small, fontWeight: "700", fontSize: 12 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { ...Fonts.small, color: Colors.teal700, fontWeight: "700" },
  toggle: { borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, minWidth: 120, alignItems: "center" },
  toggleApprove: { backgroundColor: Colors.teal700 },
  toggleUndo: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hairline },
  toggleText: { ...Fonts.h3, fontSize: 13 },
});
