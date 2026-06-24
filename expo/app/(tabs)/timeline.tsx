import { useRouter } from "expo-router";
import {
  Activity,
  Bone,
  Camera,
  Droplet,
  HeartPulse,
  Pill,
  Plus,
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
import { Card, EmptyState } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { TODAY_ISO } from "@/constants/mockData";
import { usePets } from "@/providers/PetProvider";
import type { LogCategory, TimelineEntry } from "@/types/pet";

/** Derive a trend label from data — never a hardcoded claim. */
function trendInfo(values: number[], higherIsBetter: boolean, up: string, down: string) {
  if (!values || values.length < 2) return { label: "Not enough data", color: Colors.inkFaint, delta: 0 };
  const delta = Math.round((values[values.length - 1] - values[0]) * 10) / 10;
  if (Math.abs(delta) < 0.3) return { label: "Steady →", color: Colors.inkFaint, delta };
  const improving = higherIsBetter ? delta > 0 : delta < 0;
  return { label: improving ? up : down, color: improving ? Colors.green600 : Colors.amber600, delta };
}

function deltaText(delta: number, unit = ""): string {
  if (Math.abs(delta) < 0.05) return "No change since first log";
  return `${delta > 0 ? "▲ +" : "▼ "}${delta}${unit} since first log`;
}

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

const FILTERS: (LogCategory | "all")[] = [
  "all",
  "food",
  "stool",
  "skin",
  "weight",
  "activity",
  "meds",
  "symptom",
  "vet",
  "scan",
];

const INSIGHT_META = {
  pattern: { icon: Sparkles, color: Colors.teal700, bg: Colors.teal50, label: "Possible pattern found" },
  progress: { icon: TrendingUp, color: Colors.green600, bg: Colors.green100, label: "Progress" },
  attention: { icon: TriangleAlert, color: Colors.amber600, bg: Colors.amber100, label: "Needs attention" },
} as const;

function formatDateHeader(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(TODAY_ISO + "T00:00:00");
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
      </View>
    </View>
  );
});

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet, timeline, insightCards, trends } = usePets();
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

  // Trends derived from the actual logged values (no hardcoded claims).
  const stoolTrend = useMemo(() => trendInfo(trends.stool, true, "Improving ↑", "Softer ↓"), [trends.stool]);
  const activityAvg = useMemo(
    () => trends.activity.reduce((a, b) => a + b, 0) / (trends.activity.length || 1),
    [trends.activity]
  );
  const activityLabel = activityAvg >= 6 ? "Active" : activityAvg >= 4 ? "Moderate" : "Calmer";
  const weightDelta = useMemo(
    () => Math.round((trends.weight[trends.weight.length - 1] - trends.weight[0]) * 10) / 10,
    [trends.weight]
  );
  const itchDelta = useMemo(
    () => Math.round((trends.itching[trends.itching.length - 1] - trends.itching[0]) * 10) / 10,
    [trends.itching]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{selectedPet.name}&apos;s timeline</Text>
        <Pressable
          testID="timeline-add-log"
          onPress={() => router.push("/log")}
          accessibilityRole="button"
          accessibilityLabel="Add a log"
          style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.85 }]}
        >
          <Plus size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.logBtnText}>Log</Text>
        </Pressable>
      </View>

      {/* Insight cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: Space.md, paddingVertical: 4 }}
        style={{ marginHorizontal: -Space.md }}
      >
        {insightCards.map((c, i) => {
          const m = INSIGHT_META[c.type];
          return (
            <View key={i} style={[styles.insightCard, { backgroundColor: m.bg }]}>
              <View style={styles.insightHead}>
                <m.icon size={16} color={m.color} />
                <Text style={[styles.insightLabel, { color: m.color }]}>{m.label}</Text>
              </View>
              <Text style={styles.insightBody}>{c.body}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Charts */}
      <View style={styles.section}>
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={Fonts.h3}>Stool score</Text>
            <Text style={[styles.chartTrend, { color: stoolTrend.color }]}>{stoolTrend.label}</Text>
          </View>
          <LineChart values={trends.stool} color={Colors.green600} height={120} width={300} />
          <Text style={styles.chartFoot}>Higher is firmer · {deltaText(stoolTrend.delta)}</Text>
        </View>
      </View>

      <View style={styles.chartsRow}>
        <View style={[styles.chartCardSmall]}>
          <Text style={styles.chartLabelSmall}>Itching (0–10)</Text>
          <LineChart values={trends.itching} color={Colors.amber600} height={70} width={150} />
          <Text style={styles.smallDelta}>{deltaText(itchDelta)}</Text>
        </View>
        <View style={[styles.chartCardSmall]}>
          <Text style={styles.chartLabelSmall}>Weight (lb)</Text>
          <LineChart values={trends.weight} color={Colors.teal800} height={70} width={150} />
          <Text style={styles.smallDelta}>{deltaText(weightDelta, " lb")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={Fonts.h3}>Activity & sleep</Text>
            <Text style={[styles.chartTrend, { color: Colors.coral600 }]}>{activityLabel}</Text>
          </View>
          <BarChart
            values={trends.activity}
            color={Colors.coral500}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: Space.md }}
        style={{ marginTop: Space.lg, marginHorizontal: -Space.md }}
      >
        {FILTERS.map((f) => {
          const active = filter === f;
          const label = f === "all" ? "All" : CAT_META[f].label;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${label}`}
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
          <EmptyState
            title={filter === "all" ? "No logs yet" : `No ${CAT_META[filter].label.toLowerCase()} logs yet`}
            subtitle={
              filter === "all"
                ? "Tap Log to capture meals, symptoms, weight and more — it builds the trends above."
                : "Try another filter, or tap Log to add one."
            }
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.md,
    marginBottom: Space.md,
  },
  title: { ...Fonts.title, flex: 1 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.coral500,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  logBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  insightCard: { width: 250, borderRadius: Radius.md, padding: Space.md, gap: 8 },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  insightLabel: { fontSize: 13, fontWeight: "800" },
  insightBody: { ...Fonts.body, lineHeight: 20, color: Colors.ink },
  section: { paddingHorizontal: Space.md, marginTop: Space.lg },
  chartCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.md, ...cardShadow },
  chartHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  chartTrend: { ...Fonts.small, color: Colors.green600, fontWeight: "800" },
  chartFoot: { ...Fonts.small, color: Colors.inkFaint, marginTop: 4 },
  chartsRow: { flexDirection: "row", gap: Space.sm, paddingHorizontal: Space.md, marginTop: Space.sm },
  chartCardSmall: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.sm,
    ...cardShadow,
  },
  chartLabelSmall: { ...Fonts.small, marginBottom: 4 },
  smallDelta: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
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
});
