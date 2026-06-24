import { Image } from "expo-image";
import { Stack } from "expo-router";
import { Check, Download, FileText, HelpCircle, Minus, Share2, X } from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";
import { reportService } from "@/services";

const RED_FLAGS = [
  { label: "Blood in stool", present: false },
  { label: "Repeated vomiting", present: false },
  { label: "Lethargy / weakness", present: false },
  { label: "Not eating > 24h", present: false },
  { label: "Elevated skin itching", present: true },
];

const QUESTIONS = [
  "Could the recurring paw itching be a food vs. environmental allergy?",
  "Is the salmon treat a reasonable long-term option given the chicken sensitivity?",
  "Should we adjust the Omega-3 dose for the skin?",
  "Is the recent 0.4 lb gain something to manage now?",
];

const SectionHeader = memo(function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
});

export default function VetReportScreen() {
  const { selectedPet, timeline, mode } = usePets();
  const [saved, setSaved] = useState<boolean>(false);

  const recentSymptoms = timeline.filter(
    (t) => t.category === "skin" || t.category === "stool" || t.category === "scan"
  );
  const foodChanges = timeline.filter((t) => t.category === "food");

  const saveReport = useCallback(() => {
    setSaved(true);
    if (mode === "remote") {
      reportService
        .createReport(selectedPet.id, {
          title: "Vet-ready summary",
          concernSummary:
            "Intermittent soft stool and elevated paw itching over the past week; improving since pausing a new treat.",
          payload: {
            redFlags: RED_FLAGS,
            questions: QUESTIONS,
            symptoms: recentSymptoms.slice(0, 8),
            foodChanges: foodChanges.slice(0, 5),
            generatedAt: new Date().toISOString(),
          },
        })
        .catch((e) => console.warn("[petwell] report save failed:", e));
    }
  }, [mode, selectedPet.id, recentSymptoms, foodChanges]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Vet-ready summary" }} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.reportHeader}>
          <View style={styles.reportIcon}>
            <FileText size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.reportTitle}>Vet-ready summary</Text>
            <Text style={styles.reportDate}>Generated June 25, 2026</Text>
          </View>
        </View>

        {/* Pet profile */}
        <Card style={styles.profileCard}>
          <Image source={{ uri: selectedPet.photo }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={Fonts.h2}>{selectedPet.name}</Text>
            <Text style={Fonts.small}>
              {selectedPet.ageYears} yr · {selectedPet.breed} · {selectedPet.sex} · {selectedPet.weightLb} lb
            </Text>
            {selectedPet.conditions.length > 0 ? (
              <Text style={[Fonts.small, { marginTop: 4, color: Colors.teal700 }]}>
                {selectedPet.conditions.join(" · ")}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* Concern summary */}
        <SectionHeader>Concern summary</SectionHeader>
        <Card>
          <Text style={styles.bodyText}>
            Owner reports intermittent soft stool and elevated paw itching over the past week. Stool
            has improved since pausing a new salmon treat; itching remains around 4–6/10. Energy and
            appetite are normal.
          </Text>
        </Card>

        {/* Symptom timeline */}
        <SectionHeader>Symptom timeline</SectionHeader>
        <Card style={{ gap: 0 }}>
          {recentSymptoms.slice(0, 5).map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.timelineRow}>
                <Text style={styles.timelineDate}>
                  {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{s.title}</Text>
                  {s.detail ? <Text style={Fonts.small}>{s.detail}</Text> : null}
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Photos / scans */}
        <SectionHeader>Photos & scans</SectionHeader>
        <View style={styles.photoStrip}>
          {[
            "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&q=80",
            "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=200&q=80",
            "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=200&q=80",
          ].map((u, i) => (
            <Image key={i} source={{ uri: u }} style={styles.scanThumb} contentFit="cover" />
          ))}
          <View style={styles.scanCount}>
            <Text style={styles.scanCountText}>+2</Text>
          </View>
        </View>

        {/* Food changes */}
        <SectionHeader>Food & diet changes</SectionHeader>
        <Card style={{ gap: 10 }}>
          {foodChanges.slice(0, 3).map((f) => (
            <View key={f.id} style={styles.bulletRow}>
              <View style={styles.dot} />
              <Text style={styles.bulletText}>
                {f.title} <Text style={{ color: Colors.inkFaint }}>· {f.detail}</Text>
              </Text>
            </View>
          ))}
        </Card>

        {/* Meds */}
        <SectionHeader>Medications & supplements</SectionHeader>
        <Card style={{ gap: 10 }}>
          <View style={styles.bulletRow}>
            <View style={styles.dot} />
            <Text style={styles.bulletText}>Apoquel 16mg — once daily (itch control)</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.dot} />
            <Text style={styles.bulletText}>Omega-3 chew — once daily (skin support)</Text>
          </View>
        </Card>

        {/* Red flags */}
        <SectionHeader>Red flags</SectionHeader>
        <Card style={{ gap: 12 }}>
          {RED_FLAGS.map((f) => (
            <View key={f.label} style={styles.flagRow}>
              <View style={[styles.flagDot, { backgroundColor: f.present ? Colors.amber100 : Colors.green100 }]}>
                {f.present ? (
                  <Minus size={13} color={Colors.amber600} strokeWidth={3} />
                ) : (
                  <X size={13} color={Colors.green600} strokeWidth={3} />
                )}
              </View>
              <Text style={styles.bulletText}>{f.label}</Text>
              <Text style={[styles.flagStatus, { color: f.present ? Colors.amber600 : Colors.green600 }]}>
                {f.present ? "Present" : "Absent"}
              </Text>
            </View>
          ))}
        </Card>

        {/* Questions */}
        <SectionHeader>Questions to ask the vet</SectionHeader>
        <Card style={{ gap: 12 }}>
          {QUESTIONS.map((q, i) => (
            <View key={i} style={styles.bulletRow}>
              <HelpCircle size={17} color={Colors.teal700} style={{ marginTop: 1 }} />
              <Text style={styles.bulletText}>{q}</Text>
            </View>
          ))}
        </Card>

        {/* Export actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label={saved ? "Saved to records" : "Export PDF"}
            icon={
              saved ? <Check size={18} color="#fff" /> : <Download size={18} color="#fff" />
            }
            variant="primary"
            onPress={saveReport}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Share with clinic"
            icon={<Share2 size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={saveReport}
            style={{ flex: 1 }}
          />
        </View>
        <Text style={styles.freeNote}>Export is always free — no subscription required.</Text>

        <View style={{ marginTop: Space.md }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginBottom: Space.md },
  reportIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.teal800,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: { ...Fonts.h2 },
  reportDate: { ...Fonts.small },
  profileCard: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.cream2 },
  sectionHeader: { ...Fonts.tiny, marginTop: Space.lg, marginBottom: 8, letterSpacing: 0.8 },
  bodyText: { ...Fonts.body, lineHeight: 22, color: Colors.inkSoft },
  divider: { height: 1, backgroundColor: Colors.hairline },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  timelineDate: { ...Fonts.small, color: Colors.teal700, fontWeight: "800", width: 52, marginTop: 1 },
  photoStrip: { flexDirection: "row", gap: 8 },
  scanThumb: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.cream2 },
  scanCount: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  scanCountText: { ...Fonts.h3, color: Colors.teal700 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flagDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  flagStatus: { fontSize: 12.5, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.xl },
  freeNote: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: 10 },
});
