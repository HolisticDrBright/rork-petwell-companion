import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, ChevronLeft, HelpCircle, Info, ShieldAlert } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NoPetSelected } from "@/components/NoPetSelected";
import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { estimateTotal, nextQuestion, personalize } from "@/lib/triage/engine";
import { getModule } from "@/lib/triage/modules";
import { useTriage } from "@/lib/triage/store";
import type { AnswerOption } from "@/lib/triage/types";
import { usePets } from "@/providers/PetProvider";

export default function AskFlowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { concern } = useLocalSearchParams<{ concern: string }>();
  const { selectedPet } = usePets();
  const petId = selectedPet?.id;

  const module = useMemo(() => getModule(concern ?? "other"), [concern]);

  const ctx = useTriage((s) => s.ctx);
  const storeModuleId = useTriage((s) => s.module?.id);
  const finishing = useTriage((s) => s.finishing);
  const start = useTriage((s) => s.start);
  const answer = useTriage((s) => s.answer);
  const back = useTriage((s) => s.back);
  const finish = useTriage((s) => s.finish);

  const [whyOpen, setWhyOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<{ questionId: string; options: AnswerOption[] } | null>(null);
  const navigatedRef = useRef<boolean>(false);
  const scrollView = useRef<ScrollView>(null);
  const petRef = useRef(selectedPet);
  petRef.current = selectedPet;

  // Start a fresh interview when we enter the flow for this concern/pet. Keyed
  // on the pet id (not the object) so a background refetch can't reset it.
  useEffect(() => {
    navigatedRef.current = false;
    setDraft(null);
    if (!petRef.current) return;
    start(petRef.current, concern ?? "other");
  }, [concern, petId, start]);

  const ready = storeModuleId === module.id && ctx?.pet.id === selectedPet?.id;
  const q = ready && ctx ? nextQuestion(module, ctx) : null;
  const selected = draft && draft.questionId === q?.id ? draft.options : [];

  useEffect(() => {
    scrollView.current?.scrollTo({ y: 0, animated: false });
  }, [q?.id]);

  // The result is computed before cloud saves, so urgent guidance can show immediately.
  useEffect(() => {
    if (!petId) return;
    if (!ready || !ctx || q || navigatedRef.current) return;
    if (ctx.order.length === 0) return; // nothing answered yet
    navigatedRef.current = true;
    void finish(petId);
    router.replace("/triage-result");
  }, [ready, ctx, q, finish, petId, router]);

  const onAnswer = useCallback(
    (options: AnswerOption[]) => {
      if (!q) return;
      if (Platform.OS !== "web") Haptics.selectionAsync();
      setWhyOpen(false);
      setDraft(null);
      answer(q, options);
    },
    [q, answer]
  );

  const choose = (opt: AnswerOption) => {
    if (!q?.multiple) {
      onAnswer([opt]);
      return;
    }
    setDraft((previous) => {
      const options = previous?.questionId === q.id ? previous.options : [];
      if (options.some((item) => item.id === opt.id)) {
        return { questionId: q.id, options: options.filter((item) => item.id !== opt.id) };
      }
      return { questionId: q.id, options: opt.exclusive ? [opt] : [...options.filter((item) => !item.exclusive), opt] };
    });
  };

  const goBack = useCallback(() => {
    setWhyOpen(false);
    const previousId = ctx?.order.at(-1);
    if (previousId && back()) {
      setDraft({ questionId: previousId, options: ctx?.picked[previousId] ?? [] });
    } else {
      router.back();
    }
  }, [back, ctx, router]);

  if (!selectedPet) return <NoPetSelected />;

  const total = ready && ctx ? estimateTotal(module, ctx) : module.questions.length;
  // While a question is showing we're on order.length + 1; once it's null the
  // interview is done, so pin the label to the final total (never overshoot).
  const step = !ctx ? 1 : q ? Math.min(ctx.order.length + 1, total) : total;
  const progress = Math.min(1, step / Math.max(total, 1));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topbar}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={10} testID="ask-back">
          <ChevronLeft size={24} color={Colors.ink} />
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {step} of {total}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollView}
        contentContainerStyle={{ padding: Space.md, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Let&apos;s narrow this down safely</Text>
        <Text style={styles.concern}>
          {selectedPet.name} · {module.label}
        </Text>

        {q ? (
          <View style={styles.qCard}>
            {q.kind === "redflag" ? (
              <View style={styles.safetyTag}>
                <ShieldAlert size={13} color={Colors.coral600} />
                <Text style={styles.safetyTagText}>Safety check</Text>
              </View>
            ) : null}
            <Text style={styles.question}>{personalize(q.text, selectedPet)}</Text>
            {q.multiple ? <Text style={styles.selectionHint}>Select all that apply, then tap Continue.</Text> : null}

            <Pressable style={styles.whyRow} onPress={() => setWhyOpen((v) => !v)} testID="ask-why">
              <Info size={15} color={Colors.teal700} />
              <Text style={styles.whyLabel}>Why I&apos;m asking</Text>
            </Pressable>
            {whyOpen ? (
              <View style={styles.whyBox}>
                <Text style={styles.whyText}>{personalize(q.why, selectedPet)}</Text>
              </View>
            ) : null}

            <View style={styles.options}>
              {q.options.map((opt) => {
                const checked = selected.some((item) => item.id === opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    testID={`ask-opt-${opt.id}`}
                    accessibilityRole={q.multiple ? "checkbox" : "button"}
                    aria-checked={q.multiple ? checked : undefined}
                    onPress={() => choose(opt)}
                    style={({ pressed }) => [
                      styles.option,
                      opt.redFlag && styles.optionFlag,
                      checked && styles.optionSelected,
                      pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <Text style={[styles.optionText, opt.redFlag && styles.optionTextFlag]}>
                      {opt.label}
                    </Text>
                    {q.multiple ? (
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? <Check size={15} color="#fff" /> : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              {q.multiple ? (
                <PrimaryButton label="Continue" disabled={selected.length === 0} onPress={() => onAnswer(selected)} />
              ) : null}
              {q.allowUnsure ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAnswer([])}
                  style={({ pressed }) => [styles.unsure, pressed && { opacity: 0.7 }]}
                >
                  <HelpCircle size={16} color={Colors.inkSoft} />
                  <Text style={styles.unsureText}>I&apos;m not sure</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.qCard}>
            <Text style={styles.question}>{finishing ? "Putting it together…" : "Loading…"}</Text>
          </View>
        )}

        <Text style={styles.safetyNote}>
          Red-flag questions come first. If anything feels like an emergency, don&apos;t wait — seek
          veterinary help now.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topbar: { flexDirection: "row", alignItems: "center", gap: Space.sm, padding: Space.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  progressWrap: { flex: 1, gap: 5 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.cream2, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.teal600 },
  progressText: { ...Fonts.tiny },
  header: { ...Fonts.title, marginTop: 6 },
  concern: { ...Fonts.bodySoft, marginTop: 2, marginBottom: Space.lg },
  qCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.lg, ...cardShadow },
  safetyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.coral100,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: 10,
  },
  safetyTagText: { fontSize: 11.5, fontWeight: "800", color: Colors.coral600, letterSpacing: 0.2 },
  question: { fontSize: 22, fontWeight: "800", color: Colors.ink, lineHeight: 29, letterSpacing: -0.3 },
  selectionHint: { ...Fonts.small, marginTop: 6 },
  whyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start" },
  whyLabel: { ...Fonts.small, color: Colors.teal700 },
  whyBox: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.sm,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  whyText: { fontSize: 13.5, lineHeight: 20, color: Colors.teal900, fontWeight: "500" },
  options: { gap: 10, marginTop: Space.lg },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
  },
  optionFlag: { borderColor: Colors.amber100, backgroundColor: Colors.amber100 },
  optionSelected: { borderColor: Colors.teal700, backgroundColor: Colors.teal50 },
  optionText: { ...Fonts.h3, flex: 1, fontSize: 15.5 },
  optionTextFlag: { color: Colors.amber600 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: Colors.teal700,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.teal700 },
  unsure: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  unsureText: { ...Fonts.small },
  safetyNote: { ...Fonts.small, color: Colors.inkFaint, marginTop: Space.lg, lineHeight: 19, textAlign: "center" },
});
