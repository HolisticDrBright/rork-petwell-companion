import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CalendarCheck, CheckCircle2, ClipboardList, FileText, ListChecks, Play, Square } from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import { NoPetSelected } from "@/components/NoPetSelected";
import { Bullet, EvidenceBadge, InfoNote, SafetyCaution, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { programById } from "@/lib/integrative/programs";
import { useProgramRuns } from "@/lib/programs/store";
import { usePets } from "@/providers/PetProvider";

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedPet } = usePets();
  const template = id ? programById(id) : undefined;
  const { runs, start, logDay, stop } = useProgramRuns(selectedPet?.id ?? "");

  const run = useMemo(
    () => runs.find((r) => r.templateId === id && r.status !== "stopped") ?? null,
    [runs, id],
  );

  if (!selectedPet) return <NoPetSelected />;

  if (!template) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Program" />
        <View style={{ padding: Space.md }}>
          <Card>
            <Text style={Fonts.body}>That program couldn&apos;t be found.</Text>
          </Card>
        </View>
      </View>
    );
  }

  const done = run?.status === "completed";
  const percent = run?.progress.percent ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={template.title} subtitle={`${template.days}-day program`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: 10 }}>
          <Text style={styles.summary}>{template.summary}</Text>
          <Text style={styles.who}>{template.who}</Text>
          <EvidenceBadge grade={template.evidence} long />
        </Card>

        {/* Progress / actions */}
        <Card style={{ gap: 12, marginTop: Space.md }}>
          {run ? (
            <>
              <View style={styles.progressHead}>
                <Text style={Fonts.h3}>{done ? "Completed 🎉" : "Your progress"}</Text>
                <Text style={styles.progressCount}>
                  {run.loggedDays.length} / {template.days} days
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.summaryLine}>{run.progress.summaryLine}</Text>
              {!done ? (
                <View style={styles.actionRow}>
                  <PrimaryButton
                    label="Log today"
                    icon={<CheckCircle2 size={18} color="#fff" />}
                    variant="primary"
                    onPress={() => logDay(run.id)}
                    style={{ flex: 1 }}
                  />
                  <Pressable
                    onPress={() => stop(run.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Stop program"
                    style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Square size={16} color={Colors.inkSoft} />
                    <Text style={styles.stopText}>Stop</Text>
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton
                  label="Add to vet report"
                  icon={<FileText size={18} color={Colors.teal800} />}
                  variant="outline"
                  onPress={() => router.push("/vet-report")}
                />
              )}
            </>
          ) : (
            <PrimaryButton
              label={`Start the ${template.days}-day program`}
              icon={<Play size={18} color="#fff" />}
              variant="primary"
              onPress={() => start(template.id)}
            />
          )}
        </Card>

        {/* Daily tasks */}
        <Text style={styles.section}>Daily tasks</Text>
        <Card style={{ gap: 10 }}>
          {template.dailyTasks.map((t, i) => (
            <View key={i} style={styles.taskRow}>
              <ListChecks size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
              <Text style={styles.taskText}>{t}</Text>
            </View>
          ))}
        </Card>

        {/* What to log */}
        <Text style={styles.section}>What to log</Text>
        <Card style={{ gap: 8 }}>
          {template.whatToLog.map((t, i) => (
            <Bullet key={i}>{t}</Bullet>
          ))}
        </Card>

        {/* Reminders */}
        <Text style={styles.section}>Suggested reminders</Text>
        <Card style={{ gap: 8 }}>
          {template.reminders.map((t, i) => (
            <View key={i} style={styles.taskRow}>
              <CalendarCheck size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
              <Text style={styles.taskText}>{t}</Text>
            </View>
          ))}
        </Card>

        {/* Stop and call vet */}
        <Text style={styles.section}>When to stop and call the vet</Text>
        <SafetyCaution>Stop the program and contact your vet if any of these happen:</SafetyCaution>
        <Card style={[styles.warnCard, { gap: 8, marginTop: 8 }]}>
          {template.stopAndCallVet.map((t, i) => (
            <Bullet key={i} tone="danger">
              {t}
            </Bullet>
          ))}
        </Card>

        {/* Completion hint */}
        <Text style={styles.section}>How to read the results</Text>
        <Card style={styles.hintCard}>
          <ClipboardList size={16} color={Colors.teal700} />
          <Text style={styles.hintText}>{template.completionHint}</Text>
        </Card>

        <View style={{ marginTop: Space.md }}>
          <InfoNote>
            Programs support healthy routines — they don&apos;t treat disease. Keep your vet in the loop, especially for
            recovery and elimination trials.
          </InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  summary: { ...Fonts.body, lineHeight: 21, color: Colors.ink },
  who: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressCount: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.cream2, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.teal600 },
  summaryLine: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
  },
  stopText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  section: { ...Fonts.h3, marginTop: Space.lg, marginBottom: 8 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  taskText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  warnCard: { backgroundColor: Colors.amber100 },
  hintCard: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  hintText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 19 },
});
