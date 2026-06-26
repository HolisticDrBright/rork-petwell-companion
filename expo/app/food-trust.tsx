import { Stack } from "expo-router";
import { AlertTriangle, Award, Camera, FileSearch, FlaskConical, Microscope, ShieldCheck } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";

/**
 * "How Petwell Scores Food" — a plain-language, conservative explanation of the
 * food-trust model. Mirrors data/food-evidence/food_trust_scoring_model.md.
 *
 * Trust posture (non-negotiable): we never call a food "cleanest", "purest", or
 * "verified clean" without product-level independent lab evidence — which, as of
 * this research, no mainstream dog/cat brand publishes. We say so plainly.
 */

type Tier = { rank: string; title: string; body: string; tone: "good" | "info" | "warn" | "muted" };

const EVIDENCE_TIERS: Tier[] = [
  {
    rank: "Strongest",
    title: "Product-level lab evidence",
    body: "An independent lab tested this exact product (or lot) for contaminants. This is the only evidence that can support a strong purity statement. It is rare — most brands don't publish it.",
    tone: "good",
  },
  {
    rank: "Supporting",
    title: "Public study evidence",
    body: "A published study tested some foods in a category. Useful context, but not specific to this product or lot.",
    tone: "info",
  },
  {
    rank: "Weak",
    title: "Brand-level evidence",
    body: "Evidence about the brand or its facility, not this specific product. Weaker than product-level evidence.",
    tone: "info",
  },
  {
    rank: "Weakest",
    title: "Brand claim only",
    body: "The brand says it tests or that its food is high quality. A claim is not independent lab verification.",
    tone: "warn",
  },
  {
    rank: "Unverified",
    title: "Open-database data",
    body: "Product details pulled from an open, crowdsourced database (Open Pet Food Facts). Helpful for identifying a product, but unverified and pending review.",
    tone: "warn",
  },
  {
    rank: "None",
    title: "No public COA / no public lab test",
    body: "We found no public, product-level Certificate of Analysis. Absence of evidence is NOT proof a food is safe or unsafe — it just means we can't confirm purity.",
    tone: "muted",
  },
];

const FACTORS: { icon: React.ComponentType<{ size?: number; color?: string }>; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Recalls",
    body: "We check the FDA's official recall feed. An official product recall is weighted heavily; a brand-level recall match (same brand, different product) is flagged as a watch, not an exact-product recall.",
  },
  {
    icon: FileSearch,
    title: "Ingredient transparency",
    body: "Named ingredients and a clear guaranteed analysis score better than vague terms like 'meat by-product' or 'animal digest'. Transparency isn't purity, but it builds trust.",
  },
  {
    icon: Award,
    title: "AAFCO & life-stage fit",
    body: "Whether the food states it's complete and balanced for your pet's life stage (puppy/kitten, adult, senior) per AAFCO. A fit statement is about nutrition adequacy, not contaminant purity.",
  },
  {
    icon: Microscope,
    title: "Pet-specific fit",
    body: "We adjust for your pet: known allergies, conditions (e.g. pancreatitis, kidney), and weight goals. A food can be fine in general but a poor fit for your specific pet.",
  },
];

function tierColor(t: Tier["tone"]): { color: string; bg: string } {
  return t === "good"
    ? { color: Colors.green600, bg: Colors.green100 }
    : t === "info"
      ? { color: Colors.teal700, bg: Colors.teal50 }
      : t === "warn"
        ? { color: Colors.amber600, bg: Colors.amber100 }
        : { color: Colors.inkSoft, bg: Colors.cream2 };
}

export default function FoodTrustScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "How we score food" }} />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <FlaskConical size={22} color={Colors.teal700} />
          <Text style={styles.heroTitle}>How Petwell scores food</Text>
        </View>
        <Text style={styles.intro}>
          Petwell rates food on the strength of the evidence behind it — and it tells you exactly how strong that
          evidence is. We&apos;d rather say &quot;not enough public evidence&quot; than overstate a claim.
        </Text>

        {/* Evidence strength ladder */}
        <Text style={styles.section}>Evidence, strongest to weakest</Text>
        {EVIDENCE_TIERS.map((t) => {
          const c = tierColor(t.tone);
          return (
            <Card key={t.title} style={styles.tierCard}>
              <View style={styles.tierHead}>
                <View style={[styles.rankPill, { backgroundColor: c.bg }]}>
                  <Text style={[styles.rankText, { color: c.color }]}>{t.rank}</Text>
                </View>
                <Text style={styles.tierTitle}>{t.title}</Text>
              </View>
              <Text style={styles.tierBody}>{t.body}</Text>
            </Card>
          );
        })}

        {/* The honest gap */}
        <View style={styles.gapCard}>
          <View style={styles.tierHead}>
            <AlertTriangle size={18} color={Colors.amber600} />
            <Text style={[styles.tierTitle, { color: Colors.amber600 }]}>Why &quot;no public COA&quot; lowers confidence</Text>
          </View>
          <Text style={styles.tierBody}>
            A Certificate of Analysis (COA) is an independent lab report for a specific product. In our research, no
            mainstream dog or cat brand published downloadable, product-level independent COAs. Without one, we cannot
            confirm purity — so we keep contaminant confidence low and never call a food &quot;cleanest&quot;,
            &quot;purest&quot;, or &quot;verified clean&quot;.
          </Text>
        </View>

        {/* Other factors */}
        <Text style={styles.section}>What else we look at</Text>
        {FACTORS.map((f) => (
          <Card key={f.title} style={styles.factorCard}>
            <View style={styles.tierHead}>
              <View style={styles.factorIcon}>
                <f.icon size={16} color={Colors.teal700} />
              </View>
              <Text style={styles.tierTitle}>{f.title}</Text>
            </View>
            <Text style={styles.tierBody}>{f.body}</Text>
          </Card>
        ))}

        {/* Photo limitation */}
        <View style={styles.gapCard}>
          <View style={styles.tierHead}>
            <Camera size={18} color={Colors.amber600} />
            <Text style={[styles.tierTitle, { color: Colors.amber600 }]}>Why a photo can&apos;t prove purity</Text>
          </View>
          <Text style={styles.tierBody}>
            A photo or label scan only identifies the product and reads its ingredients. It cannot detect heavy metals,
            microplastics, pesticides, PFAS, plasticizers, or mycotoxins — those need lab testing. A scan never raises
            our purity confidence.
          </Text>
        </View>

        <View style={{ marginTop: Space.lg }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  hero: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroTitle: { ...Fonts.h2, fontSize: 22 },
  intro: { ...Fonts.body, color: Colors.inkSoft, lineHeight: 21, marginTop: 8 },
  section: { ...Fonts.h2, fontSize: 16, marginTop: Space.lg, marginBottom: 8 },
  tierCard: { gap: 6, marginBottom: Space.sm },
  tierHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill },
  rankText: { fontSize: 10.5, fontWeight: "800" },
  tierTitle: { ...Fonts.h3, fontSize: 14.5, flex: 1 },
  tierBody: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  gapCard: { backgroundColor: Colors.amber100, borderRadius: Radius.lg, padding: Space.md, marginTop: Space.md, gap: 8 },
  factorCard: { gap: 6, marginBottom: Space.sm },
  factorIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
});
