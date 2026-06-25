import { Stack, useLocalSearchParams } from "expo-router";
import { Droplets, Flame, Leaf, Package, Scale, Snowflake, Utensils, Wheat } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { EvidenceBadge, InfoNote, ScreenHeader, VetNote } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { MEAL_PLANS, mealPlanById, selectMealPlan, type MealPlan } from "@/lib/integrative/meals";
import type { ThermalNature } from "@/lib/integrative/types";
import { usePets } from "@/providers/PetProvider";

const THERMAL: Record<ThermalNature, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  warming: { color: Colors.coral600, bg: Colors.coral100, Icon: Flame },
  cooling: { color: Colors.teal700, bg: Colors.teal50, Icon: Snowflake },
  neutral: { color: Colors.inkSoft, bg: Colors.cream2, Icon: Utensils },
};

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon size={15} color={Colors.teal700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function MealPlannerScreen() {
  const { selectedPet } = usePets();
  const params = useLocalSearchParams<{ condition?: string; system?: string }>();
  const initial = useMemo(
    () => selectMealPlan(selectedPet, { conditionId: params.condition, system: params.system }).plan.id,
    [selectedPet, params.condition, params.system],
  );
  const [planId, setPlanId] = useState<string>(initial);
  const plan: MealPlan = mealPlanById(planId) ?? MEAL_PLANS[0];
  const t = THERMAL[plan.thermalNature];
  const catCaution = selectedPet.species === "cat" ? plan.catCaution : undefined;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Meal planner" subtitle={`Food-first support for ${selectedPet.name}`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Plan selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: Space.md }}
          style={{ marginBottom: Space.md }}
        >
          {MEAL_PLANS.map((m) => {
            const active = m.id === planId;
            return (
              <Pressable
                key={m.id}
                onPress={() => setPlanId(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Header card */}
        <Card style={{ gap: 10 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{plan.title}</Text>
            <View style={[styles.thermalPill, { backgroundColor: t.bg }]}>
              <t.Icon size={12} color={t.color} />
              <Text style={[styles.thermalText, { color: t.color }]}>{plan.thermalNature}</Text>
            </View>
          </View>
          <Text style={styles.who}>{plan.whoFor}</Text>
          <EvidenceBadge grade={plan.evidence} long />
        </Card>

        {/* Cat caution */}
        {catCaution ? (
          <View style={{ marginTop: Space.md }}>
            <VetNote>{catCaution}</VetNote>
          </View>
        ) : null}

        {/* Nutrient targets */}
        <Text style={styles.section}>Nutrition targets</Text>
        <Card style={{ gap: 14 }}>
          <Row icon={Scale} label="Calories" value={plan.caloriesNote} />
          <Row icon={Flame} label="Fat" value={plan.fatNote} />
          <Row icon={Leaf} label="Protein" value={plan.proteinNote} />
          <Row icon={Wheat} label="Fiber" value={plan.fiberNote} />
          <Row icon={Droplets} label="Hydration" value={plan.hydrationNote} />
        </Card>

        {/* TCM */}
        <Text style={styles.section}>TCM food energetics</Text>
        <Card style={{ gap: 6 }}>
          <Text style={styles.kv}>
            <Text style={styles.kvKey}>Thermal nature · </Text>
            <Text style={{ textTransform: "capitalize" }}>{plan.thermalNature}</Text>
          </Text>
          <Text style={styles.kv}>
            <Text style={styles.kvKey}>Pattern support · </Text>
            {plan.tcmPattern}
          </Text>
          <Text style={styles.kv}>
            <Text style={styles.kvKey}>Preparation · </Text>
            {plan.prep}
          </Text>
        </Card>

        {/* Commercial */}
        <Text style={styles.section}>Commercial food ideas</Text>
        <Card style={{ gap: 10 }}>
          {plan.commercial.map((c, i) => (
            <View key={i} style={styles.bulletRow}>
              <Package size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
              <Text style={styles.bulletText}>{c}</Text>
            </View>
          ))}
        </Card>

        {/* Homemade */}
        <Text style={styles.section}>Homemade support ideas</Text>
        <Card style={{ gap: 10 }}>
          {plan.homemade.map((c, i) => (
            <View key={i} style={styles.bulletRow}>
              <Utensils size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
              <Text style={styles.bulletText}>{c}</Text>
            </View>
          ))}
          {plan.needsNutritionist ? (
            <Text style={styles.disclaimer}>
              Homemade or therapeutic diets must be balanced by a board-certified veterinary nutritionist for long-term
              feeding — these are short-term support ideas, not complete recipes.
            </Text>
          ) : null}
        </Card>

        {/* Contraindications */}
        <Text style={styles.section}>Important cautions</Text>
        <Card style={[styles.warnCard, { gap: 8 }]}>
          {plan.contraindications.map((c, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.warnDot} />
              <Text style={styles.warnText}>{c}</Text>
            </View>
          ))}
        </Card>

        <View style={{ marginTop: Space.md }}>
          <InfoNote>
            Meal plans support digestion and wellbeing — they don&apos;t treat disease. Confirm exact calories and any
            therapeutic diet with your vet.
          </InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipActive: { backgroundColor: Colors.teal800, borderColor: Colors.teal800 },
  chipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { ...Fonts.h2, fontSize: 18, flex: 1 },
  who: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  thermalPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  thermalText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  section: { ...Fonts.h3, marginTop: Space.lg, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  rowIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  rowLabel: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5 },
  rowValue: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19, marginTop: 2 },
  kv: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  kvKey: { fontWeight: "800", color: Colors.ink },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  disclaimer: { ...Fonts.tiny, color: Colors.coral600, lineHeight: 17, marginTop: 4 },
  warnCard: { backgroundColor: Colors.amber100 },
  warnDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.amber600, marginTop: 7 },
  warnText: { ...Fonts.small, color: Colors.ink, flex: 1, lineHeight: 19 },
});
