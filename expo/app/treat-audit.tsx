import { Stack } from "expo-router";
import { AlertTriangle, Check, Cookie, Flame, Repeat, ShieldAlert, Sparkles } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card } from "@/components/ui";
import { InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { auditTreat, TREAT_CATALOG, type TreatAuditResult, type Verdict } from "@/lib/integrative/treats";
import { usePets } from "@/providers/PetProvider";

const VERDICT_STYLE: Record<Verdict, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }>; label: string }> = {
  ok: { color: Colors.green600, bg: Colors.green100, Icon: Check, label: "Okay occasionally" },
  caution: { color: Colors.amber600, bg: Colors.amber100, Icon: AlertTriangle, label: "Use caution" },
  avoid: { color: Colors.red600, bg: Colors.red100, Icon: ShieldAlert, label: "Avoid" },
};

const FAT_COLOR: Record<string, string> = {
  low: Colors.green600,
  moderate: Colors.amber600,
  high: Colors.red600,
  unknown: Colors.inkFaint,
};

function ResultCard({ r }: { r: TreatAuditResult }) {
  const v = VERDICT_STYLE[r.verdict];
  return (
    <Card style={{ gap: 12, marginTop: Space.md }}>
      <View style={[styles.verdictBanner, { backgroundColor: v.bg }]}>
        <v.Icon size={18} color={v.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictLabel, { color: v.color }]}>{v.label}</Text>
          <Text style={styles.verdictHeadline}>{r.headline}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{r.caloriesPerTreat ?? "—"}</Text>
          <Text style={styles.statLabel}>kcal each</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: FAT_COLOR[r.fatLevel], textTransform: "capitalize" }]}>{r.fatLevel}</Text>
          <Text style={styles.statLabel}>fat level</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{r.dailyBudgetTreats ?? "—"}</Text>
          <Text style={styles.statLabel}>/ day max</Text>
        </View>
      </View>

      <View style={styles.budgetBox}>
        <Flame size={14} color={Colors.teal700} />
        <Text style={styles.budgetText}>{r.budgetNote}</Text>
      </View>

      {r.allergyConflicts.length > 0 ? (
        <View style={styles.flagBox}>
          <Text style={styles.flagTitle}>Allergy conflicts</Text>
          <Text style={styles.flagText}>{r.allergyConflicts.join(" · ")}</Text>
        </View>
      ) : null}

      {r.ingredientFlags.length > 0 ? (
        <View style={styles.flagBox}>
          <Text style={styles.flagTitle}>Ingredient flags</Text>
          {r.ingredientFlags.map((f, i) => (
            <Text key={i} style={styles.flagText}>
              • {f}
            </Text>
          ))}
        </View>
      ) : null}

      {r.additiveFlags.length > 0 ? (
        <View style={styles.flagBox}>
          <Text style={styles.flagTitle}>Additives</Text>
          <Text style={styles.flagText}>{r.additiveFlags.join(" · ")}</Text>
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Sparkles size={14} color={Colors.teal700} />
        <Text style={styles.metaText}>
          Dental value: <Text style={{ fontWeight: "800", textTransform: "capitalize" }}>{r.dentalValue}</Text>
        </Text>
      </View>

      {/* Safer swaps */}
      <View>
        <Text style={styles.swapTitle}>Safer swaps</Text>
        {r.saferSwaps.map((s, i) => (
          <View key={i} style={styles.swapRow}>
            <Repeat size={14} color={Colors.teal700} style={{ marginTop: 2 }} />
            <Text style={styles.swapText}>{s}</Text>
          </View>
        ))}
      </View>

      {r.notes.map((n, i) => (
        <Text key={i} style={styles.note}>
          {n}
        </Text>
      ))}
    </Card>
  );
}

export default function TreatAuditScreen() {
  const { selectedPet } = usePets();
  const [name, setName] = useState<string>("");
  const [ingredients, setIngredients] = useState<string>("");
  const [submitted, setSubmitted] = useState<{ name: string; ingredients?: string[] } | null>(null);

  const result = useMemo(() => {
    if (!submitted || !submitted.name.trim()) return null;
    return auditTreat({ name: submitted.name, ingredients: submitted.ingredients }, selectedPet);
  }, [submitted, selectedPet]);

  const runCustom = () => {
    if (!name.trim()) return;
    const ing = ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSubmitted({ name, ingredients: ing.length ? ing : undefined });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Treat audit" subtitle={`Checked for ${selectedPet.name}`} />
      <ScrollView
        contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <InfoNote>
          Check any treat against {selectedPet.name}&apos;s allergies, weight, and conditions. Pick a common treat or
          enter your own.
        </InfoNote>

        {/* Custom entry */}
        <Card style={{ gap: 10, marginTop: Space.md }}>
          <Text style={styles.inputLabel}>Treat name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Peanut butter biscuit"
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
            returnKeyType="next"
          />
          <Text style={styles.inputLabel}>Main ingredients (optional, comma-separated)</Text>
          <TextInput
            value={ingredients}
            onChangeText={setIngredients}
            placeholder="e.g. wheat flour, peanut butter, sugar"
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={runCustom}
          />
          <Pressable
            onPress={runCustom}
            accessibilityRole="button"
            accessibilityLabel="Audit this treat"
            style={({ pressed }) => [styles.auditBtn, pressed && { opacity: 0.85 }]}
          >
            <Cookie size={17} color="#fff" />
            <Text style={styles.auditBtnText}>Audit this treat</Text>
          </Pressable>
        </Card>

        {/* Quick-pick catalog */}
        <Text style={styles.section}>Or pick a common treat</Text>
        <View style={styles.chipWrap}>
          {TREAT_CATALOG.map((t) => (
            <Pressable
              key={t.name}
              onPress={() => {
                setName(t.name);
                setIngredients((t.ingredients ?? []).join(", "));
                setSubmitted({ name: t.name, ingredients: t.ingredients });
              }}
              accessibilityRole="button"
              accessibilityLabel={t.name}
              style={({ pressed }) => [styles.treatChip, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.treatChipText}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        {result ? <ResultCard r={result} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  inputLabel: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Fonts.body,
  },
  auditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal800,
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: 4,
  },
  auditBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  section: { ...Fonts.h3, marginTop: Space.lg, marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  treatChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  treatChipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  verdictBanner: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: Radius.md, padding: Space.md },
  verdictLabel: { ...Fonts.tiny, fontWeight: "800", letterSpacing: 0.6 },
  verdictHeadline: { ...Fonts.body, color: Colors.ink, marginTop: 3, lineHeight: 20, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: Colors.cream, borderRadius: Radius.md, paddingVertical: 12, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: Colors.ink },
  statLabel: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 2 },
  budgetBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: 12 },
  budgetText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  flagBox: { backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: 12, gap: 3 },
  flagTitle: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5, marginBottom: 2 },
  flagText: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { ...Fonts.small, color: Colors.inkSoft },
  swapTitle: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5, marginBottom: 6 },
  swapRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  swapText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 18 },
  note: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16 },
});
