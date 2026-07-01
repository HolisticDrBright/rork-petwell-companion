import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, FileText, Link2, Pencil, Save, Sparkles } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { NoPetSelected } from "@/components/NoPetSelected";
import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getScanResult } from "@/constants/scans";
import { config } from "@/lib/config";
import type { SymptomObservation } from "@/lib/ai/types";
import { usePets } from "@/providers/PetProvider";
import { scanService } from "@/services";
import { aiService } from "@/services/aiService";

function nowLabel(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "a" : "p";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${ap}`;
}

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

// Symptom areas the vision model can observe, and the real triage concern each
// hands off to. teeth/weight have no observation/concern → fall back to generic.
const AI_AREAS = ["poop", "skin", "ear", "eye", "teeth"] as const;
type AiArea = (typeof AI_AREAS)[number];
const CONCERN_FOR: Record<string, string> = { poop: "diarrhea", skin: "skin", ear: "ear", eye: "eye" };

export default function ScanResultScreen() {
  const router = useRouter();
  const { type, notes, photo } = useLocalSearchParams<{ type: string; notes: string; photo?: string }>();
  const { selectedPet, addLog, todayIso, mode } = usePets();
  const result = useMemo(() => getScanResult(type ?? "poop"), [type]);
  const isLabel = type === "food" || type === "treat";
  // Photo "scoring" of symptom pictures is illustrative only. In production
  // (mockScanEnabled = false) we never present fabricated scores/findings — we
  // offer AI *observations* (opt-in) and route to the real adaptive triage.
  const mockScan = config.mockScanEnabled;
  const aiArea: AiArea | null = (AI_AREAS as readonly string[]).includes(type ?? "") ? (type as AiArea) : null;
  const guidedConcern = CONCERN_FOR[type ?? ""] ?? "other";

  const [correctOpen, setCorrectOpen] = useState<boolean>(false);
  const [correctText, setCorrectText] = useState<string>("");
  const [corrected, setCorrected] = useState<boolean>(false);

  // AI photo observations (opt-in; observations only, never a diagnosis/score).
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiObs, setAiObs] = useState<SymptomObservation | null>(null);
  const [aiBanner, setAiBanner] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const onAnalyzeAi = useCallback(async () => {
    if (!selectedPet || !aiArea || !photo) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const path = await aiService.uploadScanImage(photo);
      if (!path) {
        setAiNote("Couldn't upload the photo — please try again.");
        return;
      }
      const res = await aiService.observeSymptomPhoto({
        imagePath: path,
        area: aiArea,
        petId: selectedPet.id,
        notes: notes || undefined,
      });
      if (res.disabled) {
        setAiNote(res.disabledReason ?? "Turn on AI and document processing in Settings to read photos.");
        return;
      }
      if (!res.ok || !res.data) {
        setAiNote(res.error ?? "Couldn't read this photo — you can still use the guided check.");
        return;
      }
      setAiObs(res.data);
      setAiBanner(res.safety?.banner ?? null);
    } finally {
      setAiBusy(false);
    }
  }, [selectedPet, aiArea, photo, notes]);

  const goGuided = useCallback(() => {
    router.push({ pathname: "/ask-flow", params: { concern: guidedConcern } });
  }, [router, guidedConcern]);

  const saveCorrection = useCallback(() => {
    const note = correctText.trim();
    if (!note) {
      setCorrectOpen(false);
      return;
    }
    if (mode === "remote") {
      scanService.saveCorrection({ scanType: type ?? "scan", note }).catch((e) => console.warn("[petwell] correction failed:", e));
    }
    setCorrected(true);
    setCorrectOpen(false);
  }, [correctText, mode, type]);

  const saveToTimeline = useCallback(() => {
    if (!selectedPet) return;
    addLog(selectedPet.id, {
      id: `scan-${Date.now()}`,
      petId: selectedPet.id,
      date: todayIso,
      time: nowLabel(),
      category: "scan",
      title: mockScan ? `${result.title} saved` : aiObs ? "Photo + AI observations saved" : "Photo saved to timeline",
      detail: mockScan && result.score
        ? `${result.scoreLabel}: ${result.score}`
        : aiObs
          ? aiObs.summary.slice(0, 140)
          : undefined,
      value: undefined,
      urgency: mockScan ? result.urgency : aiBanner ? "red" : undefined,
    });
    // Persist the full scan record (best-effort; ignored in local mode).
    if (mode === "remote") {
      scanService
        .createScan(selectedPet.id, { scanType: type ?? "poop", result, notes: notes || undefined })
        .catch((e) => console.warn("[petwell] scan save failed:", e));
    }
    router.replace("/(tabs)/timeline");
  }, [addLog, selectedPet, todayIso, result, mode, type, notes, router, mockScan, aiObs, aiBanner]);

  if (!selectedPet) return <NoPetSelected />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.tiny}>{mockScan ? "ANALYSIS COMPLETE" : "PHOTO SAVED · PREVIEW"}</Text>
          <Text style={styles.title}>{result.title}</Text>
          <Text style={Fonts.bodySoft}>For {selectedPet.name}</Text>
        </View>
        {mockScan && result.score ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{result.score}</Text>
            <Text style={styles.scoreLabel}>{result.scoreLabel}</Text>
          </View>
        ) : null}
      </View>

      {mockScan ? (
        <>
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
        </>
      ) : (
        <View style={{ marginVertical: Space.md, gap: Space.md }}>
          {/* Deterministic red-flag routing — from observed signs or the notes.
              The model observes; the app's rules (not the model) set this. */}
          {aiBanner ? (
            <View style={styles.redFlag}>
              <AlertTriangle size={18} color={Colors.red600} />
              <Text style={styles.redFlagText}>{aiBanner}</Text>
            </View>
          ) : null}

          {aiArea && photo ? (
            aiObs ? (
              <Card style={{ gap: 10 }}>
                <View style={styles.aiHead}>
                  <Sparkles size={16} color={Colors.teal700} />
                  <Text style={styles.aiTitle}>AI photo observations</Text>
                </View>
                <Text style={styles.aiSummary}>{aiObs.summary}</Text>
                {aiObs.observations.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {aiObs.observations.map((o, i) => (
                      <View key={i} style={styles.obsRow}>
                        <Text style={styles.obsFeature}>{o.feature}</Text>
                        <Text style={styles.obsValue}>{o.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.aiFootnote}>
                  Observations only — not a diagnosis or score.
                  {aiObs.quality === "unclear" ? " The photo was hard to read." : ""} Confirm with the guided
                  check and your vet.
                </Text>
              </Card>
            ) : (
              <View style={styles.previewBanner}>
                <Text style={styles.previewTitle}>Read this photo with AI</Text>
                <Text style={styles.previewBody}>
                  Optional: AI can describe what&apos;s visible (color, redness, blood, discharge) as
                  observations — never a diagnosis or score. The guided check makes the actual assessment.
                </Text>
                <Pressable
                  onPress={onAnalyzeAi}
                  disabled={aiBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Read this photo with AI, observations only"
                  style={({ pressed }) => [styles.previewCta, pressed && { opacity: 0.85 }]}
                >
                  {aiBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.previewCtaText}>Read photo (observations only)</Text>
                  )}
                </Pressable>
                {aiNote ? <Text style={styles.aiNote}>{aiNote}</Text> : null}
              </View>
            )
          ) : (
            <View style={styles.previewBanner}>
              <Text style={styles.previewTitle}>Photo saved</Text>
              <Text style={styles.previewBody}>
                Petwell won&apos;t invent a score from a photo. Use the guided check for real, adaptive
                symptom guidance — it routes urgent cases to a vet. You can keep the photo on the timeline
                and share it with your vet.
              </Text>
            </View>
          )}

          {/* Always hand off to the real, rule-based triage. */}
          <Pressable
            onPress={goGuided}
            accessibilityRole="button"
            accessibilityLabel="Continue to guided check"
            style={({ pressed }) => [styles.guidedCta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.guidedCtaText}>Continue to guided check</Text>
          </Pressable>
        </View>
      )}

      {/* Your notes */}
      {notes ? (
        <Card style={{ marginTop: Space.md }}>
          <Text style={styles.notesLabel}>Your notes</Text>
          <Text style={styles.notesText}>{notes}</Text>
        </Card>
      ) : null}

      {/* Follow-up questions */}
      <Text style={styles.sectionTitle}>{mockScan ? "Suggested follow-up" : "Questions to consider"}</Text>
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
      {correctOpen ? (
        <View style={styles.correctBox}>
          <Text style={styles.correctBoxLabel}>What should this say instead?</Text>
          <TextInput
            value={correctText}
            onChangeText={setCorrectText}
            placeholder="e.g. Color looked normal brown, not soft"
            placeholderTextColor={Colors.inkFaint}
            multiline
            style={styles.correctInput}
          />
          <View style={styles.correctBtns}>
            <Pressable onPress={() => setCorrectOpen(false)} hitSlop={8}>
              <Text style={styles.correctCancel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveCorrection} hitSlop={8}>
              <Text style={styles.correctSave}>Save correction</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.correctRow} onPress={() => setCorrectOpen(true)}>
          <Pencil size={15} color={Colors.teal700} />
          <Text style={styles.correctText}>
            {corrected ? "Correction saved · edit again" : "Something off? Correct this result by hand"}
          </Text>
        </Pressable>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <PrimaryButton
          label="Save to timeline"
          icon={<Save size={18} color="#fff" />}
          variant="primary"
          onPress={saveToTimeline}
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
  previewBanner: {
    backgroundColor: Colors.amber100,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginVertical: Space.md,
    gap: 8,
  },
  previewTitle: { ...Fonts.h3, color: Colors.amber600 },
  previewBody: { ...Fonts.small, color: Colors.ink, lineHeight: 19 },
  previewCta: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: Colors.teal700,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  previewCtaText: { ...Fonts.h3, fontSize: 14, color: "#fff" },
  aiNote: { ...Fonts.small, color: Colors.inkSoft, marginTop: 6, lineHeight: 18 },
  redFlag: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.red100,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  redFlagText: { ...Fonts.small, color: Colors.red600, flex: 1, lineHeight: 19, fontWeight: "700" },
  aiHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiTitle: { ...Fonts.h3, fontSize: 15, color: Colors.teal900 },
  aiSummary: { ...Fonts.body, color: Colors.ink, lineHeight: 21 },
  obsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  obsFeature: { ...Fonts.small, color: Colors.inkSoft, flex: 1 },
  obsValue: { ...Fonts.small, color: Colors.ink, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  aiFootnote: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 15 },
  guidedCta: {
    backgroundColor: Colors.coral500,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  guidedCtaText: { ...Fonts.h3, fontSize: 15, color: "#fff" },
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
  correctBox: {
    marginTop: Space.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  correctBoxLabel: { ...Fonts.h3, fontSize: 14 },
  correctInput: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.sm,
    padding: 12,
    minHeight: 64,
    textAlignVertical: "top",
    fontSize: 14.5,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  correctBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 18, alignItems: "center" },
  correctCancel: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  correctSave: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.md },
});
