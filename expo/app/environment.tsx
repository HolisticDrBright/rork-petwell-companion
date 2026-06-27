import { Stack, useRouter } from "expo-router";
import { CheckCircle2, ChevronRight, Home, ShieldAlert, Sparkles, Wind } from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { NoPetSelected } from "@/components/NoPetSelected";
import { InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { buildEnvironmentChecklist, environmentFirstSteps, type EnvSeverity } from "@/lib/integrative/environment";
import { usePets } from "@/providers/PetProvider";

const SEV: Record<EnvSeverity, { color: string; bg: string; label: string }> = {
  high: { color: Colors.red600, bg: Colors.red100, label: "Higher risk" },
  caution: { color: Colors.amber600, bg: Colors.amber100, label: "Worth checking" },
  info: { color: Colors.teal700, bg: Colors.teal50, label: "Good habit" },
};

export default function EnvironmentScreen() {
  const router = useRouter();
  const { selectedPet } = usePets();
  const checklist = useMemo(() => (selectedPet ? buildEnvironmentChecklist(selectedPet) : []), [selectedPet]);

  if (!selectedPet) return <NoPetSelected />;

  const plan = environmentFirstSteps(selectedPet);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Home environment" subtitle={`Tailored for ${selectedPet.name}`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* First steps */}
        <Card style={styles.firstCard}>
          <View style={styles.firstHead}>
            <View style={styles.firstIcon}>
              <Sparkles size={17} color="#fff" />
            </View>
            <Text style={styles.firstTitle}>{plan.headline}</Text>
          </View>
          {plan.firstSteps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <CheckCircle2 size={16} color={Colors.teal100} style={{ marginTop: 2 }} />
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </Card>

        {/* Quick link into the offline toxin database */}
        <Pressable
          style={({ pressed }) => [styles.toxinCard, pressed && { opacity: 0.85 }]}
          onPress={() => router.push("/toxins")}
          accessibilityRole="button"
          accessibilityLabel="Check if a plant, food, or product is toxic"
        >
          <View style={styles.toxinIcon}>
            <ShieldAlert size={18} color={Colors.coral600} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toxinTitle}>Is it toxic?</Text>
            <Text style={styles.toxinSub}>Look up a specific plant, food, product, or medicine — works offline.</Text>
          </View>
          <ChevronRight size={18} color={Colors.inkFaint} />
        </Pressable>

        <Text style={styles.section}>Full home checklist</Text>
        <Text style={styles.sectionHint}>
          Go through these once. {plan.itchyFocus ? "Allergy-relevant items are highlighted." : "High-risk items are highlighted."}
        </Text>

        {checklist.map((item) => {
          const sev = SEV[item.severity];
          return (
            <Card key={item.id} style={[styles.itemCard, item.emphasized && styles.itemEmphasized]}>
              <View style={styles.itemHead}>
                <View style={styles.itemIcon}>
                  <Home size={16} color={Colors.teal700} />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <View style={[styles.sevPill, { backgroundColor: sev.bg }]}>
                  <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
                </View>
              </View>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.why}>
                <Text style={styles.whyKey}>Why · </Text>
                {item.why}
              </Text>
              <View style={styles.saferRow}>
                <Wind size={14} color={Colors.green600} style={{ marginTop: 2 }} />
                <Text style={styles.saferText}>{item.saferStep}</Text>
              </View>
            </Card>
          );
        })}

        <View style={{ marginTop: Space.md }}>
          <InfoNote>
            These are low-risk home tweaks that support skin, airways, and overall health. For cats, essential oils and
            scented products deserve special caution.
          </InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  firstCard: { backgroundColor: Colors.teal900, gap: 10 },
  firstHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  firstIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.teal700, alignItems: "center", justifyContent: "center" },
  firstTitle: { ...Fonts.h3, color: "#fff", flex: 1 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepText: { ...Fonts.small, color: Colors.teal100, flex: 1, lineHeight: 19, fontWeight: "500" },
  toxinCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.coral100,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: Space.md,
  },
  toxinIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center" },
  toxinTitle: { ...Fonts.h3, fontSize: 15, color: Colors.coral600 },
  toxinSub: { ...Fonts.tiny, color: Colors.inkSoft, marginTop: 1, lineHeight: 15 },
  section: { ...Fonts.h2, fontSize: 17, marginTop: Space.lg },
  sectionHint: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2, marginBottom: Space.sm, lineHeight: 18 },
  itemCard: { gap: 6, marginBottom: Space.sm },
  itemEmphasized: { borderWidth: 1.5, borderColor: Colors.teal100 },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  itemLabel: { ...Fonts.h3, fontSize: 14.5, flex: 1 },
  sevPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill },
  sevText: { fontSize: 10.5, fontWeight: "800" },
  question: { ...Fonts.small, color: Colors.ink, lineHeight: 19, fontWeight: "600", marginTop: 2 },
  why: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  whyKey: { fontWeight: "800", color: Colors.inkSoft },
  saferRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 2 },
  saferText: { ...Fonts.small, color: Colors.green600, flex: 1, lineHeight: 18, fontWeight: "600" },
});
