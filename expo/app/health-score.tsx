import { Stack, useRouter } from "expo-router";
import { Activity, Bone, Brain, Droplets, HeartPulse, Scale, Smile, Sparkles, Stethoscope } from "lucide-react-native";
import React, { memo, useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { computeHealthScore, SCORE_BAND_LABEL, type ScoreBand, type SystemSubScore } from "@/lib/health/score";
import { usePets } from "@/providers/PetProvider";
import { integrativeService } from "@/services";

const BAND_COLOR: Record<ScoreBand, string> = {
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
        <View style={[styles.barFill, { width: `${s.score}%`, backgroundColor: color }]} />
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
  const { selectedPet, timeline, trends, mode } = usePets();
  const score = useMemo(
    () => computeHealthScore(selectedPet, timeline, trends),
    [selectedPet, timeline, trends],
  );
  const color = BAND_COLOR[score.band];

  // Best-effort: snapshot the score once per pet in remote mode (no-op locally).
  const savedRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "remote") return;
    if (savedRef.current === selectedPet.id) return;
    savedRef.current = selectedPet.id;
    integrativeService.saveHealthScore(selectedPet.id, score).catch(() => {});
  }, [mode, selectedPet.id, score]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Petwell Health Score" subtitle={`${selectedPet.name} · updated ${score.generatedAt}`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {/* Overall ring */}
        <Card style={styles.overallCard}>
          <View style={[styles.ring, { borderColor: color }]}>
            <Text style={[styles.ringScore, { color }]}>{score.overall}</Text>
            <Text style={styles.ringOf}>/ 100</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={[styles.bandPill, { backgroundColor: color + "22" }]}>
              <Text style={[styles.bandText, { color }]}>{SCORE_BAND_LABEL[score.band]}</Text>
            </View>
            <Text style={styles.headline}>{score.headline}</Text>
            <Text style={styles.signals}>
              {score.loggedSignals} of 8 systems have recent log data.
            </Text>
          </View>
        </Card>

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
