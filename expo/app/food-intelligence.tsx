import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Info,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, Disclaimer, PrimaryButton, UrgencyBand } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { getFoodProduct } from "@/constants/mockData";
import { usePets } from "@/providers/PetProvider";
import type { FoodProduct } from "@/types/pet";

export default function FoodIntelligenceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet } = usePets();
  const [search, setSearch] = useState<string>("");
  const [product, setProduct] = useState<FoodProduct | null>(null);

  const searchFood = useCallback(() => {
    const result = getFoodProduct("chicken-kibble");
    setProduct(result ?? null);
  }, []);

  const searchTreat = useCallback(() => {
    const result = getFoodProduct("salmon-treats");
    setProduct(result ?? null);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Stack.Screen options={{ title: "Food Intelligence" }} />

      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.intro}>
          <View style={styles.introBadge}>
            <FileSearch size={15} color={Colors.teal700} />
            <Text style={styles.introBadgeText}>Food Intelligence</Text>
          </View>
          <Text style={styles.title}>
            See what's really in {selectedPet.name}'s food — nutrition fit, ingredient concerns,
            recalls, and cleaner alternatives.
          </Text>
          <Text style={styles.subtitle}>
            Brand-neutral. Evidence-based. Tailored to {selectedPet.name}'s allergies and conditions.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.inkFaint} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search a food or scan its barcode…"
              placeholderTextColor={Colors.inkFaint}
              style={styles.searchInput}
              onSubmitEditing={searchFood}
            />
          </View>
        </View>

        {/* Quick lookups */}
        {!product ? (
          <View style={styles.quickLooks}>
            <Text style={styles.quickLooksTitle}>Try a demo lookup</Text>
            <View style={styles.demoGrid}>
              <Pressable onPress={searchFood} style={({ pressed }) => [styles.demoCard, pressed && { opacity: 0.85 }]}>
                <Text style={styles.demoName}>Premium Chicken & Rice Kibble</Text>
                <Text style={styles.demoBrand}>National Pet Foods</Text>
                <ArrowRight size={16} color={Colors.teal700} style={{ marginTop: 4 }} />
              </Pressable>
              <Pressable onPress={searchTreat} style={({ pressed }) => [styles.demoCard, pressed && { opacity: 0.85 }]}>
                <Text style={styles.demoName}>Salmon Crunchy Chews</Text>
                <Text style={styles.demoBrand}>Happy Tails</Text>
                <ArrowRight size={16} color={Colors.teal700} style={{ marginTop: 4 }} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Product detail */}
        {product ? (
          <View style={{ paddingHorizontal: Space.md }}>
            {/* Product header */}
            <Card style={{ marginTop: Space.md }}>
              <View style={{ flexDirection: "row", gap: Space.sm }}>
                <Image source={{ uri: product.image }} style={styles.productImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.tiny}>{product.type.toUpperCase()} · {product.brand}</Text>
                  <Text style={[Fonts.h2, { marginTop: 2 }]}>{product.name}</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: product.scoreColor + "20", marginTop: 6, alignSelf: "flex-start" }]}>
                    <Text style={[styles.scoreBadgeText, { color: product.scoreColor }]}>Score: {product.score}</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Nutrition fit */}
            <Card style={[styles.fitCard, { backgroundColor: product.nutritionFit.color + "12", borderColor: product.nutritionFit.color + "30", marginTop: Space.sm }]}>
              <Text style={[styles.fitTitle, { color: product.nutritionFit.color }]}>
                Nutrition fit: {product.nutritionFit.score} for {selectedPet.name}
              </Text>
              <Text style={styles.fitSummary}>{product.nutritionFit.summary}</Text>
              <View style={{ gap: 6, marginTop: 8 }}>
                {product.nutritionFit.details.map((d, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={styles.dot} />
                    <Text style={styles.bulletText}>{d}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Quick stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{product.proteinPct}%</Text>
                <Text style={styles.statLabel}>Protein</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{product.fatPct}%</Text>
                <Text style={styles.statLabel}>Fat</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{product.fiberPct}%</Text>
                <Text style={styles.statLabel}>Fiber</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{product.kcalPerCup ?? product.kcalPerPiece}</Text>
                <Text style={styles.statLabel}>kcal/{product.kcalPerCup ? "cup" : "piece"}</Text>
              </View>
            </View>

            {/* Ingredient flags */}
            <Text style={styles.sectionTitle}>Ingredient concerns</Text>
            <Card style={{ gap: 0, marginTop: 8 }}>
              {product.ingredientFlags.map((flag, i) => (
                <View key={i}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.flagRow}>
                    <View style={[styles.flagIcon, { backgroundColor: flag.type === "concern" ? Colors.coral100 : flag.type === "watch" ? Colors.amber100 : Colors.green100 }]}>
                      {flag.type === "positive" ? (
                        <Check size={14} color={Colors.green600} strokeWidth={3} />
                      ) : flag.type === "concern" ? (
                        <AlertTriangle size={14} color={Colors.coral600} />
                      ) : (
                        <Info size={14} color={Colors.amber600} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Fonts.h3, { fontSize: 14.5, color: flag.type === "concern" ? Colors.coral600 : flag.type === "watch" ? Colors.amber600 : Colors.green600 }]}>
                        {flag.label}
                      </Text>
                      <Text style={[Fonts.small, { marginTop: 1, lineHeight: 17, color: Colors.inkSoft }]}>{flag.detail}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {/* Recall history */}
            <Text style={styles.sectionTitle}>Recall history</Text>
            <Card style={{ marginTop: 8 }}>
              {product.recallHistory.length === 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.recallGoodIcon}>
                    <Check size={16} color="#fff" strokeWidth={3} />
                  </View>
                  <Text style={Fonts.h3}>No recalls — clean history</Text>
                </View>
              ) : (
                product.recallHistory.map((r, i) => (
                  <View key={i}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.recallRow}>
                      <View style={styles.recallBadIcon}>
                        <AlertTriangle size={14} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={Fonts.h3}>{r.date} — {r.reason}</Text>
                        <Text style={Fonts.small}>{r.scope}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </Card>

            {/* Purity evidence */}
            <Text style={styles.sectionTitle}>Purity & sourcing</Text>
            <Card style={{ marginTop: 8, gap: 10 }}>
              <View style={styles.purityRow}>
                <Text style={Fonts.small}>Testing</Text>
                <Text style={Fonts.body}>{product.purityEvidence.testing}</Text>
              </View>
              <View style={styles.purityRow}>
                <Text style={Fonts.small}>Sourcing</Text>
                <Text style={Fonts.body}>{product.purityEvidence.sourcing}</Text>
              </View>
              <View style={styles.purityRow}>
                <Text style={Fonts.small}>Manufacturing</Text>
                <Text style={Fonts.body}>{product.purityEvidence.manufacturing}</Text>
              </View>
              <View style={styles.purityRow}>
                <Text style={Fonts.small}>Overall</Text>
                <View style={[styles.purityScorePill, { backgroundColor: product.purityEvidence.score === "Strong" ? Colors.green100 : Colors.amber100 }]}>
                  <Text style={[styles.purityScoreText, { color: product.purityEvidence.score === "Strong" ? Colors.green600 : Colors.amber600 }]}>
                    {product.purityEvidence.score}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Brand transparency */}
            <Text style={styles.sectionTitle}>Brand transparency</Text>
            <Card style={{ marginTop: 8, gap: 0 }}>
              <View>
                <View style={styles.transRow}>
                  <Text style={[Fonts.small, { flex: 1 }]}>Country of origin</Text>
                  <Text style={Fonts.body}>{product.brandTransparency.countryOfOrigin}</Text>
                </View>
                <View style={styles.divider} />
              </View>
              <View>
                <View style={styles.transRow}>
                  <Text style={[Fonts.small, { flex: 1 }]}>Manufacturing disclosed</Text>
                  <Text style={[Fonts.body, { color: product.brandTransparency.manufacturingDisclosed ? Colors.green600 : Colors.inkFaint }]}>
                    {product.brandTransparency.manufacturingDisclosed ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.divider} />
              </View>
              <View>
                <View style={styles.transRow}>
                  <Text style={[Fonts.small, { flex: 1 }]}>Supplier disclosure</Text>
                  <Text style={Fonts.body}>{product.brandTransparency.supplierDisclosure}</Text>
                </View>
                <View style={styles.divider} />
              </View>
              <View>
                <View style={styles.transRow}>
                  <Text style={[Fonts.small, { flex: 1 }]}>Contact available</Text>
                  <Text style={[Fonts.body, { color: product.brandTransparency.contactAvailable ? Colors.green600 : Colors.inkFaint }]}>
                    {product.brandTransparency.contactAvailable ? "Yes" : "No"}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Cleaner alternatives */}
            <Text style={styles.sectionTitle}>Cleaner alternatives</Text>
            <Card style={{ gap: 12, marginTop: 8 }}>
              {product.cleanerAlternatives.map((a, i) => (
                <View key={i} style={styles.altRow}>
                  <View style={styles.altNumber}>
                    <Text style={styles.altNumberText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={Fonts.h3}>{a.name}</Text>
                    <Text style={Fonts.small}>{a.brand} · Score: {a.score}</Text>
                    <Text style={[Fonts.small, { marginTop: 2, color: Colors.inkSoft, lineHeight: 17 }]}>{a.why}</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.inkFaint} />
                </View>
              ))}
            </Card>

            {/* Sources */}
            <Text style={styles.sectionTitle}>Sources</Text>
            <Card style={{ gap: 4, marginTop: 8 }}>
              {product.sources.map((s, i) => (
                <Pressable key={i} style={({ pressed }) => [styles.sourceRow, pressed && { opacity: 0.7 }]}>
                  <ExternalLink size={14} color={Colors.teal700} />
                  <Text style={styles.sourceText}>{s.label}</Text>
                </Pressable>
              ))}
            </Card>

            {/* Disclaimer */}
            <View style={{ marginTop: Space.lg }}>
              <Disclaimer compact />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  intro: { paddingHorizontal: Space.md, marginTop: Space.sm, marginBottom: Space.md },
  introBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.teal50, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, marginBottom: 10 },
  introBadgeText: { ...Fonts.small, color: Colors.teal700 },
  title: { ...Fonts.title, lineHeight: 32, marginBottom: 6 },
  subtitle: { ...Fonts.bodySoft, lineHeight: 22 },
  searchWrap: { paddingHorizontal: Space.md, marginBottom: Space.lg },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Space.md, paddingVertical: 14, borderWidth: 1, borderColor: Colors.hairline, ...cardShadow },
  searchInput: { flex: 1, fontSize: 16, color: Colors.ink, fontWeight: "500" },
  quickLooks: { paddingHorizontal: Space.md },
  quickLooksTitle: { ...Fonts.tiny, marginBottom: 10, letterSpacing: 0.3 },
  demoGrid: { gap: Space.sm },
  demoCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Space.md, gap: 4, ...cardShadow },
  demoName: { ...Fonts.h3 },
  demoBrand: { ...Fonts.small },
  // Product detail
  productImg: { width: 80, height: 80, borderRadius: Radius.md, backgroundColor: Colors.cream2 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  scoreBadgeText: { fontSize: 13, fontWeight: "800" },
  fitCard: { borderWidth: 1.5 },
  fitTitle: { ...Fonts.h3, fontSize: 17, marginBottom: 2 },
  fitSummary: { ...Fonts.body, lineHeight: 21, color: Colors.inkSoft },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal600, marginTop: 7 },
  bulletText: { ...Fonts.small, flex: 1, lineHeight: 18, color: Colors.ink },
  statsRow: { flexDirection: "row", gap: Space.sm, marginTop: Space.md },
  stat: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Space.sm, alignItems: "center", ...cardShadow },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.ink },
  statLabel: { ...Fonts.small, marginTop: 2, textAlign: "center" },
  sectionTitle: { ...Fonts.h2, marginTop: Space.lg },
  divider: { height: 1, backgroundColor: Colors.hairline },
  flagRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  flagIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 1 },
  recallGoodIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.green600, alignItems: "center", justifyContent: "center" },
  recallBadIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.coral500, alignItems: "center", justifyContent: "center" },
  recallRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  purityRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Space.sm },
  purityScorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  purityScoreText: { fontSize: 13, fontWeight: "800" },
  transRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, gap: Space.sm },
  altRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  altNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center", marginTop: 1 },
  altNumberText: { fontSize: 12, fontWeight: "800", color: Colors.teal700 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  sourceText: { ...Fonts.small, color: Colors.teal700, flex: 1 },
});
