import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import {
  Check,
  Crown,
  Heart,
  Infinity as InfinityIcon,
  Sparkles,
  TrendingUp,
  Users,
  Watch,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

const FREE = [
  "Pet profile & care reminders",
  "Full records & history — always yours",
  "Symptom triage & food checks",
  "Always-free vet report export",
];

const PREMIUM = [
  { label: "Unlimited scans", icon: InfinityIcon },
  { label: "Advanced Ask follow-ups", icon: Sparkles },
  { label: "Trend correlations", icon: TrendingUp },
  { label: "Wearable integrations", icon: Watch },
  { label: "Advanced vet reports", icon: Heart },
  { label: "Multi-pet family sharing", icon: Users },
];

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setPremium } = usePets();
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} hitSlop={10}>
        <X size={22} color={Colors.ink} />
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 50, paddingBottom: insets.bottom + 120, paddingHorizontal: Space.md }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.teal700, Colors.teal900]} style={styles.crown}>
          <Crown size={40} color={Colors.amber500} />
        </LinearGradient>
        <Text style={styles.title}>Petwell Premium</Text>
        <Text style={styles.subtitle}>
          Deeper insight into your pet&apos;s health. Honest pricing, no dark patterns — cancel
          anytime.
        </Text>

        {/* Premium features */}
        <View style={styles.featureCard}>
          {PREMIUM.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <f.icon size={18} color={Colors.teal700} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Check size={18} color={Colors.green600} strokeWidth={3} />
            </View>
          ))}
        </View>

        {/* Free reminder */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Always free</Text>
          {FREE.map((f) => (
            <View key={f} style={styles.freeRow}>
              <Check size={15} color={Colors.inkSoft} strokeWidth={3} />
              <Text style={styles.freeText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plan picker */}
        <View style={styles.plans}>
          <Pressable
            onPress={() => setPlan("yearly")}
            style={[styles.plan, plan === "yearly" && styles.planActive]}
          >
            <View style={styles.bestBadge}>
              <Text style={styles.bestText}>BEST VALUE · SAVE 34%</Text>
            </View>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>
              $79<Text style={styles.planUnit}>/yr</Text>
            </Text>
            <Text style={styles.planEq}>≈ $6.58/mo</Text>
          </Pressable>
          <Pressable
            onPress={() => setPlan("monthly")}
            style={[styles.plan, plan === "monthly" && styles.planActive]}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>
              $9.99<Text style={styles.planUnit}>/mo</Text>
            </Text>
            <Text style={styles.planEq}>Billed monthly</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={plan === "yearly" ? "Start yearly — $79/yr" : "Start monthly — $9.99/mo"}
          variant="coral"
          onPress={() => {
            setPremium(true);
            router.back();
          }}
        />
        <Text style={styles.footNote}>Exports stay free whether or not you subscribe.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  close: {
    position: "absolute",
    right: Space.md,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  crown: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Space.md,
  },
  title: { ...Fonts.hero, textAlign: "center" },
  subtitle: { ...Fonts.bodySoft, textAlign: "center", lineHeight: 22, marginTop: 6, marginBottom: Space.lg },
  featureCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.md, gap: 4, ...cardShadow },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 9 },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { ...Fonts.h3, flex: 1, fontSize: 15 },
  freeCard: { backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: Space.md, marginTop: Space.md, gap: 8 },
  freeTitle: { ...Fonts.tiny, marginBottom: 2 },
  freeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeText: { ...Fonts.small, color: Colors.inkSoft },
  plans: { flexDirection: "row", gap: Space.sm, marginTop: Space.lg },
  plan: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: 2,
    borderColor: Colors.hairline,
    ...cardShadow,
  },
  planActive: { borderColor: Colors.teal600 },
  bestBadge: {
    backgroundColor: Colors.amber100,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginBottom: 6,
  },
  bestText: { fontSize: 9, fontWeight: "800", color: Colors.amber600, letterSpacing: 0.3 },
  planName: { ...Fonts.h3 },
  planPrice: { fontSize: 26, fontWeight: "800", color: Colors.ink, marginTop: 4 },
  planUnit: { fontSize: 14, fontWeight: "700", color: Colors.inkFaint },
  planEq: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2 },
  footer: {
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    backgroundColor: Colors.cream,
  },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center" },
});
