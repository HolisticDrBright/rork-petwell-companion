import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { memo, useCallback } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";

import Colors, { Fonts, Radius, Space, Urgency, cardShadow, type UrgencyKey } from "@/constants/colors";

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
    <View
      style={[styles.band, { backgroundColor: u.bg }, compact && styles.bandCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Urgency: ${u.label}`}
    >
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
  disabled = false,
  accessibilityHint,
  haptic = true,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "coral" | "ghost" | "outline";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityHint?: string;
  haptic?: boolean;
}) {
  const isGhost = variant === "ghost";
  const isOutline = variant === "outline";
  const bg =
    variant === "coral" ? Colors.coral500 : variant === "primary" ? Colors.teal800 : "transparent";
  const fg = isGhost || isOutline ? Colors.teal800 : "#FFFFFF";

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic && Platform.OS !== "web") Haptics.selectionAsync();
    onPress?.();
  }, [disabled, haptic, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        isOutline && styles.buttonOutline,
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
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

export const Disclaimer = memo(function Disclaimer() {
  return (
    <View style={styles.disclaimer}>
      <Text style={styles.disclaimerText}>
        Petwell does not replace veterinary care. If your pet has severe symptoms, seek emergency
        veterinary help.
      </Text>
    </View>
  );
});

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty} accessibilityRole="text" accessibilityLabel={title}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    ...cardShadow,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Space.sm,
  },
  sectionAction: { ...Fonts.small, color: Colors.teal700 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  band: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    alignSelf: "flex-start",
  },
  bandCompact: { paddingVertical: 6, paddingHorizontal: 10 },
  bandDot: { width: 9, height: 9, borderRadius: 999 },
  bandText: { fontSize: 14, fontWeight: "800" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
  },
  buttonOutline: { borderWidth: 1.5, borderColor: Colors.teal800 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  gradient: { borderRadius: Radius.lg },
  disclaimer: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  disclaimerText: { fontSize: 12.5, lineHeight: 18, color: Colors.teal900, fontWeight: "500" },
  empty: { alignItems: "center", paddingVertical: Space.lg, paddingHorizontal: Space.md, gap: 6 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { ...Fonts.h3, textAlign: "center" },
  emptySub: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", lineHeight: 18, maxWidth: 280 },
});
