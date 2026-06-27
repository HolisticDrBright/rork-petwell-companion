import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Bluetooth,
  ChevronRight,
  FileText,
  FolderOpen,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { NoPetSelected } from "@/components/NoPetSelected";
import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { RECORDS } from "@/constants/mockData";
import { usePets } from "@/providers/PetProvider";
import { recordsService } from "@/services";
import { aiService } from "@/services/aiService";
import { AiDisclaimer, AiDisabledNote, AiSafetyBanner, AiSparkleButton } from "@/components/ai/AiBits";
import { shouldShowDemoData } from "@/lib/dataMode";
import type { RecordSummary } from "@/lib/ai/types";
import type { RecordItem } from "@/types/pet";

const STATUS_STYLE = {
  ok: { color: Colors.green600, bg: Colors.green100, label: "Up to date" },
  due: { color: Colors.amber600, bg: Colors.amber100, label: "Due soon" },
  overdue: { color: Colors.red600, bg: Colors.red100, label: "Overdue" },
} as const;

const RecordRow = memo(function RecordRow({ item, isLast }: { item: RecordItem; isLast: boolean }) {
  const s = item.status ? STATUS_STYLE[item.status] : null;
  return (
    <View>
      <View style={styles.recordRow}>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.h3}>{item.title}</Text>
          <Text style={[Fonts.small, { marginTop: 1 }]}>{item.subtitle}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={styles.recordDate}>{item.date}</Text>
          {s ? (
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {!isLast ? <View style={styles.divider} /> : null}
    </View>
  );
});

const Section = memo(function Section({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: RecordItem[];
  onAdd: (category: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(items.length > 0 && items.some((i) => i.status === "due"));
  return (
    <View style={styles.sectionWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.sectionHeader}>
        <Text style={Fonts.h3}>{title}</Text>
        <View style={styles.sectionRight}>
          <Text style={styles.count}>{items.length}</Text>
          <ChevronRight
            size={18}
            color={Colors.inkFaint}
            style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}
          />
        </View>
      </Pressable>
      {open ? (
        items.length > 0 ? (
          <Card style={{ marginTop: 8 }}>
            {items.map((it, i) => (
              <RecordRow key={it.id} item={it} isLast={i === items.length - 1} />
            ))}
          </Card>
        ) : (
          <Pressable style={styles.emptyAdd} onPress={() => onAdd(title)}>
            <Plus size={16} color={Colors.teal700} />
            <Text style={styles.emptyAddText}>Add {title.toLowerCase()}</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
});

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedPet, mode } = usePets();

  const recordsQuery = useQuery({
    queryKey: ["records", selectedPet?.id],
    enabled: mode === "remote" && !!selectedPet,
    queryFn: () => recordsService.listRecords(selectedPet!.id),
  });

  // Local additions (instant feedback; also persisted in remote mode).
  const [localAdds, setLocalAdds] = useState<Record<string, RecordItem[]>>({});
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<{ path: string; title: string } | null>(null);
  const [aiSummary, setAiSummary] = useState<RecordSummary | null>(null);
  const [aiBanner, setAiBanner] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const remoteLoading = mode === "remote" && recordsQuery.isLoading;
  const remoteError = mode === "remote" && recordsQuery.isError;

  const baseSections = useMemo(() => {
    // In remote mode show the user's real records only (never the demo set).
    if (mode === "remote") return recordsQuery.data ?? {};
    // Local mode: demo records only in dev/demo mode, never in production.
    if (!selectedPet) return {};
    return shouldShowDemoData ? RECORDS[selectedPet.demoKey ?? selectedPet.id] ?? {} : {};
  }, [mode, recordsQuery.data, selectedPet]);

  const sections = useMemo(() => {
    const merged: Record<string, RecordItem[]> = {};
    for (const [k, v] of Object.entries(baseSections)) merged[k] = [...v];
    for (const [k, v] of Object.entries(localAdds)) merged[k] = [...(merged[k] ?? []), ...v];
    return merged;
  }, [baseSections, localAdds]);

  const saveRecord = useCallback(async () => {
    if (!selectedPet) return;
    const title = addTitle.trim();
    const category = addCategory;
    if (!title || !category) {
      setAddCategory(null);
      return;
    }
    const item: RecordItem = { id: `local-${Date.now()}`, title, subtitle: `Added ${todayLabel()}`, date: todayLabel() };
    setAddCategory(null);
    setAddTitle("");
    if (mode === "remote") {
      // Persist + refetch is the source of truth — don't also keep an optimistic
      // copy in localAdds, or the record would render twice after the refetch.
      try {
        await recordsService.addRecord(selectedPet.id, { category, title, subtitle: item.subtitle, date: item.date });
        queryClient.invalidateQueries({ queryKey: ["records", selectedPet.id] });
      } catch (e) {
        console.warn("[petwell] add record failed:", e);
      }
    } else {
      setLocalAdds((prev) => ({ ...prev, [category]: [...(prev[category] ?? []), item] }));
    }
  }, [addTitle, addCategory, mode, selectedPet, queryClient]);

  const uploadDoc = useCallback(async () => {
    if (!selectedPet) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
      if (res.canceled || !res.assets[0]) return;
      const uri = res.assets[0].uri;
      const title = res.assets[0].fileName || `Document ${todayLabel()}`;
      setBusy(true);
      setStatus(null);
      const item: RecordItem = { id: `doc-${Date.now()}`, title, subtitle: `Uploaded ${todayLabel()}`, date: todayLabel() };
      setLocalAdds((prev) => ({ ...prev, Documents: [...(prev.Documents ?? []), item] }));
      if (mode === "remote") {
        const path = await recordsService.uploadDocument(selectedPet.id, uri, title);
        setStatus(path ? "Document uploaded to your records." : "Saved locally — sign in to store it in the cloud.");
        if (path) {
          setLastDoc({ path, title });
          setAiSummary(null);
          setAiBanner(null);
          setAiNote(null);
        }
      } else {
        setStatus("Added to records. Sign in to store documents in the cloud.");
      }
    } catch {
      setStatus("Couldn't add that document — please try again.");
    } finally {
      setBusy(false);
    }
  }, [mode, selectedPet]);

  // Optional AI: summarize the just-uploaded document into structured fields.
  // The result is needs_review and saved only after the user confirms.
  const summarizeDoc = useCallback(async () => {
    if (!lastDoc || !selectedPet) return;
    setAiBusy(true);
    setAiNote(null);
    setAiSummary(null);
    setAiBanner(null);
    const res = await aiService.summarizeRecord({ documentPath: lastDoc.path, petId: selectedPet.id });
    setAiBusy(false);
    if (res.disabled) return setAiNote(res.disabledReason ?? "AI features are off.");
    if (!res.ok || !res.data) return setAiNote(res.error ?? "Couldn't summarize this document. Please try again.");
    setAiSummary(res.data);
    setAiBanner(res.safety?.banner ?? null);
  }, [lastDoc, selectedPet]);

  const saveSummary = useCallback(async () => {
    if (!aiSummary || !lastDoc || !selectedPet) return;
    const subtitle = aiSummary.summaryForOwner.slice(0, 140);
    setLocalAdds((prev) => ({
      ...prev,
      Documents: [
        ...(prev.Documents ?? []),
        { id: `ai-${Date.now()}`, title: `AI summary — ${lastDoc.title}`, subtitle: `${subtitle} (review)`, date: todayLabel() },
      ],
    }));
    if (mode === "remote") {
      await recordsService
        .addRecord(selectedPet.id, { category: "Documents", title: `AI summary — ${lastDoc.title}`, subtitle, date: todayLabel() })
        .catch(() => undefined);
    }
    setStatus("AI summary saved to records (marked for your review).");
    setAiSummary(null);
    setLastDoc(null);
  }, [aiSummary, lastDoc, mode, selectedPet]);

  if (!selectedPet) return <NoPetSelected />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
        <Pressable onPress={() => router.push("/settings")} style={styles.iconBtn} hitSlop={8}>
          <Settings size={21} color={Colors.teal800} />
        </Pressable>
      </View>

      <Text style={styles.title}>Records</Text>

      {/* Vet report banner */}
      <Pressable
        onPress={() => router.push("/vet-report")}
        style={({ pressed }) => [styles.reportBanner, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.reportIcon}>
          <FileText size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>Vet-ready summary</Text>
          <Text style={styles.reportSub}>One tap to a complete, shareable report</Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
      </Pressable>

      {/* Quick actions */}
      <View style={styles.quickRow}>
        <Pressable style={styles.quickBtn} onPress={() => setAddCategory("Documents")}>
          <Plus size={18} color={Colors.teal700} />
          <Text style={styles.quickText}>Add record</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={uploadDoc}>
          <FolderOpen size={18} color={Colors.teal700} />
          <Text style={styles.quickText}>Upload doc</Text>
        </Pressable>
        <Pressable style={styles.quickBtn} onPress={() => router.push("/devices")}>
          <Bluetooth size={18} color={Colors.teal700} />
          <Text style={styles.quickText}>Devices</Text>
        </Pressable>
      </View>

      {busy ? <ActivityIndicator color={Colors.teal700} style={{ marginTop: Space.md }} /> : null}
      {status ? <Text style={styles.statusText}>{status}</Text> : null}

      {/* AI document summary (optional) */}
      {lastDoc ? (
        <Card style={styles.aiCard}>
          <Text style={styles.aiTitle}>Summarize “{lastDoc.title}” with AI</Text>
          <Text style={styles.aiSub}>
            Pull out the key dates, meds, lab values, and follow-ups. The summary is for convenience only — your original
            document stays the record, and you confirm before saving.
          </Text>
          <AiSparkleButton label="Summarize with AI" onPress={summarizeDoc} loading={aiBusy} />
          {aiNote ? <AiDisabledNote reason={aiNote} /> : null}
          <AiSafetyBanner banner={aiBanner} />
          {aiSummary ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={styles.aiSummaryText}>{aiSummary.summaryForOwner}</Text>
              {aiSummary.redFlags.length > 0 ? (
                <Text style={styles.aiRedFlags}>Flagged to discuss with your vet: {aiSummary.redFlags.join("; ")}</Text>
              ) : null}
              {aiSummary.medications.length > 0 ? (
                <Text style={styles.aiField}>
                  Medications: {aiSummary.medications.map((m) => m.name + (m.dose ? ` (${m.dose})` : "")).join(", ")}
                </Text>
              ) : null}
              {aiSummary.followUp.length > 0 ? (
                <Text style={styles.aiField}>Follow-up: {aiSummary.followUp.join("; ")}</Text>
              ) : null}
              <Text style={styles.aiReviewNote}>Review carefully — AI can make mistakes. Confirm to save.</Text>
              <Pressable style={styles.aiSaveBtn} onPress={saveSummary} accessibilityRole="button">
                <Text style={styles.aiSaveText}>Save summary to records</Text>
              </Pressable>
              <AiDisclaimer />
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Sections */}
      <View style={{ paddingHorizontal: Space.md, marginTop: Space.sm }}>
        {remoteLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.teal700} />
            <Text style={styles.loadingText}>Loading {selectedPet.name}&apos;s records…</Text>
          </View>
        ) : remoteError ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Couldn&apos;t load records.</Text>
            <PrimaryButton
              label="Retry"
              variant="outline"
              onPress={() => recordsQuery.refetch()}
              style={{ marginTop: 10, alignSelf: "center" }}
            />
          </View>
        ) : (
          Object.entries(sections).map(([title, items]) => (
            <Section key={title} title={title} items={items} onAdd={setAddCategory} />
          ))
        )}
      </View>

      {/* Trust footer */}
      <View style={styles.trust}>
        <ShieldCheck size={18} color={Colors.teal700} />
        <Text style={styles.trustText}>
          Your pet&apos;s records belong to you. Export and sharing are always free.
        </Text>
      </View>

      {/* Quick-add modal */}
      <Modal visible={addCategory !== null} transparent animationType="fade" onRequestClose={() => setAddCategory(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddCategory(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={Fonts.h2}>Add {(addCategory ?? "record").toLowerCase()}</Text>
            <TextInput
              value={addTitle}
              onChangeText={setAddTitle}
              placeholder="Title (e.g. Rabies certificate)"
              placeholderTextColor={Colors.inkFaint}
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setAddCategory(null)} style={{ flex: 1 }} />
              <PrimaryButton label="Add" variant="primary" onPress={saveRecord} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingHorizontal: Space.md, marginBottom: Space.sm },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  title: { ...Fonts.title, paddingHorizontal: Space.md, marginBottom: Space.md },
  reportBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.teal800,
    marginHorizontal: Space.md,
    borderRadius: Radius.lg,
    padding: Space.md,
  },
  reportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: { ...Fonts.h2, color: "#fff", fontSize: 17 },
  reportSub: { ...Fonts.small, color: Colors.teal100, marginTop: 1 },
  quickRow: { flexDirection: "row", gap: Space.sm, paddingHorizontal: Space.md, marginTop: Space.md },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
    ...cardShadow,
  },
  quickText: { ...Fonts.small, color: Colors.ink },
  statusText: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: Space.sm, paddingHorizontal: Space.md },
  aiCard: { marginHorizontal: Space.md, marginTop: Space.md, gap: 10 },
  aiTitle: { ...Fonts.h3, fontSize: 15 },
  aiSub: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  aiSummaryText: { ...Fonts.small, color: Colors.ink, lineHeight: 19 },
  aiRedFlags: { ...Fonts.small, color: Colors.coral600, fontWeight: "700", lineHeight: 18 },
  aiField: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  aiReviewNote: { ...Fonts.tiny, color: Colors.amber600, fontWeight: "700" },
  aiSaveBtn: { backgroundColor: Colors.teal700, borderRadius: Radius.md, paddingVertical: 11, alignItems: "center", marginTop: 2 },
  aiSaveText: { ...Fonts.small, color: "#fff", fontWeight: "800" },
  loadingBox: { alignItems: "center", paddingVertical: Space.xl, gap: 10 },
  loadingText: { ...Fonts.small, color: Colors.inkSoft },
  sectionWrap: { marginBottom: 6 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: {
    ...Fonts.small,
    color: Colors.inkFaint,
    backgroundColor: Colors.cream2,
    minWidth: 24,
    textAlign: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: Colors.hairline },
  recordRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, gap: Space.sm },
  recordDate: { ...Fonts.small, color: Colors.inkSoft },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill },
  emptyAdd: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingLeft: 4 },
  emptyAddText: { ...Fonts.small, color: Colors.teal700 },
  trust: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    margin: Space.md,
    marginTop: Space.lg,
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  trustText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: Space.lg },
  modalCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.lg, gap: 14 },
  modalInput: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  modalBtns: { flexDirection: "row", gap: 10 },
});
