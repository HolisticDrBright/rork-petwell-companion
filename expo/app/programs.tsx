import { Stack, useRouter } from "expo-router";
import { CalendarCheck, ChevronRight, PlayCircle } from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { NoPetSelected } from "@/components/NoPetSelected";
import { EvidenceBadge, InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Space } from "@/constants/colors";
import { programsForSpecies } from "@/lib/integrative/programs";
import { useProgramRuns } from "@/lib/programs/store";
import { usePets } from "@/providers/PetProvider";

export default function ProgramsScreen() {
  const router = useRouter();
  const { selectedPet } = usePets();
  const programs = useMemo(() => (selectedPet ? programsForSpecies(selectedPet.species) : []), [selectedPet]);
  const { runs } = useProgramRuns(selectedPet?.id);
  const activeByTemplate = useMemo(() => {
    const m: Record<string, (typeof runs)[number]> = {};
    for (const r of runs) if (r.status !== "stopped") m[r.templateId] = r;
    return m;
  }, [runs]);

  if (!selectedPet) return <NoPetSelected />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Progress programs" subtitle={`Guided plans for ${selectedPet.name}`} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <InfoNote>
          Short, guided programs turn a support plan into daily steps you can log. Each one tells you when to stop and
          call your vet, and can be added to your vet report.
        </InfoNote>

        {runs.length > 0 ? (
          <>
            <Text style={styles.section}>In progress</Text>
            {runs
              .filter((r) => r.status !== "stopped")
              .map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => router.push({ pathname: "/program-detail", params: { id: r.templateId } })}
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <Card style={styles.activeCard}>
                    <PlayCircle size={20} color={Colors.teal700} />
                    <View style={{ flex: 1 }}>
                      <Text style={Fonts.h3}>{r.progress.summaryLine}</Text>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${r.progress.percent}%` }]} />
                      </View>
                    </View>
                    <ChevronRight size={18} color={Colors.inkFaint} />
                  </Card>
                </Pressable>
              ))}
          </>
        ) : null}

        <Text style={styles.section}>All programs</Text>
        {programs.map((p) => {
          const active = activeByTemplate[p.id];
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: "/program-detail", params: { id: p.id } })}
              accessibilityRole="button"
              accessibilityLabel={p.title}
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            >
              <Card style={styles.row}>
                <View style={styles.iconWrap}>
                  <CalendarCheck size={18} color={Colors.teal700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{p.title}</Text>
                  <Text style={styles.days}>
                    {p.days} days · {p.who}
                  </Text>
                  <View style={styles.metaRow}>
                    <EvidenceBadge grade={p.evidence} />
                    {active ? <Text style={styles.activeTag}>In progress</Text> : null}
                  </View>
                </View>
                <ChevronRight size={20} color={Colors.inkFaint} />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  section: { ...Fonts.h2, fontSize: 17, marginTop: Space.lg, marginBottom: Space.sm },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Space.sm },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.cream2, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.teal600 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Space.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  days: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  activeTag: { ...Fonts.tiny, color: Colors.teal700, fontWeight: "800" },
});
