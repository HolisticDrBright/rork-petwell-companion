import {
  AlertTriangle,
  Bone,
  ClipboardList,
  Info,
  Leaf,
  MapPin,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Wind,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { evidenceLabel } from "@/lib/integrative/engine";
import type { EvidenceGrade, IntegrativePlan, Recommendation } from "@/lib/integrative/types";

const EVIDENCE_COLOR: Record<EvidenceGrade, { color: string; bg: string }> = {
  A: { color: Colors.green600, bg: Colors.green100 },
  B: { color: Colors.teal700, bg: Colors.teal50 },
  C: { color: Colors.amber600, bg: Colors.amber100 },
  D: { color: Colors.inkSoft, bg: Colors.cream2 },
};

function EvidenceBadge({ grade }: { grade: EvidenceGrade }) {
  const c = EVIDENCE_COLOR[grade];
  return (
    <View style={[styles.evidence, { backgroundColor: c.bg }]} accessibilityLabel={`Evidence ${evidenceLabel(grade)}`}>
      <Text style={[styles.evidenceText, { color: c.color }]}>Evidence {evidenceLabel(grade)}</Text>
    </View>
  );
}

function SafetyRow({ r }: { r: Recommendation }) {
  const danger = r.type === "avoid";
  const Icon = r.type === "vet" ? Stethoscope : r.type === "avoid" ? ShieldAlert : ClipboardList;
  return (
    <View style={styles.safetyRow}>
      <Icon size={18} color={danger ? Colors.red600 : Colors.teal700} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.safetyTitle, danger && { color: Colors.red600 }]}>{r.title}</Text>
        <Text style={styles.safetyDetail}>{r.detail}</Text>
      </View>
    </View>
  );
}

function BulletList({ items, tone }: { items: string[]; tone?: "vet" }) {
  return (
    <>
      {items.map((t, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.dot, tone === "vet" && { backgroundColor: Colors.amber500 }]} />
          <Text style={styles.bulletText}>{t}</Text>
        </View>
      ))}
    </>
  );
}

function StepRow({ r, icon: Icon }: { r: Recommendation; icon: React.ComponentType<{ size?: number; color?: string }> }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepIcon}>
        <Icon size={16} color={Colors.teal700} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.stepHead}>
          <Text style={styles.stepTitle}>{r.title}</Text>
          {r.evidence ? <EvidenceBadge grade={r.evidence} /> : null}
        </View>
        <Text style={styles.stepDetail}>{r.detail}</Text>
      </View>
    </View>
  );
}

function NaturalCard({ r }: { r: Recommendation }) {
  const Icon = r.type === "herb" ? Leaf : Pill;
  return (
    <View style={styles.naturalCard}>
      <View style={styles.naturalHead}>
        <View style={styles.naturalIcon}>
          <Icon size={16} color={Colors.teal700} />
        </View>
        <Text style={styles.naturalTitle}>{r.title}</Text>
        {r.evidence ? <EvidenceBadge grade={r.evidence} /> : null}
      </View>
      <Text style={styles.naturalDetail}>{r.detail}</Text>

      {r.askVetFirst ? (
        <View style={styles.askVet}>
          <AlertTriangle size={13} color={Colors.amber600} />
          <Text style={styles.askVetText}>Ask your vet before using this</Text>
        </View>
      ) : null}

      {r.speciesNote ? <Text style={styles.speciesNote}>{r.speciesNote}</Text> : null}

      {r.contraindications.length > 0 ? (
        <Text style={styles.contra}>
          <Text style={{ fontWeight: "800" }}>Avoid if: </Text>
          {r.contraindications.join(" · ")}
        </Text>
      ) : null}

      <View style={styles.naturalFoot}>
        <Text style={styles.footLine}>
          <Text style={styles.footKey}>Track: </Text>
          {r.whatToTrack}
        </Text>
        <Text style={styles.footLine}>
          <Text style={styles.footKey}>Source: </Text>
          {r.source}
        </Text>
      </View>
    </View>
  );
}

export const IntegrativePlanView = memo(function IntegrativePlanView({
  plan,
  onFindVet,
}: {
  plan: IntegrativePlan;
  onFindVet?: () => void;
}) {
  const vetSafety = plan.recommendations.filter((r) => r.type === "vet" || r.type === "avoid" || r.type === "monitor");
  const food = plan.recommendations.filter((r) => r.type === "food");
  const lifestyle = plan.recommendations.filter((r) => r.type === "lifestyle");
  const natural = plan.recommendations.filter((r) => r.type === "supplement" || r.type === "herb");

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Sparkles size={18} color={Colors.teal700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Integrative support plan</Text>
          <Text style={styles.headerSub}>
            {plan.systemLabel} · {plan.pattern}
          </Text>
        </View>
      </View>

      {plan.emergencyOverride ? (
        <View style={styles.emergencyBanner}>
          <ShieldAlert size={18} color={Colors.red600} />
          <Text style={styles.emergencyText}>
            Natural support is paused — these signs need a vet first. No herbs, enzymes, or supplements during an
            emergency.
          </Text>
        </View>
      ) : (
        <Text style={styles.headline}>{plan.headline}</Text>
      )}

      {/* Safety / vet steps */}
      {vetSafety.length > 0 ? (
        <Card style={{ gap: 12, marginTop: Space.sm }}>
          {vetSafety.map((r, i) => (
            <SafetyRow key={i} r={r} />
          ))}
        </Card>
      ) : null}

      {/* Food-first */}
      {food.length > 0 ? (
        <>
          <Text style={styles.section}>Food-first support</Text>
          <Card style={{ gap: 14, marginTop: 6 }}>
            {food.map((r, i) => (
              <StepRow key={i} r={r} icon={Bone} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Lifestyle */}
      {lifestyle.length > 0 ? (
        <>
          <Text style={styles.section}>Lifestyle & environment</Text>
          <Card style={{ gap: 14, marginTop: 6 }}>
            {lifestyle.map((r, i) => (
              <StepRow key={i} r={r} icon={Wind} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Natural support cards */}
      {natural.length > 0 ? (
        <>
          <Text style={styles.section}>Natural support (optional)</Text>
          <Text style={styles.sectionHint}>Only species-safe options are shown. None of these treat disease.</Text>
          {natural.map((r, i) => (
            <NaturalCard key={i} r={r} />
          ))}
        </>
      ) : null}

      {/* When to ask the vet */}
      {plan.whenToAskVet.length > 0 ? (
        <>
          <Text style={styles.section}>When to ask your vet</Text>
          <Card style={[styles.warnCard, { gap: 10, marginTop: 6 }]}>
            <BulletList items={plan.whenToAskVet} tone="vet" />
          </Card>
        </>
      ) : null}

      {/* What to track */}
      {plan.whatToTrack.length > 0 ? (
        <>
          <Text style={styles.section}>What to track</Text>
          <Card style={{ gap: 10, marginTop: 6 }}>
            <BulletList items={plan.whatToTrack} />
          </Card>
        </>
      ) : null}

      {/* Find holistic vet */}
      {onFindVet ? (
        <Pressable
          onPress={onFindVet}
          accessibilityRole="button"
          accessibilityLabel="Find a holistic or integrative vet"
          style={({ pressed }) => [styles.findVet, pressed && { opacity: 0.85 }]}
        >
          <MapPin size={16} color={Colors.teal700} />
          <Text style={styles.findVetText}>Find a holistic / integrative vet</Text>
        </Pressable>
      ) : null}

      {/* Caveat */}
      <View style={styles.caveat}>
        <Info size={14} color={Colors.inkFaint} />
        <Text style={styles.caveatText}>{plan.safetyCaveat}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Space.lg },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...Fonts.h2 },
  headerSub: { ...Fonts.small, color: Colors.teal700, marginTop: 1 },
  headline: { ...Fonts.bodySoft, marginTop: 8, lineHeight: 21 },
  emergencyBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.red100,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: 8,
  },
  emergencyText: { ...Fonts.small, color: Colors.red600, flex: 1, lineHeight: 19, fontWeight: "600" },
  section: { ...Fonts.h3, marginTop: Space.lg },
  sectionHint: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2 },
  safetyRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  safetyTitle: { ...Fonts.h3, fontSize: 14.5 },
  safetyDetail: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 18 },
  stepRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stepTitle: { ...Fonts.h3, fontSize: 14.5, flexShrink: 1 },
  stepDetail: { ...Fonts.small, color: Colors.inkSoft, marginTop: 3, lineHeight: 19 },
  naturalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.hairline,
    gap: 6,
  },
  naturalHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  naturalIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  naturalTitle: { ...Fonts.h3, fontSize: 14.5, flexShrink: 1 },
  naturalDetail: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  evidence: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  evidenceText: { fontSize: 10.5, fontWeight: "800" },
  askVet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.amber100,
    borderRadius: Radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  askVetText: { fontSize: 12, fontWeight: "800", color: Colors.amber600 },
  speciesNote: { ...Fonts.small, color: Colors.coral600, lineHeight: 18 },
  contra: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
  naturalFoot: { gap: 2, marginTop: 2, borderTopWidth: 1, borderTopColor: Colors.hairline, paddingTop: 8 },
  footLine: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16 },
  footKey: { fontWeight: "800", color: Colors.inkSoft },
  warnCard: { backgroundColor: Colors.amber100 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  findVet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.teal100,
  },
  findVetText: { ...Fonts.h3, color: Colors.teal700, fontSize: 14.5 },
  caveat: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.md,
  },
  caveatText: { ...Fonts.tiny, color: Colors.inkSoft, flex: 1, lineHeight: 16 },
});
