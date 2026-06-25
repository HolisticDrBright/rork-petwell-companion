import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import {
  Check,
  Crown,
  Heart,
  Infinity as InfinityIcon,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  Watch,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { mapPlans } from "@/lib/purchases/plans";
import type { PurchasesPackage } from "@/lib/purchases/types";
import { useSubscription } from "@/providers/SubscriptionProvider";

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

interface PlanRow {
  key: string;
  label: string;
  sub: string;
  pkg: PurchasesPackage;
  best?: boolean;
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, ready, isSupported, offerings, purchase, restore, presentPaywall, manageSubscription } =
    useSubscription();

  const plans = useMemo(() => mapPlans(offerings), [offerings]);
  const ordered = useMemo<PlanRow[]>(() => {
    const list: PlanRow[] = [];
    if (plans.yearly) list.push({ key: "yearly", label: "Yearly", sub: "Billed annually", pkg: plans.yearly, best: true });
    if (plans.monthly) list.push({ key: "monthly", label: "Monthly", sub: "Billed monthly", pkg: plans.monthly });
    if (plans.lifetime) list.push({ key: "lifetime", label: "Lifetime", sub: "One-time — yours forever", pkg: plans.lifetime });
    return list;
  }, [plans]);

  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && ordered.length) setSelected(ordered[0].key);
  }, [ordered, selected]);

  const selectedPkg = ordered.find((p) => p.key === selected)?.pkg ?? null;

  const onSubscribe = async () => {
    if (!selectedPkg || busy) return;
    setBusy(true);
    setStatus(null);
    const out = await purchase(selectedPkg);
    setBusy(false);
    if (out.cancelled) return; // user backed out — say nothing
    if (!out.ok) setStatus(out.error ?? "Couldn't complete that purchase.");
    // On success isPro flips and the screen switches to the active state.
  };

  const onCompareAll = async () => {
    setStatus(null);
    const res = await presentPaywall();
    if (res === "error") setStatus("Couldn't open the plans right now.");
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    const out = await restore();
    setBusy(false);
    if (out.ok && !out.isPro) setStatus("No previous purchases found to restore.");
    else if (!out.ok) setStatus(out.error ?? "Couldn't restore purchases.");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} hitSlop={10}>
        <X size={22} color={Colors.ink} />
      </Pressable>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 50,
          paddingBottom: insets.bottom + 140,
          paddingHorizontal: Space.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[Colors.teal700, Colors.teal900]} style={styles.crown}>
          <Crown size={40} color={Colors.amber500} />
        </LinearGradient>
        <Text style={styles.title}>Petwell Pro</Text>
        <Text style={styles.subtitle}>
          {isPro
            ? "You're a Pro member — thank you for supporting Petwell."
            : "Deeper insight into your pet's health. Honest pricing, no dark patterns — cancel anytime."}
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

        {/* Always-free reminder */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Always free</Text>
          {FREE.map((f) => (
            <View key={f} style={styles.freeRow}>
              <Check size={15} color={Colors.inkSoft} strokeWidth={3} />
              <Text style={styles.freeText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plan picker — real prices straight from the store via RevenueCat */}
        {!isPro && isSupported && ordered.length > 0 ? (
          <View style={styles.plans}>
            {ordered.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setSelected(p.key)}
                style={[styles.plan, selected === p.key && styles.planActive]}
                accessibilityRole="button"
                accessibilityLabel={`${p.label} plan ${p.pkg.product.priceString}`}
              >
                {p.best ? (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestText}>BEST VALUE</Text>
                  </View>
                ) : null}
                <Text style={styles.planName}>{p.label}</Text>
                <Text style={styles.planPrice}>{p.pkg.product.priceString}</Text>
                <Text style={styles.planEq}>{p.sub}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Loading / unavailable states */}
        {!isPro && isSupported && ordered.length === 0 ? (
          <View style={styles.note}>
            {ready ? (
              <Text style={styles.noteText}>
                Plans aren&apos;t available yet. Tap “See all plans” below, or check your RevenueCat offering setup.
              </Text>
            ) : (
              <ActivityIndicator color={Colors.teal700} />
            )}
          </View>
        ) : null}

        {!isSupported && !isPro ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Subscriptions are available in the Petwell app for iOS and Android.
            </Text>
          </View>
        ) : null}

        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {isPro ? (
          <>
            <View style={styles.proActive}>
              <Check size={16} color={Colors.green600} strokeWidth={3} />
              <Text style={styles.proActiveText}>Petwell Pro is active</Text>
            </View>
            {isSupported ? (
              <PrimaryButton
                label="Manage subscription"
                variant="outline"
                icon={<Settings2 size={18} color={Colors.teal700} />}
                onPress={manageSubscription}
              />
            ) : null}
          </>
        ) : (
          <>
            <PrimaryButton
              label={
                busy
                  ? "Working…"
                  : selectedPkg
                    ? `Subscribe — ${selectedPkg.product.priceString}`
                    : "Choose a plan"
              }
              variant="coral"
              onPress={onSubscribe}
              disabled={!selectedPkg || busy}
            />
            {isSupported ? (
              <View style={styles.linkRow}>
                <Pressable onPress={onCompareAll} hitSlop={8}>
                  <Text style={styles.link}>See all plans</Text>
                </Pressable>
                <Text style={styles.linkDot}>·</Text>
                <Pressable onPress={onRestore} hitSlop={8}>
                  <Text style={styles.link}>Restore purchases</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.footNote}>Exports stay free whether or not you subscribe.</Text>
          </>
        )}
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
  planPrice: { fontSize: 22, fontWeight: "800", color: Colors.ink, marginTop: 4 },
  planEq: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2 },
  note: { marginTop: Space.lg, padding: Space.md, backgroundColor: Colors.cream2, borderRadius: Radius.md, alignItems: "center" },
  noteText: { ...Fonts.small, color: Colors.inkSoft, textAlign: "center", lineHeight: 19 },
  status: { ...Fonts.small, color: Colors.coral600, textAlign: "center", marginTop: Space.md, lineHeight: 18 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    backgroundColor: Colors.cream,
  },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center" },
  proActive: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 4 },
  proActiveText: { ...Fonts.h3, fontSize: 15, color: Colors.green600 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  link: { ...Fonts.small, color: Colors.teal700, fontWeight: "700" },
  linkDot: { ...Fonts.small, color: Colors.inkFaint },
});
