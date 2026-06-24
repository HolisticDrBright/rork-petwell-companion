import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  FileText,
  Link2,
  Pencil,
  Save,
  TriangleAlert,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { getScanResult } from "@/constants/scans";
import { usePets } from "@/providers/PetProvider";

const TONE_COLOR = {
  good: Colors.green600,
  watch: Colors.amber600,
  bad: Colors.coral600,
} as const;

const TONE_BG = {
  good: Colors.green100,
  watch: Colors.amber100,
  bad: Colors.coral100,
} as const;

export default function ScanResultScreen() {
  const router = useRouter();
  const { type, notes } = useLocalSearchParams<{ type: string; notes: string }>();
  const { selectedPet } = usePets();
  const result = useMemo(() => getScanResult(type ?? "poop"), [type]);
  const isLabel = type === "food" || type === "treat";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.tiny}>ANALYSIS COMPLETE</Text>
          <Text style={styles.title}>{result.title}</Text>
          <Text style={Fonts.bodySoft}>For {selectedPet.name}</Text>
        </View>
        {result.score ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{result.score}</Text>
            <Text style={styles.scoreLabel}>{result.scoreLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginVertical: Space.md }}>
        <UrgencyBand level={result.urgency} />
      </View>

      {/* Observed fields */}
      <Card style={{ gap: 0 }}>
        {result.fields.map((f, i) => (
          <View key={f.label}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[styles.fieldPill, { backgroundColor: TONE_BG[f.tone] }]}>
                <Text style={[styles.fieldValue, { color: TONE_COLOR[f.tone] }]}>{f.value}</Text>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {/* Observed patterns */}
      <Text style={styles.sectionTitle}>{isLabel ? "Ingredient flags" : "Observed patterns"}</Text>
      <Card style={{ gap: 12, marginTop: 8 }}>
        {result.patterns.map((p, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.dot} />
            <Text style={styles.bulletText}>{p}</Text>
          </View>
        ))}
      </Card>

      {/* Correlation / recommendation */}
      {result.correlation ? (
        <View style={styles.correlation}>
          <Link2 size={17} color={Colors.teal700} />
          <Text style={styles.correlationText}>{result.correlation}</Text>
        </View>
      ) : null}

      {/* Your notes */}
      {notes ? (
        <Card style={{ marginTop: Space.md }}>
          <Text style={styles.notesLabel}>Your notes</Text>
          <Text style={styles.notesText}>{notes}</Text>
        </Card>
      ) : null}

      {/* Follow-up questions */}
      <Text style={styles.sectionTitle}>Suggested follow-up</Text>
      <Card style={{ gap: 12, marginTop: 8 }}>
        {result.followUps.map((q, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.qDot}>
              <Text style={styles.qDotText}>?</Text>
            </View>
            <Text style={styles.bulletText}>{q}</Text>
          </View>
        ))}
      </Card>

      {/* Manual correction */}
      <Pressable style={styles.correctRow}>
        <Pencil size={15} color={Colors.teal700} />
        <Text style={styles.correctText}>Something off? Correct this result by hand</Text>
      </Pressable>

      {/* Actions */}
      <View style={styles.actions}>
        <PrimaryButton
          label="Save to timeline"
          icon={<Save size={18} color="#fff" />}
          variant="primary"
          onPress={() => router.replace("/(tabs)/timeline")}
          style={{ flex: 1 }}
        />
        <PrimaryButton
          label="Add to report"
          icon={<FileText size={18} color={Colors.teal800} />}
          variant="outline"
          onPress={() => router.replace("/vet-report")}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ marginTop: Space.lg }}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: Space.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  title: { ...Fonts.title, marginVertical: 2 },
  scoreBadge: {
    backgroundColor: Colors.teal800,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 80,
  },
  scoreValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  scoreLabel: { color: Colors.teal100, fontSize: 10, fontWeight: "700", marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  fieldLabel: { ...Fonts.h3, fontSize: 15 },
  fieldPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  fieldValue: { fontSize: 13.5, fontWeight: "800" },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  qDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  qDotText: { color: Colors.teal700, fontWeight: "800", fontSize: 12 },
  correlation: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.md,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  correlationText: { ...Fonts.body, flex: 1, color: Colors.teal900, lineHeight: 21, fontWeight: "600" },
  notesLabel: { ...Fonts.tiny, marginBottom: 4 },
  notesText: { ...Fonts.body, lineHeight: 21 },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: Space.lg },
  correctText: { ...Fonts.small, color: Colors.teal700 },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.md },
});
