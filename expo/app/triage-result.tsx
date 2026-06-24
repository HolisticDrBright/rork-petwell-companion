import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  FileText,
  Info,
  Minus,
  Phone,
  Stethoscope,
  Video,
  X,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space, Urgency, cardShadow, type UrgencyKey } from "@/constants/colors";
import { CONCERNS, getFlow } from "@/constants/triage";
import { usePets } from "@/providers/PetProvider";

const URGENCY_ORDER: UrgencyKey[] = ["green", "amber", "orange", "red"];

function escalate(base: UrgencyKey, redFlags: number): UrgencyKey {
  const baseIdx = URGENCY_ORDER.indexOf(base);
  const bump = redFlags >= 3 ? 3 : redFlags >= 2 ? 2 : redFlags >= 1 ? 1 : 0;
  return URGENCY_ORDER[Math.min(URGENCY_ORDER.length - 1, baseIdx + bump)];
}

export default function TriageResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { concern, redFlags } = useLocalSearchParams<{ concern: string; redFlags: string }>();
  const { selectedPet } = usePets();

  const flow = useMemo(() => getFlow(concern ?? "other"), [concern]);
  const redCount = Number(redFlags ?? "0");
  const urgency = useMemo(() => escalate(flow.result.urgency, redCount), [flow, redCount]);
  const concernLabel = useMemo(
    () => CONCERNS.find((c) => c.id === concern)?.label ?? "your concern",
    [concern]
  );
  const result = flow.result;
  const confidence = redCount >= 2 ? "High" : result.confidence;
  const escalated = urgency === "orange" || urgency === "red";
  const needsVet = urgency !== "green";

  const u = Urgency[urgency];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={24} color={Colors.ink} />
        </Pressable>
        <Text style={Fonts.h3}>Triage result</Text>
        <Pressable onPress={() => router.dismissAll()} style={styles.backBtn} hitSlop={10}>
          <X size={22} color={Colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgency hero */}
        <View style={[styles.hero, { backgroundColor: u.bg }]}>
          <Text style={styles.heroLabel}>URGENCY</Text>
          <Text style={[styles.heroBig, { color: u.color }]}>{u.label}</Text>
          <Text style={styles.heroSub}>
            For {selectedPet.name} · {concernLabel.toLowerCase()}
          </Text>
          <View style={styles.confidenceRow}>
            {(["Low", "Moderate", "High"] as const).map((c) => (
              <View
                key={c}
                style={[
                  styles.confDot,
                  {
                    backgroundColor:
                      c === confidence
                        ? u.color
                        : confidence === "High" && c === "Moderate"
                          ? u.color
                          : "rgba(0,0,0,0.08)",
                  },
                ]}
              />
            ))}
            <Text style={[styles.confText, { color: u.color }]}>{confidence} confidence</Text>
          </View>
        </View>

        {/* Possible causes */}
        <Text style={styles.sectionTitle}>Possible causes</Text>
        <Text style={styles.sectionHint}>Ranked by how well they fit — these are not a diagnosis.</Text>
        <Card style={{ gap: 0, marginTop: 8 }}>
          {result.causes.map((c, i) => (
            <View key={c.rank}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.causeRow}>
                <View style={[styles.rankCircle, { backgroundColor: i === 0 ? Colors.teal800 : Colors.teal50 }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? "#fff" : Colors.teal700 }]}>{c.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{c.name}</Text>
                  <Text style={[Fonts.small, { marginTop: 2, lineHeight: 18 }]}>{c.note}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Evidence: supports / does not support */}
        <Text style={styles.sectionTitle}>Evidence</Text>
        <View style={styles.evidenceGrid}>
          {/* What supports this */}
          <View style={[styles.evidenceCard, { backgroundColor: Colors.green100 }]}>
            <Text style={[styles.evidenceTitle, { color: Colors.green600 }]}>What supports this</Text>
            {result.evidence.supports.map((s) => (
              <View key={s} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.green600 }]}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
          {/* What does not support this */}
          <View style={[styles.evidenceCard, { backgroundColor: Colors.amber100 }]}>
            <Text style={[styles.evidenceTitle, { color: Colors.amber600 }]}>What doesn't support this</Text>
            {result.evidence.doesNotSupport.map((s) => (
              <View key={s} style={styles.bulletRow}>
                <View style={[styles.bulletDot, { backgroundColor: Colors.amber500 }]}>
                  <Minus size={10} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.bulletText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* What would change urgency */}
        <Card style={[styles.warnCard, { marginTop: Space.md }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Info size={17} color={Colors.red600} />
            <Text style={[Fonts.h3, { color: Colors.red600 }]}>What would change the urgency</Text>
          </View>
          {result.evidence.changesUrgency.map((s) => (
            <View key={s} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: Colors.red500 }]}>
                <Minus size={10} color="#fff" strokeWidth={3} />
              </View>
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </Card>

        {/* What to do now */}
        <Text style={styles.sectionTitle}>What to do now</Text>
        <Card style={{ gap: 14, marginTop: 8 }}>
          {result.steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </Card>

        {result.disclaimerNote ? (
          <View style={styles.specialNote}>
            <Info size={16} color={Colors.teal800} />
            <Text style={styles.specialNoteText}>{result.disclaimerNote}</Text>
          </View>
        ) : null}

        {/* Telehealth escalation */}
        {needsVet ? (
          <View style={styles.escalate}>
            <View style={styles.escalateHead}>
              <Stethoscope size={18} color={Colors.teal800} />
              <Text style={styles.escalateTitle}>
                {escalated ? "We recommend prompt vet care" : "Talk to a licensed vet"}
              </Text>
            </View>
            <Text style={styles.escalateBody}>
              Bring your saved logs and photos — a prepared report makes the visit faster and better.
            </Text>
            <View style={styles.escalateBtns}>
              <PrimaryButton
                label="Talk to a vet"
                icon={<Video size={18} color="#fff" />}
                variant="primary"
                onPress={() => {}}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label="Send report"
                icon={<FileText size={18} color={Colors.teal800} />}
                variant="outline"
                onPress={() => router.push("/vet-report")}
                style={{ flex: 1 }}
              />
            </View>
            {escalated ? (
              <View style={styles.emergencyRow}>
                <Phone size={16} color={Colors.red600} />
                <Text style={styles.emergencyText}>Find emergency clinic · Call primary vet</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Ask next */}
        <Text style={styles.sectionTitle}>Ask next</Text>
        <View style={styles.chipRow}>
          <NextChip label="Scan photo" icon={<Camera size={16} color={Colors.teal700} />} onPress={() => router.push("/scan")} />
          <NextChip label="Vet-ready report" icon={<FileText size={16} color={Colors.teal700} />} onPress={() => router.push("/vet-report")} />
          <NextChip label="Telehealth" icon={<Video size={16} color={Colors.teal700} />} onPress={() => {}} />
          <NextChip label="12-hour check-in" icon={<Bell size={16} color={Colors.teal700} />} onPress={() => router.push("/reminders")} />
        </View>

        <View style={{ marginTop: Space.lg }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

function NextChip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}>
      {icon}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Space.md, paddingVertical: Space.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...cardShadow },
  hero: { borderRadius: Radius.lg, padding: Space.lg, alignItems: "center", gap: 4 },
  heroLabel: { ...Fonts.tiny, letterSpacing: 1 },
  heroBig: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  heroSub: { ...Fonts.bodySoft, marginTop: 2 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  confDot: { width: 9, height: 9, borderRadius: 5 },
  confText: { fontSize: 13, fontWeight: "800", marginLeft: 4 },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg },
  sectionHint: { ...Fonts.small, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  causeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  rankCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText: { fontWeight: "800", fontSize: 14 },
  evidenceGrid: { flexDirection: "row", gap: Space.sm, marginTop: 8 },
  evidenceCard: { flex: 1, borderRadius: Radius.md, padding: Space.sm, gap: 8 },
  evidenceTitle: { fontSize: 12, fontWeight: "800", marginBottom: 2 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bulletDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 1 },
  bulletText: { ...Fonts.small, flex: 1, lineHeight: 18, color: Colors.ink },
  warnCard: { backgroundColor: Colors.red100, borderWidth: 1, borderColor: Colors.red100 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: Colors.teal700, fontWeight: "800", fontSize: 13 },
  stepText: { ...Fonts.body, flex: 1, lineHeight: 21 },
  specialNote: { flexDirection: "row", gap: 10, backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: Space.sm, marginTop: Space.md, borderWidth: 1, borderColor: Colors.teal100 },
  specialNoteText: { ...Fonts.small, flex: 1, color: Colors.teal900, lineHeight: 18 },
  escalate: { backgroundColor: Colors.teal50, borderRadius: Radius.lg, padding: Space.md, marginTop: Space.lg, borderWidth: 1, borderColor: Colors.teal100, gap: 12 },
  escalateHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  escalateTitle: { ...Fonts.h3, color: Colors.teal900, flex: 1 },
  escalateBody: { ...Fonts.bodySoft, lineHeight: 20 },
  escalateBtns: { flexDirection: "row", gap: 10 },
  emergencyRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 2 },
  emergencyText: { ...Fonts.small, color: Colors.red600, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 11, borderRadius: Radius.pill, ...cardShadow },
  chipText: { ...Fonts.small, color: Colors.ink },
});
