import { useRouter } from "expo-router";
import {
  Activity,
  Bone,
  Camera,
  Droplet,
  HeartPulse,
  Pill,
  Scale,
  Sparkles,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
} from "lucide-react-native";
import React, { memo, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BarChart, LineChart } from "@/components/Charts";
import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, PatternCardView } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";
import type { LogCategory, TimelineEntry } from "@/types/pet";

const CAT_META: Record<
  LogCategory,
  { label: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string }
> = {
  food: { label: "Food", icon: Bone, color: Colors.teal600 },
  stool: { label: "Stool", icon: Droplet, color: Colors.green600 },
  skin: { label: "Skin/itching", icon: Sparkles, color: Colors.amber600 },
  weight: { label: "Weight", icon: Scale, color: Colors.teal800 },
  activity: { label: "Activity", icon: Activity, color: Colors.coral500 },
  meds: { label: "Meds", icon: Pill, color: Colors.teal700 },
  vet: { label: "Vet visits", icon: Stethoscope, color: Colors.teal900 },
  scan: { label: "Scans", icon: Camera, color: Colors.coral600 },
  symptom: { label: "Symptoms", icon: HeartPulse, color: Colors.red500 },
};

const FILTERS: (LogCategory | "all")[] = ["all", "food", "stool", "skin", "weight", "activity", "meds", "vet", "scan", "symptom"];

function formatDateHeader(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date("2026-06-25T00:00:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  const label = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  if (diff === 0) return `Today · ${label}`;
  if (diff === 1) return `Yesterday · ${label}`;
  return label;
}

const EntryRow = memo(function EntryRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const meta = CAT_META[entry.category];
  const Icon = meta.icon;
  return (
    <View style={styles.entryRow}>
      <View style={styles.timelineCol}>
        <View style={[styles.entryIcon, { backgroundColor: meta.color + "1A" }]}>
          <Icon size={16} color={meta.color} />
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryTop}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <Text style={styles.entryTime}>{entry.time}</Text>
        </View>
        {entry.detail ? <Text style={styles.entryDetail}>{entry.detail}</Text> : null}
        {entry.urgency ? (
          <View style={[styles.urgencyPill, { backgroundColor: entry.urgency === "green" ? Colors.green100 : Colors.amber100 }]}>
            <Text style={[styles.urgencyText, { color: entry.urgency === "green" ? Colors.green600 : Colors.amber600 }]}>
              {entry.urgency === "green" ? "OK" : "Monitor"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet, timeline, patternCards, trends } = usePets();
  const [filter, setFilter] = useState<LogCategory | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? timeline : timeline.filter((e) => e.category === filter)),
    [filter, timeline]
  );

  const grouped = useMemo(() => {
    const map: Record<string, TimelineEntry[]> = {};
    filtered.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
      </View>

      <Text style={styles.title}>{selectedPet.name}'s health timeline</Text>

      {/* Pattern cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What the data shows</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
        >
          {patternCards.map((p) => (
            <PatternCardView key={p.id} pattern={p} compact />
          ))}
        </ScrollView>
      </View>

      {/* Charts */}
      <View style={styles.section}>
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={Fonts.h3}>Stool score</Text>
            <Text style={styles.chartTrend}>Improving ↑</Text>
          </View>
          <LineChart values={trends.stool} color={Colors.green600} height={120} width={300} />
          <Text style={styles.chartFoot}>Last 7 logs · higher is firmer</Text>
        </View>
      </View>

      <View style={styles.chartsRow}>
        <View style={styles.chartCardSmall}>
          <Text style={styles.chartLabelSmall}>Itching</Text>
          <LineChart values={trends.itching} color={Colors.amber600} height={70} width={150} />
        </View>
        <View style={styles.chartCardSmall}>
          <Text style={styles.chartLabelSmall}>Weight (lb)</Text>
          <LineChart values={trends.weight} color={Colors.teal800} height={70} width={150} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={Fonts.h3}>Activity & sleep</Text>
            <Text style={[styles.chartTrend, { color: Colors.coral600 }]}>Active</Text>
          </View>
          <BarChart values={trends.activity} color={Colors.coral500} labels={["M", "T", "W", "T", "F", "S", "S"]} />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.section}>
        <Text style={styles.filterLabel}>Filter by category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          style={{ marginTop: 4 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            const label = f === "all" ? "All" : CAT_META[f].label;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        {grouped.map(([date, entries]) => (
          <View key={date} style={styles.dayGroup}>
            <Text style={styles.dayHeader}>{formatDateHeader(date)}</Text>
            <Card style={{ paddingVertical: 4 }}>
              {entries.map((e, i) => (
                <EntryRow key={e.id} entry={e} isLast={i === entries.length - 1} />
              ))}
            </Card>
          </View>
        ))}
        {grouped.length === 0 ? (
          <Text style={styles.empty}>No {filter === "all" ? "" : CAT_META[filter].label.toLowerCase() + " "}logs yet.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  title: { ...Fonts.title, paddingHorizontal: Space.md, marginBottom: Space.md },
  section: { paddingHorizontal: Space.md, marginTop: Space.lg },
  sectionTitle: { ...Fonts.h2, marginBottom: Space.sm },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.md, ...cardShadow },
  chartHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  chartTrend: { ...Fonts.small, color: Colors.green600, fontWeight: "800" },
  chartFoot: { ...Fonts.small, color: Colors.inkFaint, marginTop: 4 },
  chartsRow: { flexDirection: "row", gap: Space.sm, paddingHorizontal: Space.md, marginTop: Space.sm },
  chartCardSmall: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Space.sm, ...cardShadow },
  chartLabelSmall: { ...Fonts.small, marginBottom: 4 },
  filterLabel: { ...Fonts.tiny, letterSpacing: 0.3 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.hairline,
  },
  filterChipActive: { backgroundColor: Colors.teal800, borderColor: Colors.teal800 },
  filterText: { ...Fonts.small, color: Colors.inkSoft },
  filterTextActive: { color: "#fff" },
  dayGroup: { marginBottom: Space.lg },
  dayHeader: { ...Fonts.h3, color: Colors.teal800, marginBottom: 8 },
  entryRow: { flexDirection: "row", gap: 12 },
  timelineCol: { alignItems: "center", width: 32 },
  entryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.hairline, marginVertical: 2 },
  entryContent: { flex: 1, paddingBottom: 16, paddingTop: 4 },
  entryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryTitle: { ...Fonts.h3, fontSize: 15, flex: 1 },
  entryTime: { ...Fonts.small, color: Colors.inkFaint },
  entryDetail: { ...Fonts.small, marginTop: 2, lineHeight: 18 },
  urgencyPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, alignSelf: "flex-start", marginTop: 4 },
  urgencyText: { fontSize: 10, fontWeight: "800" },
  empty: { ...Fonts.bodySoft, textAlign: "center", paddingVertical: Space.xl },
});
