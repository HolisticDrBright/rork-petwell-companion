/**
 * Shared UI primitives for AI features — a consistent sparkle button, the standing
 * AI disclaimer, an emergency/poison safety banner, and a disabled note. Keeping
 * these in one place means every AI surface carries the same safety framing.
 */
import { AlertTriangle, Sparkles } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { AI_DISCLAIMER } from "@/lib/ai/safety";

export function AiSparkleButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.teal700} />
      ) : (
        <Sparkles size={16} color={Colors.teal700} />
      )}
      <Text style={styles.btnText}>{loading ? "Working…" : label}</Text>
    </Pressable>
  );
}

/** Standing "AI-generated · not veterinary advice" footnote. */
export function AiDisclaimer() {
  return <Text style={styles.disclaimer}>{AI_DISCLAIMER}</Text>;
}

/** Deterministic emergency / poison-control banner. Shown whenever routing is set. */
export function AiSafetyBanner({ banner }: { banner: string | null | undefined }) {
  if (!banner) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <AlertTriangle size={18} color={Colors.coral600} />
      <Text style={styles.bannerText}>{banner}</Text>
    </View>
  );
}

/** Friendly note when an AI feature is unavailable (off / no key / over budget). */
export function AiDisabledNote({ reason }: { reason?: string }) {
  return <Text style={styles.disabledNote}>{reason || "AI features are turned off."}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.teal700,
    backgroundColor: Colors.teal50,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...Fonts.small, color: Colors.teal800, fontWeight: "800" },
  disclaimer: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 15, marginTop: 8 },
  banner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.coral100,
    borderRadius: Radius.md,
    padding: Space.sm,
    marginTop: Space.sm,
  },
  bannerText: { ...Fonts.small, color: Colors.coral600, flex: 1, lineHeight: 18, fontWeight: "700" },
  disabledNote: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18, marginTop: 6, fontStyle: "italic" },
});
