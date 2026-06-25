import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bone,
  CalendarCheck,
  Clock,
  Flame,
  Home,
  Leaf,
  Pill,
  Snowflake,
  Stethoscope,
  Target,
  Utensils,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import { AskVetFlag, Bullet, EvidenceBadge, InfoNote, SafetyCaution, ScreenHeader, VetNote } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { catalogById, getSystem } from "@/lib/integrative/catalog";
import { conditionById } from "@/lib/integrative/conditions";
import { PROGRAM_TEMPLATES } from "@/lib/integrative/programs";
import { checkItemSafety } from "@/lib/integrative/safety";
import type { CatalogItem, ThermalNature } from "@/lib/integrative/types";
import { usePets } from "@/providers/PetProvider";

const THERMAL: Record<ThermalNature, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  warming: { color: Colors.coral600, bg: Colors.coral100, Icon: Flame },
  cooling: { color: Colors.teal700, bg: Colors.teal50, Icon: Snowflake },
  neutral: { color: Colors.inkSoft, bg: Colors.cream2, Icon: Utensils },
};

export default function ProtocolDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectedPet } = usePets();
  const template = id ? conditionById(id) : undefined;

  const { supps, foods } = useMemo(() => {
    const items = (template?.considerItems ?? [])
      .map((cid) => catalogById(cid))
      .filter((c): c is CatalogItem => !!c);
    const safe = items
      .map((item) => ({ item, verdict: checkItemSafety(item, selectedPet) }))
      .filter((x) => x.verdict.allowed);
    return {
      supps: safe.filter((x) => x.item.kind === "supplement" || x.item.kind === "herb"),
      foods: safe.filter((x) => x.item.kind === "food"),
    };
  }, [template, selectedPet]);

  const program = useMemo(
    () => (template ? PROGRAM_TEMPLATES.find((p) => p.conditionId === template.id) : undefined),
    [template],
  );

  if (!template) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Protocol" />
        <View style={{ padding: Space.md }}>
          <Card>
            <Text style={Fonts.body}>That protocol couldn&apos;t be found.</Text>
          </Card>
        </View>
      </View>
    );
  }

  const system = getSystem(template.system);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={template.title} subtitle={system.label} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Evidence + pattern */}
        <Card style={{ gap: 10 }}>
          <Text style={styles.pattern}>{template.pattern}</Text>
          {template.evidence ? <EvidenceBadge grade={template.evidence} long /> : null}
          {template.whoFor ? (
            <Text style={styles.kv}>
              <Text style={styles.kvKey}>Who it&apos;s for · </Text>
              {template.whoFor}
            </Text>
          ) : null}
          {template.whoNotFor ? (
            <Text style={styles.kv}>
              <Text style={styles.kvKey}>Who should not use it · </Text>
              {template.whoNotFor}
            </Text>
          ) : null}
        </Card>

        {/* Cat-specific caution */}
        {selectedPet.species === "cat" && template.catGuidance ? (
          <View style={{ marginTop: Space.md }}>
            <VetNote>{template.catGuidance}</VetNote>
          </View>
        ) : null}

        {/* Red flags */}
        <Text style={styles.section}>Red flags — vet first</Text>
        <SafetyCaution>If you see any of these, skip natural support and contact a vet right away.</SafetyCaution>
        <Card style={{ gap: 8, marginTop: 8 }}>
          {template.redFlags.map((f, i) => (
            <Bullet key={i} tone="danger">
              {f}
            </Bullet>
          ))}
        </Card>

        {/* Food-first */}
        <Text style={styles.section}>Food-first actions</Text>
        {template.foodFirst.map((f, i) => (
          <Card key={i} style={styles.stepCard}>
            <View style={styles.stepHead}>
              <View style={styles.stepIcon}>
                <Bone size={15} color={Colors.teal700} />
              </View>
              <Text style={styles.stepTitle}>{f.title}</Text>
              <EvidenceBadge grade={f.evidence} />
            </View>
            <Text style={styles.stepDetail}>{f.detail}</Text>
          </Card>
        ))}

        {/* Environment */}
        {template.environment && template.environment.length > 0 ? (
          <>
            <Text style={styles.section}>Environment actions</Text>
            <Card style={{ gap: 10 }}>
              {template.environment.map((e, i) => (
                <View key={i} style={styles.envRow}>
                  <Home size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
                  <Text style={styles.envText}>{e}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Food energetics (TCM) */}
        {foods.length > 0 ? (
          <>
            <Text style={styles.section}>Food energetics (TCM)</Text>
            <Text style={styles.sectionHint}>A traditional lens on supportive whole foods — not a diagnosis.</Text>
            {foods.map(({ item }) => {
              const nature = item.thermalNature ?? "neutral";
              const t = THERMAL[nature];
              return (
                <Card key={item.id} style={styles.foodCard}>
                  <View style={styles.foodHead}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <View style={[styles.thermalPill, { backgroundColor: t.bg }]}>
                      <t.Icon size={12} color={t.color} />
                      <Text style={[styles.thermalText, { color: t.color }]}>{nature}</Text>
                    </View>
                  </View>
                  <Text style={styles.foodBenefit}>{item.benefit}</Text>
                  {item.tcmPattern ? <Text style={styles.foodTcm}>{item.tcmPattern}</Text> : null}
                  {item.prep ? (
                    <Text style={styles.foodPrep}>
                      <Text style={{ fontWeight: "800" }}>Prep · </Text>
                      {item.prep}
                    </Text>
                  ) : null}
                </Card>
              );
            })}
          </>
        ) : null}

        {/* Natural support (species-safe) */}
        <Text style={styles.section}>Supplements &amp; herbs</Text>
        {supps.length === 0 ? (
          <Card>
            <Text style={styles.muted}>
              No species-safe supplement or herb options are suggested for {selectedPet.name} here. Food-first and
              environment steps come first — ask your vet before adding anything.
            </Text>
          </Card>
        ) : (
          supps.map(({ item, verdict }) => (
            <Card key={item.id} style={styles.suppCard}>
              <View style={styles.suppHead}>
                <View style={styles.stepIcon}>
                  {item.kind === "herb" ? <Leaf size={15} color={Colors.teal700} /> : <Pill size={15} color={Colors.teal700} />}
                </View>
                <Text style={styles.suppName}>{item.name}</Text>
                <EvidenceBadge grade={item.evidence} />
              </View>
              <Text style={styles.stepDetail}>{item.benefit}</Text>
              {verdict.askVetFirst ? (
                <View style={{ marginTop: 8 }}>
                  <AskVetFlag />
                </View>
              ) : null}
              {verdict.note ? <Text style={styles.speciesNote}>{verdict.note}</Text> : null}
              {item.contraindications.length > 0 ? (
                <Text style={styles.contra}>
                  <Text style={{ fontWeight: "800" }}>Avoid if: </Text>
                  {item.contraindications.join(" · ")}
                </Text>
              ) : null}
            </Card>
          ))
        )}

        {/* What to track */}
        <Text style={styles.section}>What to track</Text>
        <Card style={{ gap: 8 }}>
          {template.whatToTrack.map((t, i) => (
            <View key={i} style={styles.envRow}>
              <Target size={15} color={Colors.teal700} style={{ marginTop: 2 }} />
              <Text style={styles.envText}>{t}</Text>
            </View>
          ))}
        </Card>

        {/* Timeline */}
        {template.timeline ? (
          <>
            <Text style={styles.section}>Expected timeline</Text>
            <Card style={styles.timelineCard}>
              <Clock size={16} color={Colors.teal700} />
              <Text style={styles.timelineText}>{template.timeline}</Text>
            </Card>
          </>
        ) : null}

        {/* When to call the vet */}
        <Text style={styles.section}>When to call the vet</Text>
        <Card style={[styles.warnCard, { gap: 8 }]}>
          {template.whenToAskVet.map((t, i) => (
            <Bullet key={i} tone="vet">
              {t}
            </Bullet>
          ))}
        </Card>

        {/* Vet-ready summary */}
        {template.vetSummary ? (
          <>
            <Text style={styles.section}>Vet-ready summary</Text>
            <Card style={styles.vetSummaryCard}>
              <Stethoscope size={16} color={Colors.teal700} />
              <Text style={styles.vetSummaryText}>{template.vetSummary}</Text>
            </Card>
          </>
        ) : null}

        {/* CTAs */}
        <View style={{ gap: 10, marginTop: Space.lg }}>
          <PrimaryButton
            label="View the meal plan"
            icon={<Utensils size={18} color="#fff" />}
            variant="primary"
            onPress={() => router.push({ pathname: "/meal-planner", params: { condition: template.id } })}
          />
          {program ? (
            <PrimaryButton
              label={`Start: ${program.title}`}
              icon={<CalendarCheck size={18} color={Colors.teal800} />}
              variant="outline"
              onPress={() => router.push({ pathname: "/program-detail", params: { id: program.id } })}
            />
          ) : null}
        </View>

        <View style={{ marginTop: Space.md }}>
          <InfoNote>
            {template.notes?.[0] ??
              "Supportive care complements — it does not replace — veterinary diagnosis and treatment."}
          </InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  pattern: { ...Fonts.h3, color: Colors.teal800 },
  kv: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  kvKey: { fontWeight: "800", color: Colors.ink },
  section: { ...Fonts.h2, fontSize: 17, marginTop: Space.lg, marginBottom: 8 },
  sectionHint: { ...Fonts.small, color: Colors.inkFaint, marginTop: -4, marginBottom: 8 },
  stepCard: { gap: 6, marginBottom: Space.sm },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  stepIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  stepTitle: { ...Fonts.h3, fontSize: 14.5, flexShrink: 1, flexGrow: 1 },
  stepDetail: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  envRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  envText: { ...Fonts.body, flex: 1, lineHeight: 20, color: Colors.inkSoft },
  foodCard: { gap: 5, marginBottom: Space.sm },
  foodHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  foodName: { ...Fonts.h3, fontSize: 14.5, flex: 1 },
  thermalPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  thermalText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  foodBenefit: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  foodTcm: { ...Fonts.small, color: Colors.teal700, lineHeight: 18 },
  foodPrep: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
  suppCard: { gap: 6, marginBottom: Space.sm },
  suppHead: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  suppName: { ...Fonts.h3, fontSize: 14.5, flexShrink: 1, flexGrow: 1 },
  speciesNote: { ...Fonts.small, color: Colors.coral600, lineHeight: 18, marginTop: 4 },
  contra: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16, marginTop: 4 },
  muted: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  timelineCard: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  timelineText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 19 },
  warnCard: { backgroundColor: Colors.amber100 },
  vetSummaryCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.teal50 },
  vetSummaryText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 19 },
});
