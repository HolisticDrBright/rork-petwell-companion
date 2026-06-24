import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react-native";
import React, { memo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";

import Colors, { Fonts, Radius, Space, Urgency, cardShadow, softShadow, type UrgencyKey } from "@/constants/colors";
import type { AttentionItem, HealthSignal, PatternCard } from "@/types/pet";

export const Card = memo(function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
});

export const SectionTitle = memo(function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={Fonts.h2}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export const Pill = memo(function Pill({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
});

export const UrgencyBand = memo(function UrgencyBand({
  level,
  compact,
}: {
  level: UrgencyKey;
  compact?: boolean;
}) {
  const u = Urgency[level];
  return (
    <View style={[styles.band, { backgroundColor: u.bg }, compact && styles.bandCompact]}>
      <View style={[styles.bandDot, { backgroundColor: u.color }]} />
      <Text style={[styles.bandText, { color: u.color }]}>{u.label}</Text>
    </View>
  );
});

export const PrimaryButton = memo(function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "primary",
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "coral" | "ghost" | "outline";
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const isGhost = variant === "ghost";
  const isOutline = variant === "outline";
  const bg =
    variant === "coral" ? Colors.coral500 : variant === "primary" ? Colors.teal800 : "transparent";
  const fg = isGhost || isOutline ? Colors.teal800 : "#FFFFFF";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        isOutline && styles.buttonOutline,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>{label}</Text>
    </Pressable>
  );
});

export const GradientHeader = memo(function GradientHeader({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={[Colors.teal800, Colors.teal700]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
});

export const Disclaimer = memo(function Disclaimer({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.disclaimer, compact && styles.disclaimerCompact]}>
      <Text style={styles.disclaimerText}>
        Petwell does not replace veterinary care. If your pet has severe symptoms, seek emergency
        veterinary help.
      </Text>
    </View>
  );
});

// --- NEW: Health Signal Card ---
const TREND_ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

export const HealthSignalCard = memo(function HealthSignalCard({
  signal,
  onPress,
}: {
  signal: HealthSignal;
  onPress?: () => void;
}) {
  const TrendIcon = TREND_ICONS[signal.trend];
  const statusColor =
    signal.status === "good" ? Colors.green600 : signal.status === "watch" ? Colors.amber600 : Colors.red600;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.signalCard, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.signalTop}>
        <Text style={styles.signalLabel}>{signal.label}</Text>
        <TrendIcon size={14} color={signal.color} />
      </View>
      <Text style={[styles.signalValue, { color: signal.color }]}>
        {signal.value}
        {signal.unit ? <Text style={styles.signalUnit}>{signal.unit}</Text> : null}
      </Text>
      <View style={[styles.signalStatusBar, { backgroundColor: statusColor + "30" }]}>
        <View style={[styles.signalStatusFill, { backgroundColor: statusColor, width: `${signal.status === "good" ? 100 : signal.status === "watch" ? 55 : 25}%` }]} />
      </View>
    </Pressable>
  );
});

// --- NEW: Attention Item Row ---
export const AttentionRow = memo(function AttentionRow({
  item,
  onPress,
}: {
  item: AttentionItem;
  onPress?: () => void;
}) {
  const u = Urgency[item.urgency];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.attentionRow, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.attentionDot, { backgroundColor: u.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={Fonts.h3}>{item.label}</Text>
        <Text style={styles.attentionDetail}>{item.detail}</Text>
      </View>
      {item.action ? (
        <View style={[styles.attentionBtn, { backgroundColor: u.bg }]}>
          <Text style={[styles.attentionBtnText, { color: u.color }]}>{item.action}</Text>
          <ChevronRight size={13} color={u.color} />
        </View>
      ) : null}
    </Pressable>
  );
});

// --- NEW: Pattern Card ---
const PATTERN_META = {
  insight: { icon: "💡", color: Colors.teal700, bg: Colors.teal50, label: "" },
  progress: { icon: "📈", color: Colors.green600, bg: Colors.green100, label: "Progress" },
  attention: { icon: "⚠️", color: Colors.amber600, bg: Colors.amber100, label: "Needs attention" },
  correlation: { icon: "🔗", color: Colors.coral500, bg: Colors.coral100, label: "Pattern found" },
} as const;

export const PatternCardView = memo(function PatternCardView({
  pattern,
  compact,
}: {
  pattern: PatternCard;
  compact?: boolean;
}) {
  const m = PATTERN_META[pattern.type];
  return (
    <View style={[styles.patternCard, compact && styles.patternCardCompact, { backgroundColor: m.bg }]}>
      <Text style={[styles.patternLabel, { color: m.color }]}>
        {m.icon} {m.label || pattern.title}
      </Text>
      <Text style={[styles.patternBody, compact && styles.patternBodyCompact]} numberOfLines={compact ? 3 : undefined}>
        {pattern.body}
      </Text>
      {pattern.evidence ? (
        <Text style={styles.patternEvidence}>{pattern.evidence}</Text>
      ) : null}
    </View>
  );
});

// --- NEW: Quick Log Chip ---
export const QuickLogChip = memo(function QuickLogChip({
  label,
  icon,
  color = Colors.teal700,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickLog, { borderColor: color + "40" }, pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] }]}
    >
      <View style={[styles.quickLogIcon, { backgroundColor: color + "15" }]}>{icon}</View>
      <Text style={[styles.quickLogText, { color }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.md, ...cardShadow },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Space.sm },
  sectionAction: { ...Fonts.small, color: Colors.teal700 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700" },
  band: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.pill, alignSelf: "flex-start",
  },
  bandCompact: { paddingVertical: 6, paddingHorizontal: 10 },
  bandDot: { width: 9, height: 9, borderRadius: 999 },
  bandText: { fontSize: 14, fontWeight: "800" },
  button: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, paddingHorizontal: 18, borderRadius: Radius.md,
  },
  buttonSmall: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.sm },
  buttonOutline: { borderWidth: 1.5, borderColor: Colors.teal800 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  buttonTextSmall: { fontSize: 13 },
  gradient: { borderRadius: Radius.lg },
  disclaimer: {
    backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: Space.md,
    borderWidth: 1, borderColor: Colors.teal100,
  },
  disclaimerCompact: { padding: Space.sm },
  disclaimerText: { fontSize: 12.5, lineHeight: 18, color: Colors.teal900, fontWeight: "500" },
  // Health signal
  signalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Space.sm, minWidth: 100, flex: 1, ...softShadow,
  },
  signalTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  signalLabel: { ...Fonts.tiny, textTransform: "capitalize" },
  signalValue: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  signalUnit: { fontSize: 11, fontWeight: "700", color: Colors.inkFaint },
  signalStatusBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  signalStatusFill: { height: 4, borderRadius: 2 },
  // Attention row
  attentionRow: {
    flexDirection: "row", alignItems: "center", gap: Space.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.hairline,
  },
  attentionDot: { width: 8, height: 8, borderRadius: 4 },
  attentionDetail: { ...Fonts.small, lineHeight: 18, marginTop: 2 },
  attentionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill,
  },
  attentionBtnText: { fontSize: 11.5, fontWeight: "800" },
  // Pattern card
  patternCard: { borderRadius: Radius.md, padding: Space.md, gap: 6 },
  patternCardCompact: { minWidth: 220, maxWidth: 280 },
  patternLabel: { fontSize: 12, fontWeight: "800" },
  patternBody: { ...Fonts.body, lineHeight: 21, color: Colors.ink },
  patternBodyCompact: { fontSize: 14 },
  patternEvidence: { ...Fonts.small, fontSize: 12, color: Colors.inkFaint, fontStyle: "italic" },
  // Quick log
  quickLog: {
    alignItems: "center", gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1,
    minWidth: 70, ...softShadow,
  },
  quickLogIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  quickLogText: { fontSize: 11.5, fontWeight: "700", textAlign: "center" },
});
