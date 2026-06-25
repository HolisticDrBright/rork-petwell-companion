import { Stack, useRouter } from "expo-router";
import { AlertCircle, ArrowRight, Eye, HelpCircle, Leaf, ShieldAlert } from "lucide-react-native";
import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState } from "@/components/ui";
import { Bullet, InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import {
  detectPatterns,
  PATTERN_CONFIDENCE_LABEL,
  type DetectedPattern,
  type PatternConfidence,
} from "@/lib/integrative/patterns";
import { usePets } from "@/providers/PetProvider";

const CONF_COLOR: Record<PatternConfidence, string> = {
  high: Colors.teal700,
  moderate: Colors.amber600,
  low: Colors.inkFaint,
};

const PatternCard = memo(function PatternCard({
  p,
  onOpenPlan,
}: {
  p: DetectedPattern;
  onOpenPlan: () => void;
}) {
  const conf = CONF_COLOR[p.confidence];
  return (
    <Card style={[styles.card, p.urgent && styles.cardUrgent]}>
      <View style={styles.head}>
        <View style={[styles.iconWrap, { backgroundColor: p.urgent ? Colors.red100 : Colors.teal50 }]}>
          {p.urgent ? <ShieldAlert size={18} color={Colors.red600} /> : <Eye size={18} color={Colors.teal700} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.system}>{p.systemLabel}</Text>
        </View>
        {!p.urgent ? (
          <View style={[styles.confPill, { backgroundColor: conf + "22" }]}>
            <Text style={[styles.confText, { color: conf }]}>{PATTERN_CONFIDENCE_LABEL[p.confidence]}</Text>
          </View>
        ) : null}
      </View>

      {p.urgent ? (
        <View style={styles.urgentBanner}>
          <AlertCircle size={16} color={Colors.red600} />
          <Text style={styles.urgentText}>Possible emergency — vet now. Natural support does not apply.</Text>
        </View>
      ) : null}

      <Text style={styles.summary}>{p.summary}</Text>

      <Text style={styles.label}>Supporting signals</Text>
      {p.supportingSignals.map((s, i) => (
        <Bullet key={i}>{s}</Bullet>
      ))}

      {p.missingInfo.length > 0 ? (
        <>
          <Text style={styles.label}>Missing information</Text>
          {p.missingInfo.map((s, i) => (
            <View key={i} style={styles.missRow}>
              <HelpCircle size={15} color={Colors.inkFaint} style={{ marginTop: 2 }} />
              <Text style={styles.missText}>{s}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.label}>Recommended next logs</Text>
      {p.nextLogs.map((s, i) => (
        <Bullet key={i}>{s}</Bullet>
      ))}

      <Text style={styles.label}>{p.urgent ? "What to do now" : "Safe first steps"}</Text>
      {p.safeFirstSteps.map((s, i) => (
        <Bullet key={i} tone={p.urgent ? "danger" : undefined}>
          {s}
        </Bullet>
      ))}

      <Text style={styles.label}>When to escalate</Text>
      {p.whenToEscalate.map((s, i) => (
        <Bullet key={i} tone="vet">
          {s}
        </Bullet>
      ))}

      {!p.urgent && p.conditionId ? (
        <Pressable
          onPress={onOpenPlan}
          accessibilityRole="button"
          accessibilityLabel="Open the support plan"
          style={({ pressed }) => [styles.planBtn, pressed && { opacity: 0.85 }]}
        >
          <Leaf size={16} color={Colors.teal700} />
          <Text style={styles.planBtnText}>See the support plan</Text>
          <ArrowRight size={16} color={Colors.teal700} />
        </Pressable>
      ) : null}
    </Card>
  );
});

export default function PatternsScreen() {
  const router = useRouter();
  const { selectedPet, timeline } = usePets();
  const patterns = useMemo(() => detectPatterns(selectedPet, timeline), [selectedPet, timeline]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Patterns to watch" subtitle={`${selectedPet.name} · from your logs`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <InfoNote>
          These are patterns to watch from {selectedPet.name}&apos;s logs — not diagnoses. Share them with your vet,
          and keep logging to sharpen the picture.
        </InfoNote>

        <View style={{ height: Space.md }} />

        {patterns.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Eye size={22} color={Colors.teal700} />}
              title="No clear patterns yet"
              subtitle="Keep logging food, stool, itch, weight, and behavior — patterns appear here as signals build."
            />
          </Card>
        ) : (
          patterns.map((p) => (
            <PatternCard
              key={p.id}
              p={p}
              onOpenPlan={() =>
                router.push({ pathname: "/protocol-detail", params: { id: p.conditionId ?? "" } })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  card: { marginBottom: Space.md, gap: 6 },
  cardUrgent: { borderWidth: 1.5, borderColor: Colors.red100 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  name: { ...Fonts.h3, fontSize: 15.5 },
  system: { ...Fonts.small, color: Colors.teal700, marginTop: 1 },
  confPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill },
  confText: { fontSize: 11, fontWeight: "800" },
  urgentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.red100,
    borderRadius: Radius.sm,
    padding: 10,
    marginTop: 4,
  },
  urgentText: { ...Fonts.small, color: Colors.red600, flex: 1, fontWeight: "700", lineHeight: 18 },
  summary: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19, marginTop: 4 },
  label: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 12, marginBottom: 2, letterSpacing: 0.6 },
  missRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  missText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.md,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.teal100,
  },
  planBtnText: { ...Fonts.h3, color: Colors.teal700, fontSize: 14.5 },
});
