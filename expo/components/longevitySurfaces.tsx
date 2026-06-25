import { ChevronRight, Eye, HeartPulse, ShieldAlert } from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import type { ScoreBand } from "@/lib/health/score";
import {
  PATTERN_CONFIDENCE_LABEL,
  type DetectedPattern,
  type PatternConfidence,
} from "@/lib/integrative/patterns";

/** Compact surfaces that render the real pattern detector + health score inline
 *  on Today and the Timeline, without disturbing the existing layout. */

const BAND_COLOR: Record<ScoreBand, string> = {
  great: Colors.green600,
  good: Colors.teal600,
  watch: Colors.amber600,
  attention: Colors.red600,
};

const CONF_COLOR: Record<PatternConfidence, string> = {
  high: Colors.teal700,
  moderate: Colors.amber600,
  low: Colors.inkFaint,
};

export const HealthScoreChip = memo(function HealthScoreChip({
  overall,
  band,
  bandLabel,
  onPress,
}: {
  overall: number;
  band: ScoreBand;
  bandLabel: string;
  onPress: () => void;
}) {
  const color = BAND_COLOR[band];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Petwell Health Score ${overall} of 100, ${bandLabel}`}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.ring, { borderColor: color }]}>
        <Text style={[styles.ringNum, { color }]}>{overall}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.chipLabel}>Health Score</Text>
        <Text style={[styles.chipBand, { color }]}>{bandLabel}</Text>
      </View>
      <ChevronRight size={18} color={Colors.inkFaint} />
    </Pressable>
  );
});

const PatternMini = memo(function PatternMini({
  p,
  onPress,
}: {
  p: DetectedPattern;
  onPress: () => void;
}) {
  const conf = CONF_COLOR[p.confidence];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={p.name}
      style={({ pressed }) => [styles.mini, p.urgent && styles.miniUrgent, pressed && { opacity: 0.9 }]}
    >
      <View style={[styles.miniIcon, { backgroundColor: p.urgent ? Colors.red100 : Colors.teal50 }]}>
        {p.urgent ? <ShieldAlert size={16} color={Colors.red600} /> : <Eye size={16} color={Colors.teal700} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.miniName} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={styles.miniSys}>
          {p.systemLabel}
          {p.urgent ? <Text style={{ color: Colors.red600, fontWeight: "800" }}> · vet now</Text> : null}
        </Text>
      </View>
      {!p.urgent ? (
        <View style={[styles.confDot, { backgroundColor: conf }]} accessibilityLabel={PATTERN_CONFIDENCE_LABEL[p.confidence]} />
      ) : null}
    </Pressable>
  );
});

export const PatternsPreview = memo(function PatternsPreview({
  patterns,
  onSeeAll,
  onOpen,
  max = 2,
}: {
  patterns: DetectedPattern[];
  onSeeAll: () => void;
  onOpen: (p: DetectedPattern) => void;
  max?: number;
}) {
  if (patterns.length === 0) return null;
  return (
    <View>
      <View style={styles.head}>
        <Text style={Fonts.h2}>Patterns to watch</Text>
        <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all patterns">
          <Text style={styles.seeAll}>See all ({patterns.length})</Text>
        </Pressable>
      </View>
      <View style={{ gap: Space.sm }}>
        {patterns.slice(0, max).map((p) => (
          <PatternMini key={p.id} p={p} onPress={() => onOpen(p)} />
        ))}
      </View>
    </View>
  );
});

/** A tiny inline health-score badge (number + band) for headers/cards. */
export const HealthScoreBadge = memo(function HealthScoreBadge({
  overall,
  band,
}: {
  overall: number;
  band: ScoreBand;
}) {
  const color = BAND_COLOR[band];
  return (
    <View style={[styles.badge, { backgroundColor: color + "1A" }]}>
      <HeartPulse size={13} color={color} />
      <Text style={[styles.badgeText, { color }]}>{overall}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.sm,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  ring: { width: 46, height: 46, borderRadius: 23, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  ringNum: { fontSize: 17, fontWeight: "800" },
  chipLabel: { ...Fonts.h3, fontSize: 14 },
  chipBand: { ...Fonts.small, fontWeight: "800", marginTop: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Space.sm },
  seeAll: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  mini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  miniUrgent: { borderColor: Colors.red100, borderWidth: 1.5 },
  miniIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  miniName: { ...Fonts.h3, fontSize: 14.5 },
  miniSys: { ...Fonts.small, color: Colors.teal700, marginTop: 1 },
  confDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  badgeText: { fontSize: 13, fontWeight: "800" },
});
