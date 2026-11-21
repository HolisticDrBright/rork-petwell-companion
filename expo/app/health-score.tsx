import { Stack, useRouter } from "expo-router";
import { Activity, Bone, Brain, Droplets, HeartPulse, Scale, Smile, Sparkles, Stethoscope } from "lucide-react-native";
import React, { memo, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, LoadFailed } from "@/components/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart } from "@/components/Charts";
import { CapabilityDisclosure } from "@/components/CapabilityDisclosure";
import { NoPetSelected } from "@/components/NoPetSelected";
import { InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { computeHealthScore, SCORE_BAND_LABEL, type ScoreBand, type SystemSubScore } from "@/lib/health/score";
import { usePets } from "@/providers/PetProvider";
import { integrativeService } from "@/services";

const BAND_COLOR: Record<ScoreBand, string> = {
  insufficient: Colors.inkFaint,
  great: Colors.green600,
  good: Colors.teal600,
  watch: Colors.amber600,
  attention: Colors.red600,
};

const SYSTEM_ICON: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  digestion: Bone,
  skin: Sparkles,
  weight: Scale,
  activity: Activity,
  dental: Smile,
  hydration: Droplets,
  stress: Brain,
  senior: HeartPulse,
};

const SubScoreCard = memo(function SubScoreCard({ s }: { s: SystemSubScore }) {
  const color = BAND_COLOR[s.band];
  const Icon = SYSTEM_ICON[s.key] ?? HeartPulse;
  return (
    <Card style={styles.subCard}>
      <View style={styles.subHead}>
        <View style={[styles.subIcon, { backgroundColor: color + "22" }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.h3}>{s.label}</Text>
          <Text style={[styles.subStatus, { color }]}>{s.status}</Text>
        </View>
        <Text style={[styles.subScore, { color }]}>{s.hasData ? s.score : "—"}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${s.hasData ? s.score : 0}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.subBody}>
        <Text style={styles.kv}>
          <Text style={styles.kvKey}>What changed · </Text>
          {s.changed}
        </Text>
        <Text style={styles.kv}>
          <Text style={styles.kvKey}>Why it matters · </Text>
          {s.why}
        </Text>
        <Text style={styles.kv}>
          <Text style={styles.kvKey}>What to do next · </Text>
          {s.next}
        </Text>
        {s.influencedBy.length > 0 ? (
          <Text style={styles.influenced}>
            From: {s.influencedBy.slice(0, 3).join(" · ")}
          </Text>
        ) : (
          <Text style={styles.influenced}>No recent logs influenced this yet.</Text>
        )}
      </View>
    </Card>
  );
});

export default function HealthScoreScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedPet, timeline, trends, mode, timelineFailed, timelineLoading, todayIso, retryTimeline } = usePets();
  const petId = selectedPet?.id ?? "";
  const score = useMemo(() => selectedPet ? computeHealthScore(selectedPet, timeline, trends, todayIso) : null,
    [selectedPet, timeline, trends, todayIso]);
  const { data: history, isError: historyFailed } = useQuery({
    queryKey: ["health-score-history", petId],
    enabled: !!petId && mode === "remote",
    queryFn: () => integrativeService.healthScoreHistory(petId),
  });

  useEffect(() => {
    if (!petId || !score || score.overall === null || mode !== "remote" || timelineFailed || timelineLoading) return;
    void integrativeService.saveHealthScore(petId, score)
      .then(() => queryClient.invalidateQueries({ queryKey: ["health-score-history", petId] }))
      .catch(() => {});
  }, [mode, petId, score, timelineFailed, timelineLoading, queryClient]);

  if (!selectedPet || !score) return <NoPetSelected />;

  // The score is computed from the logs. With none loaded it would still
  // render a number and a headline — "doing great across the board" — about a
  // pet we know nothing about right now. Refuse to score instead.
  if (timelineFailed) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Petwell Health Score" subtitle={selectedPet.name} />
        <ScrollView contentContainerStyle={{ padding: Space.md }}>
          <Card>
            <LoadFailed
              title="Can't score right now"
              subtitle={`The score is built from ${selectedPet.name}'s logs, and those didn't load. We'd rather show nothing than a score based on missing data.`}
              onRetry={retryTimeline}
            />
          </Card>
        </ScrollView>
      </View>
    );
  }

  const color = BAND_COLOR[score.band];
  const coverageRows = [
    ["Weight measurements", score.coverage.weight, "60 days"],
    ["Symptom and wellness logs", score.coverage.symptoms, "30 days"],
    ["Activity logs", score.coverage.activity, "30 days"],
    ["Medication logs", score.coverage.medicationLogs, "30 days"],
    ["Vet visit logs", score.coverage.vetVisits, "30 days"],
  ] as const;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Petwell Health Score" subtitle={`${selectedPet.name} · updated ${score.generatedAt}`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <CapabilityDisclosure feature="score" remote={mode === "remote"} />
        {/* Overall ring */}
        <Card style={styles.overallCard}>
          <View style={[styles.ring, { borderColor: color }]}>
            <Text style={[styles.ringScore, { color }]}>{score.overall ?? "—"}</Text>
            {score.overall !== null ? <Text style={styles.ringOf}>/ 100</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.bandPill, { backgroundColor: color + "22" }]}>
              <Text style={[styles.bandText, { color }]}>{SCORE_BAND_LABEL[score.band]}</Text>
            </View>
            <Text style={styles.headline}>{score.headline}</Text>
            <Text style={styles.signals}>
              {score.loggedSignals} of 7 trackable systems contributed.
            </Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>How your score was calculated</Text>
        <Card style={styles.subCard}>
          <Text style={Fonts.body}>Log coverage: {score.confidence}</Text>
          <Text style={Fonts.small}>Each logged system carries equal weight. At least two systems are needed. Coverage describes the logs and does not establish clinical accuracy.</Text>
          {score.inputs.map(input => (
            <View key={input.key} style={{ gap: 3 }}>
              <Text style={Fonts.h3}>{input.label} · {input.contribution} points</Text>
              <Text style={Fonts.small}>System score {input.rawValue}/100 · {(input.weight * 100).toFixed(1)}% weight</Text>
              <Text style={Fonts.small}>{input.observations.join(" · ")}</Text>
            </View>
          ))}
          <Text style={Fonts.small}>Contributions are shown as whole points. Medication and visit counts give context and do not affect the score.</Text>
          {coverageRows.map(([label, count, window]) => (
            <Text key={label} style={Fonts.small}>{label} ({window}) · {count}</Text>
          ))}
        </Card>

        {mode === "remote" ? <Card style={styles.subCard}>
          <Text style={Fonts.h3}>Score history</Text>
          {historyFailed ? <Text style={Fonts.small}>Couldn’t load score history.</Text> :
            (history?.length ?? 0) < 2 ? <Text style={Fonts.small}>At least two saved days are needed for a trend.</Text> : (
              <><LineChart width={250} height={80} values={history!.map(s => s.overall)} />
                <Text style={Fonts.small}>{history![0].generated_at} to {history!.at(-1)?.generated_at}</Text></>
            )}
        </Card> : null}

        <Text style={styles.sectionTitle}>System sub-scores</Text>
        {score.systems.map((s) => (
          <SubScoreCard key={s.key} s={s} />
        ))}

        <View style={{ marginTop: Space.md }}>
          <InfoNote>
            This score is a wellness signal from your own logs — not a diagnosis. The more you log, the sharper it
            gets. Share trends with your vet.
          </InfoNote>
        </View>

        <Card style={styles.ctaCard}>
          <Stethoscope size={18} color={Colors.teal700} />
          <Text style={styles.ctaText}>Want to act on a low area? Open Patterns to Watch for next steps.</Text>
          <Text style={styles.ctaLink} onPress={() => router.push("/patterns")}>
            See patterns →
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  overallCard: { flexDirection: "row", alignItems: "center", gap: Space.md },
  ring: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  ringScore: { fontSize: 30, fontWeight: "800", letterSpacing: -1 },
  ringOf: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: -2 },
  bandPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  bandText: { fontSize: 12.5, fontWeight: "800" },
  headline: { ...Fonts.body, marginTop: 8, lineHeight: 21 },
  signals: { ...Fonts.small, color: Colors.inkFaint, marginTop: 6 },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg, marginBottom: Space.sm },
  subCard: { marginBottom: Space.sm, gap: 10 },
  subHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  subIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  subStatus: { ...Fonts.small, marginTop: 1, fontWeight: "700" },
  subScore: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.cream2, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  subBody: { gap: 5 },
  kv: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  kvKey: { fontWeight: "800", color: Colors.ink },
  influenced: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 2 },
  ctaCard: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Space.md },
  ctaText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 18 },
  ctaLink: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
});
