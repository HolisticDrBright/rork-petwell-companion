import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Minus,
  Phone,
  Share2,
  ShieldCheck,
  TrendingUp,
  X,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

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
  const router = useRouter();
  const { selectedPet, timeline, healthSignals, patternCards } = usePets();

  const recentSymptoms = timeline.filter(
    (t) => t.category === "skin" || t.category === "stool" || t.category === "scan" || t.category === "symptom"
  );
  const foodChanges = timeline.filter((t) => t.category === "food");
  const medEntries = timeline.filter((t) => t.category === "meds");
  const weightSignal = healthSignals.find((s) => s.label === "Weight");

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
            <Text style={styles.reportDate}>Generated June 25, 2026 · {selectedPet.name}</Text>
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
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {selectedPet.conditions.map((c) => (
                  <View key={c} style={styles.condPill}>
                    <Text style={styles.condPillText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {selectedPet.allergies.length > 0 ? (
              <Text style={[Fonts.small, { marginTop: 4, color: Colors.coral600 }]}>
                Allergies: {selectedPet.allergies.join(", ")}
              </Text>
            ) : null}
          </View>
        </Card>

        {/* Urgency overview */}
        <View style={{ marginTop: Space.md, marginBottom: -Space.sm }}>
          <UrgencyBand level="amber" />
        </View>

        {/* Concern summary */}
        <SectionHeader>Concern summary</SectionHeader>
        <Card>
          <Text style={styles.bodyText}>
            Owner reports intermittent soft stool and elevated paw itching over the past week. Stool
            has improved since pausing a new salmon treat; itching remains around 4–6/10. Energy and
            appetite are normal. Weight trend: +3.2 lb in 6 weeks.
          </Text>
        </Card>

        {/* Key insights */}
        <SectionHeader>Key insights</SectionHeader>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {patternCards.map((p) => (
            <View key={p.id} style={[styles.insightCard, { backgroundColor: p.type === "attention" ? Colors.amber100 : p.type === "progress" ? Colors.green100 : Colors.teal50 }]}>
              <Text style={Fonts.tiny}>{p.type === "correlation" ? "PATTERN" : p.type.toUpperCase()}</Text>
              <Text style={[Fonts.h3, { fontSize: 14, marginTop: 2 }]}>{p.body}</Text>
            </View>
          ))}
        </ScrollView>

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

        {/* Weight trend */}
        {weightSignal ? (
          <>
            <SectionHeader>Weight trend</SectionHeader>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={Fonts.h3}>Current: {weightSignal.value} {weightSignal.unit}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <TrendingUp size={14} color={Colors.amber600} />
                  <Text style={[Fonts.small, { color: Colors.amber600 }]}>+3.2 lb in 6 weeks</Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}

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
                {f.title} {f.detail ? <Text style={{ color: Colors.inkFaint }}>· {f.detail}</Text> : null}
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
        <SectionHeader>Red flags assessment</SectionHeader>
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

        {/* Questions to ask */}
        <SectionHeader>Questions to ask the vet</SectionHeader>
        <Card style={{ gap: 12 }}>
          {QUESTIONS.map((q, i) => (
            <View key={i} style={styles.bulletRow}>
              <HelpCircle size={17} color={Colors.teal700} style={{ marginTop: 1 }} />
              <Text style={styles.bulletText}>{q}</Text>
            </View>
          ))}
        </Card>

        {/* Emergency escalation */}
        <View style={styles.emergencyCard}>
          <Phone size={18} color={Colors.red600} />
          <Text style={styles.emergencyText}>
            Emergency? Call BluePearl ER (555) 911-0000 — 24/7, 3.2 mi away. Bring this report.
          </Text>
        </View>

        {/* Export actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="Export PDF"
            icon={<Download size={18} color="#fff" />}
            variant="primary"
            onPress={() => {}}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Share with clinic"
            icon={<Share2 size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={() => {}}
            style={{ flex: 1 }}
          />
        </View>
        <Text style={styles.freeNote}>Export is always free — no subscription required.</Text>

        {/* Trust badge */}
        <View style={styles.trustBadge}>
          <ShieldCheck size={16} color={Colors.teal700} />
          <Text style={styles.trustText}>
            This report was prepared using Petwell's logs and insights. It is not a veterinary
            diagnosis — share it with your vet to make the visit faster and more informed.
          </Text>
        </View>

        <View style={{ marginTop: Space.md }}>
          <Disclaimer compact />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  reportHeader: { flexDirection: "row", alignItems: "center", gap: Space.sm, marginBottom: Space.md },
  reportIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.teal800, alignItems: "center", justifyContent: "center" },
  reportTitle: { ...Fonts.h2 },
  reportDate: { ...Fonts.small },
  profileCard: { flexDirection: "row", alignItems: "flex-start", gap: Space.sm },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.cream2 },
  condPill: { backgroundColor: Colors.teal50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  condPillText: { fontSize: 11, fontWeight: "700", color: Colors.teal700 },
  sectionHeader: { ...Fonts.tiny, marginTop: Space.lg, marginBottom: 8, letterSpacing: 0.8 },
  bodyText: { ...Fonts.body, lineHeight: 22, color: Colors.inkSoft },
  divider: { height: 1, backgroundColor: Colors.hairline },
  timelineRow: { flexDirection: "row", gap: 12, paddingVertical: 12, alignItems: "flex-start" },
  timelineDate: { ...Fonts.small, color: Colors.teal700, fontWeight: "800", width: 52, marginTop: 1 },
  photoStrip: { flexDirection: "row", gap: 8 },
  scanThumb: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.cream2 },
  scanCount: { width: 72, height: 72, borderRadius: Radius.md, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  scanCountText: { ...Fonts.h3, color: Colors.teal700 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flagDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  flagStatus: { fontSize: 12.5, fontWeight: "800" },
  insightCard: { width: 220, borderRadius: Radius.md, padding: Space.sm, gap: 4 },
  emergencyCard: { flexDirection: "row", gap: 10, backgroundColor: Colors.red100, borderRadius: Radius.md, padding: Space.sm, marginTop: Space.lg, alignItems: "center", borderWidth: 1, borderColor: Colors.red100 },
  emergencyText: { ...Fonts.small, flex: 1, color: Colors.red600, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.xl },
  freeNote: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: 10 },
  trustBadge: { flexDirection: "row", gap: 10, backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: Space.sm, marginTop: Space.md, borderWidth: 1, borderColor: Colors.teal100 },
  trustText: { ...Fonts.small, flex: 1, color: Colors.teal900, lineHeight: 18 },
});
