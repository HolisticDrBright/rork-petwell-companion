import { useRouter } from "expo-router";
import { AlertTriangle, ChevronLeft, Info, ShieldAlert, Stethoscope } from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import type { EvidenceGrade } from "@/lib/integrative/types";

/** Shared UI building blocks for the Longevity / Integrative screens. */

export const EVIDENCE_BADGE: Record<EvidenceGrade, { label: string; color: string; bg: string }> = {
  A: { label: "Strong veterinary guideline support", color: Colors.green600, bg: Colors.green100 },
  B: { label: "Moderate evidence", color: Colors.teal700, bg: Colors.teal50 },
  C: { label: "Emerging evidence", color: Colors.amber600, bg: Colors.amber100 },
  D: { label: "Traditional use / TCVM-informed", color: Colors.inkSoft, bg: Colors.cream2 },
};

export const EvidenceBadge = memo(function EvidenceBadge({
  grade,
  long = false,
}: {
  grade: EvidenceGrade;
  long?: boolean;
}) {
  const c = EVIDENCE_BADGE[grade];
  return (
    <View style={[badge.base, { backgroundColor: c.bg }]} accessibilityLabel={`Evidence: ${c.label}`}>
      <Text style={[badge.text, { color: c.color }]} numberOfLines={1}>
        {long ? c.label : `Evidence ${grade}`}
      </Text>
    </View>
  );
});

export const AskVetFlag = memo(function AskVetFlag({ label = "Ask your vet before using this" }: { label?: string }) {
  return (
    <View style={[badge.flag, { backgroundColor: Colors.amber100 }]}>
      <AlertTriangle size={13} color={Colors.amber600} />
      <Text style={[badge.flagText, { color: Colors.amber600 }]}>{label}</Text>
    </View>
  );
});

export const SafetyCaution = memo(function SafetyCaution({ children }: { children: React.ReactNode }) {
  return (
    <View style={badge.caution}>
      <ShieldAlert size={15} color={Colors.red600} />
      <Text style={badge.cautionText}>{children}</Text>
    </View>
  );
});

export const VetNote = memo(function VetNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={badge.vetNote}>
      <Stethoscope size={15} color={Colors.teal700} />
      <Text style={badge.vetNoteText}>{children}</Text>
    </View>
  );
});

export const InfoNote = memo(function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={badge.info}>
      <Info size={14} color={Colors.inkFaint} />
      <Text style={badge.infoText}>{children}</Text>
    </View>
  );
});

export const Bullet = memo(function Bullet({ children, tone }: { children: React.ReactNode; tone?: "vet" | "danger" }) {
  return (
    <View style={badge.bulletRow}>
      <View
        style={[
          badge.dot,
          tone === "vet" && { backgroundColor: Colors.amber500 },
          tone === "danger" && { backgroundColor: Colors.red600 },
        ]}
      />
      <Text style={badge.bulletText}>{children}</Text>
    </View>
  );
});

export const ScreenHeader = memo(function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[badge.topbar, { paddingTop: insets.top + 6 }]}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={badge.iconBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ChevronLeft size={24} color={Colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={Fonts.h3} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={badge.topSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const badge = StyleSheet.create({
  base: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 10.5, fontWeight: "800" },
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  flagText: { fontSize: 12, fontWeight: "800" },
  caution: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.red100,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  cautionText: { ...Fonts.small, color: Colors.red600, flex: 1, lineHeight: 19, fontWeight: "600" },
  vetNote: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  vetNoteText: { ...Fonts.small, color: Colors.teal800, flex: 1, lineHeight: 19 },
  info: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  infoText: { ...Fonts.tiny, color: Colors.inkSoft, flex: 1, lineHeight: 16 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingBottom: Space.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  topSub: { ...Fonts.small, color: Colors.teal700, marginTop: 1 },
});
