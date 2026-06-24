import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronLeft, HelpCircle, Info, ShieldAlert } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { CONCERNS, getFlow } from "@/constants/triage";
import { usePets } from "@/providers/PetProvider";

function getCategoryBadge(category: string | undefined): { label: string; color: string; bg: string } | null {
  if (!category) return null;
  if (category === "Red flag check") return { label: "Safety check", color: Colors.red600, bg: Colors.red100 };
  if (category === "Hydration") return { label: "Hydration", color: Colors.teal700, bg: Colors.teal50 };
  return { label: category, color: Colors.teal700, bg: Colors.teal50 };
}

export default function AskFlowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { concern } = useLocalSearchParams<{ concern: string }>();
  const { selectedPet } = usePets();

  const flow = useMemo(() => getFlow(concern ?? "other"), [concern]);
  const concernLabel = useMemo(
    () => CONCERNS.find((c) => c.id === concern)?.label ?? "this concern",
    [concern]
  );

  const [step, setStep] = useState<number>(0);
  const [redFlags, setRedFlags] = useState<number>(0);
  const [whyOpen, setWhyOpen] = useState<boolean>(false);

  const total = flow.questions.length;
  const q = flow.questions[step];
  const progress = (step + 1) / total;
  const badge = getCategoryBadge(q?.category);

  const goBack = useCallback(() => {
    if (step === 0) {
      router.back();
      return;
    }
    setWhyOpen(false);
    setStep((s) => s - 1);
  }, [step, router]);

  const answer = useCallback(
    (isRedFlag: boolean) => {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      const nextRed = redFlags + (isRedFlag ? 1 : 0);
      setRedFlags(nextRed);
      setWhyOpen(false);
      if (step + 1 >= total) {
        router.replace({
          pathname: "/triage-result",
          params: { concern: concern ?? "other", redFlags: String(nextRed) },
        });
      } else {
        setStep((s) => s + 1);
      }
    },
    [redFlags, step, total, router, concern]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topbar}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={24} color={Colors.ink} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {step + 1} of {total}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Space.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Let's narrow this down safely</Text>
        <Text style={styles.concern}>
          {selectedPet.name} · {concernLabel}
        </Text>

        {/* Question category badge */}
        {badge ? (
          <View style={[styles.categoryBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.categoryBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ) : null}

        <View style={styles.qCard}>
          <Text style={styles.question}>{q.question}</Text>

          <Pressable style={styles.whyRow} onPress={() => setWhyOpen((v) => !v)}>
            <Info size={15} color={Colors.teal700} />
            <Text style={styles.whyLabel}>Why I'm asking</Text>
          </Pressable>
          {whyOpen ? (
            <View style={styles.whyBox}>
              <Text style={styles.whyText}>{q.why}</Text>
            </View>
          ) : null}

          <View style={styles.options}>
            {q.options.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => answer(Boolean(opt.redFlag))}
                style={({ pressed }) => [
                  styles.option,
                  opt.redFlag && styles.optionFlag,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <Text style={[styles.optionText, opt.redFlag && styles.optionTextFlag]}>
                  {opt.label}
                </Text>
                {opt.redFlag ? (
                  <ShieldAlert size={16} color={Colors.red600} />
                ) : null}
              </Pressable>
            ))}
            {q.allowUnsure ? (
              <Pressable
                onPress={() => answer(false)}
                style={({ pressed }) => [styles.unsure, pressed && { opacity: 0.7 }]}
              >
                <HelpCircle size={16} color={Colors.inkSoft} />
                <Text style={styles.unsureText}>I'm not sure</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.safetyNote}>
          Red-flag questions come first. If anything feels like an emergency, don't wait —
          seek veterinary help now.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topbar: { flexDirection: "row", alignItems: "center", gap: Space.sm, padding: Space.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...cardShadow },
  progressWrap: { flex: 1, gap: 5 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.cream2, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.teal600 },
  progressText: { ...Fonts.tiny },
  header: { ...Fonts.title, marginTop: 6 },
  concern: { ...Fonts.bodySoft, marginTop: 2, marginBottom: Space.sm },
  categoryBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: Space.sm },
  categoryBadgeText: { fontSize: 11, fontWeight: "800" },
  qCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.lg, ...cardShadow },
  question: { fontSize: 22, fontWeight: "800", color: Colors.ink, lineHeight: 29, letterSpacing: -0.3 },
  whyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start" },
  whyLabel: { ...Fonts.small, color: Colors.teal700 },
  whyBox: { backgroundColor: Colors.teal50, borderRadius: Radius.sm, padding: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.teal100 },
  whyText: { fontSize: 13.5, lineHeight: 20, color: Colors.teal900, fontWeight: "500" },
  options: { gap: 10, marginTop: Space.lg },
  option: {
    backgroundColor: Colors.cream, borderRadius: Radius.md,
    paddingVertical: 16, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: Colors.hairline,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  optionFlag: { borderColor: Colors.red100, backgroundColor: Colors.red100 },
  optionText: { ...Fonts.h3, fontSize: 15.5, flex: 1 },
  optionTextFlag: { color: Colors.red600 },
  unsure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  unsureText: { ...Fonts.small },
  safetyNote: { ...Fonts.small, color: Colors.inkFaint, marginTop: Space.lg, lineHeight: 19, textAlign: "center" },
});
