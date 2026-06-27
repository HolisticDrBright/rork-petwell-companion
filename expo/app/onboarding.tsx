import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Check,
  Download,
  FileHeart,
  HeartPulse,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Weight,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

const GOALS = [
  { id: "itch", label: "Reduce itching", icon: Sparkles },
  { id: "digest", label: "Track digestion", icon: HeartPulse },
  { id: "senior", label: "Manage senior care", icon: Stethoscope },
  { id: "weight", label: "Lose weight", icon: Weight },
  { id: "vet", label: "Prepare for vet visits", icon: FileHeart },
];

const TRUST_POINTS = [
  "Free export, always",
  "We never sell pet photos or health data",
  "Clear, honest safety guidance",
  "Built for vet collaboration",
];

const LAST_STEP = 2;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = usePets();
  const [step, setStep] = useState<number>(0);
  const [goals, setGoals] = useState<string[]>(["itch", "digest"]);

  // Finish onboarding and enter the app. We do NOT fabricate a pet here — a
  // brand-new account has zero pets and lands on the first-pet gate (which routes
  // to /add-pet). Demo pets are only ever created by the explicit "Try a demo
  // profile" action, never automatically.
  const finish = useCallback(async () => {
    await completeOnboarding();
    router.replace("/(tabs)");
  }, [completeOnboarding, router]);

  const next = useCallback(() => {
    if (step >= LAST_STEP) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, finish]);

  const toggleGoal = useCallback((id: string) => {
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive, i === step && styles.dotCurrent]} />
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.welcome}>
          <LinearGradient colors={[Colors.teal700, Colors.teal900]} style={styles.heroCircle}>
            <PawPrint size={56} color="#fff" />
          </LinearGradient>
          <Text style={styles.welcomeTitle}>Your pet&apos;s health, finally in one place.</Text>
          <Text style={styles.welcomeSub}>
            Food, symptoms, records, reminders, and vet-ready answers — calm, careful, and always
            yours.
          </Text>
        </View>
      ) : null}

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>What matters most right now?</Text>
          <Text style={styles.stepSub}>Pick any that apply — we&apos;ll tailor your dashboard.</Text>
          <View style={{ gap: 10, marginTop: Space.md }}>
            {GOALS.map((g) => {
              const active = goals.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleGoal(g.id)}
                  style={[styles.goalRow, active && styles.goalRowActive]}
                >
                  <View style={[styles.goalIcon, active && styles.goalIconActive]}>
                    <g.icon size={20} color={active ? "#fff" : Colors.teal700} />
                  </View>
                  <Text style={[styles.goalLabel, active && { color: Colors.teal900 }]}>{g.label}</Text>
                  <View style={[styles.goalCheck, active && styles.goalCheckActive]}>
                    {active ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {step === 2 ? (
        <ScrollView contentContainerStyle={styles.stepBody} showsVerticalScrollIndicator={false}>
          <View style={styles.trustIcon}>
            <ShieldCheck size={40} color={Colors.teal700} />
          </View>
          <Text style={styles.stepTitle}>Your pet&apos;s data belongs to you.</Text>
          <Text style={styles.stepSub}>No dark patterns. No surprises.</Text>
          <View style={{ gap: 14, marginTop: Space.lg }}>
            {TRUST_POINTS.map((p) => (
              <View key={p} style={styles.trustRow}>
                <View style={styles.trustCheck}>
                  <Check size={14} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.trustText}>{p}</Text>
              </View>
            ))}
          </View>
          <View style={styles.exportCard}>
            <Download size={18} color={Colors.teal700} />
            <Text style={styles.exportText}>
              You can export everything as a vet-ready PDF — free, forever.
            </Text>
          </View>
          <Text style={styles.nextUp}>Next: add your first pet to personalize Petwell.</Text>
        </ScrollView>
      ) : null}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={step === 0 ? "Get started" : step === LAST_STEP ? "Add my first pet" : "Continue"}
          variant="coral"
          icon={<ArrowRight size={18} color="#fff" />}
          onPress={next}
        />
        {step === 0 ? (
          <Pressable onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  dots: { flexDirection: "row", gap: 7, justifyContent: "center", paddingVertical: Space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.hairline },
  dotActive: { backgroundColor: Colors.teal500 },
  dotCurrent: { width: 22 },
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Space.lg, gap: Space.md },
  heroCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.md,
    shadowColor: Colors.teal900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  welcomeTitle: { ...Fonts.hero, fontSize: 30, textAlign: "center", lineHeight: 38 },
  welcomeSub: { ...Fonts.body, fontSize: 16, color: Colors.inkSoft, textAlign: "center", lineHeight: 24 },
  stepBody: { paddingHorizontal: Space.md, paddingTop: Space.md, paddingBottom: 40 },
  stepTitle: { ...Fonts.title, lineHeight: 32 },
  stepSub: { ...Fonts.bodySoft, marginTop: 4 },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.md,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    ...cardShadow,
  },
  goalRowActive: { borderColor: Colors.teal500, backgroundColor: Colors.teal50 },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  goalIconActive: { backgroundColor: Colors.teal600 },
  goalLabel: { ...Fonts.h3, flex: 1 },
  goalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCheckActive: { backgroundColor: Colors.teal600, borderColor: Colors.teal600 },
  trustIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.md,
  },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  trustCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green600,
    alignItems: "center",
    justifyContent: "center",
  },
  trustText: { ...Fonts.body, fontSize: 16, flex: 1 },
  exportCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.xl,
  },
  exportText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 19 },
  nextUp: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.lg, lineHeight: 18 },
  footer: { paddingHorizontal: Space.md, paddingTop: Space.sm, gap: 6 },
  skip: { alignItems: "center", paddingVertical: 12 },
  skipText: { ...Fonts.small, color: Colors.inkFaint },
});
