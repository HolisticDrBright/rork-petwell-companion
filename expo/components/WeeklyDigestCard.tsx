import { Flame } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius } from "@/constants/colors";
import { computeWeeklyDigest } from "@/lib/insights/weekly";
import type { TimelineEntry } from "@/types/pet";

/**
 * "Your week" card — honest counts/averages of what the owner logged, plus the
 * logging streak. No interpretation, no clinical claims; it exists to make the
 * logging habit visibly worth keeping.
 */
export function WeeklyDigestCard({
  timeline,
  todayIso,
  petName,
}: {
  timeline: TimelineEntry[];
  todayIso: string;
  petName: string;
}) {
  const digest = useMemo(() => computeWeeklyDigest(timeline, todayIso, petName), [timeline, todayIso, petName]);

  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.head}>
        <Text style={styles.title}>Your week</Text>
        {digest.streakDays >= 2 ? (
          <View style={styles.streakPill}>
            <Flame size={13} color={Colors.coral600} />
            <Text style={styles.streakText}>{digest.streakDays}-day streak</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.headline}>{digest.headline}</Text>
      {digest.lines.slice(0, 3).map((l, i) => (
        <View key={i} style={styles.lineRow}>
          <View style={styles.dot} />
          <Text style={styles.lineText}>{l}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...Fonts.h3, fontSize: 15 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.coral100,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  streakText: { ...Fonts.tiny, color: Colors.coral600, fontWeight: "800" },
  headline: { ...Fonts.body, color: Colors.ink, fontWeight: "700" },
  lineRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.teal500, marginTop: 7 },
  lineText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 19 },
});
