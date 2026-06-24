import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  FileText,
  Info,
  Link2,
  Pencil,
  Save,
  ShieldCheck,
  TrendingUp,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { getScanResult } from "@/constants/scans";
import { usePets } from "@/providers/PetProvider";

const TONE_COLOR = { good: Colors.green600, watch: Colors.amber600, bad: Colors.coral600 } as const;
const TONE_BG = { good: Colors.green100, watch: Colors.amber100, bad: Colors.coral100 } as const;

const FLAG_TONE_COLOR = { concern: Colors.coral600, watch: Colors.amber600, positive: Colors.green600 } as const;
const FLAG_TONE_BG = { concern: Colors.coral100, watch: Colors.amber100, positive: Colors.green100 } as const;

export default function ScanResultScreen() {
  const router = useRouter();
  const { type, notes } = useLocalSearchParams<{ type: string; notes: string }>();
  const { selectedPet } = usePets();
  const result = useMemo(() => getScanResult(type ?? "poop"), [type]);
  const isFood = result.isFood ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.tiny}>ANALYSIS COMPLETE</Text>
          <Text style={styles.title}>{result.title}</Text>
          <Text style={Fonts.bodySoft}>For {selectedPet.name}</Text>
        </View>
        {result.score ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{result.score}</Text>
            <Text style={styles.scoreLabel}>{result.scoreLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginVertical: Space.md }}>
        <UrgencyBand level={result.urgency} />
      </View>

      {/* Observed fields */}
      <Card style={{ gap: 0 }}>
        {result.fields.map((f, i) => (
          <View key={f.label}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[styles.fieldPill, { backgroundColor: TONE_BG[f.tone] }]}>
                <Text style={[styles.fieldValue, { color: TONE_COLOR[f.tone] }]}>{f.value}</Text>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {/* Food intelligence section */}
      {isFood && result.foodIntel ? (
        <View style={{ marginTop: Space.lg }}>
          {/* Product identity */}
          <Card style={{ marginBottom: Space.md, backgroundColor: Colors.teal50, borderWidth: 1, borderColor: Colors.teal100 }}>
            <Text style={[Fonts.h3, { color: Colors.teal900, marginBottom: 4 }]}>{result.foodIntel.productName}</Text>
            <View style={{ flexDirection: "row", gap: Space.sm }}>
              <View style={[styles.scoreChip, { backgroundColor: result.foodIntel.scoreColor + "20" }]}>
                <Text style={[styles.scoreChipText, { color: result.foodIntel.scoreColor }]}>
                  Score: {result.foodIntel.productScore}
                </Text>
              </View>
            </View>
          </Card>

          {/* Ingredient flags */}
          <Text style={styles.sectionTitle}>Ingredient flags</Text>
          <Card style={{ gap: 0, marginTop: 8 }}>
            {result.foodIntel.ingredientFlags.map((flag, i) => (
              <View key={i}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.flagRow}>
                  <View style={[styles.flagDot, { backgroundColor: FLAG_TONE_BG[flag.tone] }]}>
                    {flag.tone === "positive" ? (
                      <Check size={12} color={FLAG_TONE_COLOR[flag.tone]} strokeWidth={3} />
                    ) : flag.tone === "concern" ? (
                      <AlertTriangle size={12} color={FLAG_TONE_COLOR[flag.tone]} />
                    ) : (
                      <Info size={12} color={FLAG_TONE_COLOR[flag.tone]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Fonts.h3, { color: FLAG_TONE_COLOR[flag.tone], fontSize: 14 }]}>{flag.label}</Text>
                    <Text style={[Fonts.small, { marginTop: 1, lineHeight: 17 }]}>{flag.detail}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>

          {/* Nutrition fit + recall status row */}
          <View style={styles.foodStatRow}>
            <View style={[styles.foodStat, { backgroundColor: result.foodIntel.nutritionFitColor + "15" }]}>
              <Text style={Fonts.tiny}>NUTRITION FIT</Text>
              <Text style={[styles.foodStatValue, { color: result.foodIntel.nutritionFitColor }]}>
                {result.foodIntel.nutritionFit}
              </Text>
            </View>
            <View style={[styles.foodStat, { backgroundColor: result.foodIntel.recallStatusColor + "15" }]}>
              <Text style={Fonts.tiny}>RECALL STATUS</Text>
              <Text style={[styles.foodStatValue, { color: result.foodIntel.recallStatusColor }]}>
                {result.foodIntel.recallStatus}
              </Text>
            </View>
          </View>

          {/* Purity note */}
          <View style={styles.purityCard}>
            <ShieldCheck size={17} color={Colors.teal700} />
            <Text style={styles.purityText}>{result.foodIntel.purityNote}</Text>
          </View>

          {/* Cleaner alternatives */}
          <Text style={styles.sectionTitle}>Cleaner alternatives</Text>
          <Card style={{ gap: 12, marginTop: 8 }}>
            {result.foodIntel.cleanerOptions.map((opt, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.qDot}>
                  <Text style={styles.qDotText}>{i + 1}</Text>
                </View>
                <Text style={styles.bulletText}>{opt}</Text>
              </View>
            ))}
          </Card>

          {/* View full food intelligence */}
          <Pressable
            onPress={() => router.push("/food-intelligence")}
            style={({ pressed }) => [styles.fullIntelBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.fullIntelText}>Open full Food Intelligence</Text>
            <ChevronRight size={18} color={Colors.teal700} />
          </Pressable>
        </View>
      ) : (
        <>
          {/* Health scan patterns */}
          <Text style={styles.sectionTitle}>Observed patterns</Text>
          <Card style={{ gap: 12, marginTop: 8 }}>
            {result.patterns.map((p, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>{p}</Text>
              </View>
            ))}
          </Card>

          {/* Correlation */}
          {result.correlation ? (
            <View style={styles.correlation}>
              <Link2 size={17} color={Colors.teal700} />
              <Text style={styles.correlationText}>{result.correlation}</Text>
            </View>
          ) : null}
        </>
      )}

      {/* Your notes */}
      {notes ? (
        <Card style={{ marginTop: Space.md }}>
          <Text style={styles.notesLabel}>Your notes</Text>
          <Text style={styles.notesText}>{notes}</Text>
        </Card>
      ) : null}

      {/* Follow-up questions */}
      <Text style={styles.sectionTitle}>Suggested follow-up</Text>
      <Card style={{ gap: 12, marginTop: 8 }}>
        {result.followUps.map((q, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={styles.qDot}>
              <Text style={styles.qDotText}>?</Text>
            </View>
            <Text style={styles.bulletText}>{q}</Text>
          </View>
        ))}
      </Card>

      {/* Manual correction */}
      <Pressable style={styles.correctRow}>
        <Pencil size={15} color={Colors.teal700} />
        <Text style={styles.correctText}>Something off? Correct this result by hand</Text>
      </Pressable>

      {/* Actions */}
      <View style={styles.actions}>
        <PrimaryButton
          label="Save to timeline"
          icon={<Save size={18} color="#fff" />}
          variant="primary"
          onPress={() => router.replace("/(tabs)/timeline")}
          style={{ flex: 1 }}
        />
        <PrimaryButton
          label="Add to report"
          icon={<FileText size={18} color={Colors.teal800} />}
          variant="outline"
          onPress={() => router.replace("/vet-report")}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ marginTop: Space.lg }}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingTop: Space.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: Space.md },
  title: { ...Fonts.title, marginVertical: 2 },
  scoreBadge: { backgroundColor: Colors.teal800, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", minWidth: 80 },
  scoreValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  scoreLabel: { color: Colors.teal100, fontSize: 10, fontWeight: "700", marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  fieldLabel: { ...Fonts.h3, fontSize: 15 },
  fieldPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  fieldValue: { fontSize: 13.5, fontWeight: "800" },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  qDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  qDotText: { color: Colors.teal700, fontWeight: "800", fontSize: 12 },
  correlation: { flexDirection: "row", gap: 10, backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: Space.md, marginTop: Space.md, borderWidth: 1, borderColor: Colors.teal100 },
  correlationText: { ...Fonts.body, flex: 1, color: Colors.teal900, lineHeight: 21, fontWeight: "600" },
  notesLabel: { ...Fonts.tiny, marginBottom: 4 },
  notesText: { ...Fonts.body, lineHeight: 21 },
  correctRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginTop: Space.lg },
  correctText: { ...Fonts.small, color: Colors.teal700 },
  actions: { flexDirection: "row", gap: 10, marginTop: Space.md },
  // Food intel
  flagRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  flagDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  scoreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  scoreChipText: { fontSize: 13, fontWeight: "800" },
  foodStatRow: { flexDirection: "row", gap: Space.sm, marginTop: Space.md },
  foodStat: { flex: 1, borderRadius: Radius.md, padding: Space.sm, gap: 4 },
  foodStatValue: { fontSize: 15, fontWeight: "800" },
  purityCard: { flexDirection: "row", gap: 10, backgroundColor: Colors.teal50, borderRadius: Radius.md, padding: Space.sm, marginTop: Space.md, borderWidth: 1, borderColor: Colors.teal100 },
  purityText: { ...Fonts.small, flex: 1, color: Colors.teal900, lineHeight: 18 },
  fullIntelBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: Space.lg, paddingVertical: 14, backgroundColor: Colors.teal50, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.teal100 },
  fullIntelText: { ...Fonts.h3, color: Colors.teal700 },
});
