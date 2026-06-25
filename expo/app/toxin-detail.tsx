import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, ExternalLink, ListPlus, MapPin, ShieldAlert } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmergencyContacts } from "@/components/EmergencyContacts";
import { Card, Disclaimer, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { NOT_FOUND_NOT_SAFE } from "@/lib/toxins/contacts";
import { buildEmergencyAction, SEVERITY_LABEL } from "@/lib/toxins/safety";
import { getToxinBySlug } from "@/lib/toxins/search";
import type { ToxinSeverity } from "@/lib/toxins/types";
import { usePets } from "@/providers/PetProvider";

const SEV_STYLE: Record<ToxinSeverity, { color: string; bg: string }> = {
  emergency: { color: Colors.red600, bg: Colors.red100 },
  high: { color: Colors.coral600, bg: Colors.coral100 },
  caution: { color: Colors.amber600, bg: Colors.amber100 },
  usually_safe: { color: Colors.green600, bg: Colors.green100 },
  unknown: { color: Colors.inkSoft, bg: Colors.cream2 },
};

function nowLabel(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "a" : "p";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${ap}`;
}

function urgencyForSeverity(sev: ToxinSeverity): "green" | "amber" | "red" {
  if (sev === "emergency" || sev === "high") return "red";
  if (sev === "usually_safe") return "green";
  return "amber";
}

export default function ToxinDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string; species?: string }>();
  const { selectedPet, addLog, todayIso } = usePets();
  const [saved, setSaved] = useState<boolean>(false);

  const toxin = useMemo(() => (slug ? getToxinBySlug(slug) : undefined), [slug]);
  const action = useMemo(() => (toxin ? buildEmergencyAction(toxin, selectedPet.species) : null), [toxin, selectedPet.species]);

  const onSaveToTimeline = useCallback(() => {
    if (!toxin || !action) return;
    addLog(selectedPet.id, {
      id: `toxin-${Date.now()}`,
      petId: selectedPet.id,
      date: todayIso,
      time: nowLabel(),
      category: "symptom",
      title: `Possible toxin exposure: ${toxin.name}`,
      detail: `Signs to watch: ${toxin.clinicalSigns.join(", ")}.`,
      urgency: urgencyForSeverity(action.severity),
    });
    setSaved(true);
  }, [toxin, action, addLog, selectedPet.id, todayIso]);

  // Spec error handling: never a blank/broken screen — keep the hotline card.
  if (!toxin || !action) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Toxin" }} />
        <ScrollView contentContainerStyle={{ padding: Space.md }}>
          <View style={styles.emergencyCard}>
            <EmergencyContacts />
          </View>
          <Text style={[styles.summary, { marginTop: Space.md }]}>{NOT_FOUND_NOT_SAFE}</Text>
        </ScrollView>
      </View>
    );
  }

  const dogStyle = SEV_STYLE[toxin.dogSeverity];
  const catStyle = SEV_STYLE[toxin.catSeverity];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: toxin.name }} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Headline + per-species severity */}
        <Text style={styles.name}>{toxin.name}</Text>
        <View style={styles.sevRow}>
          <View style={[styles.sevBadge, { backgroundColor: dogStyle.bg }]}>
            <Text style={[styles.sevText, { color: dogStyle.color }]}>Dogs: {SEVERITY_LABEL[toxin.dogSeverity]}</Text>
          </View>
          <View style={[styles.sevBadge, { backgroundColor: catStyle.bg }]}>
            <Text style={[styles.sevText, { color: catStyle.color }]}>Cats: {SEVERITY_LABEL[toxin.catSeverity]}</Text>
          </View>
        </View>
        <Text style={styles.summary}>{toxin.summary}</Text>
        {toxin.doseWarning ? <Text style={styles.doseWarn}>{toxin.doseWarning}</Text> : null}

        {/* What to do now — emergency action (NO treatment) */}
        <View style={[styles.actionCard, action.routeToPoisonControl && styles.actionUrgent]}>
          <View style={styles.actionHead}>
            <ShieldAlert size={18} color={action.routeToPoisonControl ? Colors.coral600 : Colors.teal700} />
            <Text style={[styles.actionTitle, action.routeToPoisonControl && { color: Colors.coral600 }]}>
              What to do now
            </Text>
          </View>
          <Text style={styles.actionHeadline}>{action.headline}</Text>
          <Text style={styles.actionBring}>{action.bringWithYou}</Text>
          <EmergencyContacts showCallToAction={false} />
          <PrimaryButton
            label="Find an emergency vet"
            icon={<MapPin size={18} color="#fff" />}
            variant="coral"
            onPress={() => router.push({ pathname: "/telehealth", params: { urgent: "1" } })}
          />
        </View>

        {/* What NOT to do */}
        <Text style={styles.sectionTitle}>What not to do</Text>
        <Card style={{ gap: 8 }}>
          {action.whatNotToDo.map((w) => (
            <View key={w} style={styles.dontRow}>
              <View style={styles.dontDot} />
              <Text style={styles.dontText}>{w}</Text>
            </View>
          ))}
        </Card>

        {/* Where pets encounter it */}
        <Text style={styles.sectionTitle}>Where pets find it</Text>
        <Card>
          <Text style={styles.body}>{toxin.commonSources}</Text>
        </Card>

        {/* Signs to watch */}
        <Text style={styles.sectionTitle}>Signs to watch for</Text>
        <Card>
          <Text style={styles.body}>{toxin.clinicalSigns.join(" · ")}</Text>
        </Card>

        {/* Common names */}
        {toxin.aliases.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Also known as</Text>
            <View style={styles.tagRow}>
              {toxin.aliases.map((a) => (
                <View key={a} style={styles.tag}>
                  <Text style={styles.tagText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Save concern to the pet's timeline / vet report */}
        <View style={{ marginTop: Space.lg }}>
          <PrimaryButton
            label={saved ? "Saved to timeline" : "Save concern to timeline"}
            icon={saved ? <Check size={18} color="#fff" /> : <ListPlus size={18} color="#fff" />}
            variant="primary"
            onPress={onSaveToTimeline}
          />
          <Text style={styles.saveNote}>Saved concerns appear in {selectedPet.name}&apos;s timeline and vet report.</Text>
        </View>

        {/* Provenance */}
        <View style={styles.prov}>
          <Pressable
            style={styles.sourceLink}
            onPress={() => Linking.openURL(toxin.source.url).catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel={`Open source: ${toxin.source.name}`}
          >
            <ExternalLink size={13} color={Colors.teal700} />
            <Text style={styles.sourceText} numberOfLines={2}>
              Source: {toxin.source.publisher} — {toxin.source.name}
            </Text>
          </Pressable>
          <View style={styles.provMetaRow}>
            <Text style={styles.provMeta}>Reviewed {toxin.lastReviewed}</Text>
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>
                {toxin.evidenceStatus === "vet_reviewed" ? "Vet reviewed" : "Pending vet review"}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: Space.md }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  emergencyCard: { backgroundColor: Colors.coral100, borderRadius: Radius.lg, padding: Space.md, gap: 10 },
  name: { ...Fonts.h2, fontSize: 23 },
  sevRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  sevBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  sevText: { fontSize: 12, fontWeight: "800" },
  summary: { ...Fonts.body, color: Colors.inkSoft, lineHeight: 21, marginTop: 10 },
  doseWarn: { ...Fonts.small, color: Colors.red600, fontWeight: "700", marginTop: 8, lineHeight: 18 },
  actionCard: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: Space.lg,
    gap: 10,
  },
  actionUrgent: { backgroundColor: Colors.coral100 },
  actionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionTitle: { ...Fonts.h3, color: Colors.teal900 },
  actionHeadline: { ...Fonts.body, color: Colors.ink, fontWeight: "700", lineHeight: 20 },
  actionBring: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  sectionTitle: { ...Fonts.h2, fontSize: 16, marginTop: Space.lg, marginBottom: 8 },
  body: { ...Fonts.body, color: Colors.inkSoft, lineHeight: 20 },
  dontRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dontDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.coral600, marginTop: 7 },
  dontText: { ...Fonts.small, color: Colors.ink, flex: 1, lineHeight: 19 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: Colors.cream2, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { ...Fonts.tiny, color: Colors.inkSoft },
  saveNote: { ...Fonts.tiny, color: Colors.inkFaint, textAlign: "center", marginTop: 6 },
  prov: { marginTop: Space.lg, gap: 8 },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  sourceText: { ...Fonts.tiny, color: Colors.teal700, flex: 1 },
  provMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  provMeta: { ...Fonts.tiny, color: Colors.inkFaint },
  reviewBadge: { backgroundColor: Colors.amber100, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  reviewBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.amber600 },
});
