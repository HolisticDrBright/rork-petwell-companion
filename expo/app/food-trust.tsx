import { Stack } from "expo-router";
import { AlertTriangle, Award, Ban, Camera, FileSearch, FlaskConical, Microscope, ShieldCheck } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Disclaimer } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";

/**
 * "How Petwell Scores Food" — plain-language, conservative explanation of the
 * food-trust model. Mirrors data/food-evidence/food_trust_scoring_model.md and
 * the rules in lib/food/provenance.ts.
 *
 * Trust posture (non-negotiable): we never call a food "cleanest", "purest", or
 * "verified clean" without independent, current, product-level lab evidence —
 * which, per our research, no mainstream dog/cat brand publishes. We say so.
 * We do NOT surface the model's draft numeric weights to users (still in review).
 */

type Tier = { rank: string; title: string; body: string; tone: "good" | "info" | "warn" | "muted" };

const EVIDENCE_TIERS: Tier[] = [
  {
    rank: "Strongest",
    title: "Independent product-level COA",
    body: "An independent lab tested THIS product (or your bag's lot) for contaminants. It's the only evidence that can support a strong purity statement — and none of the mainstream brands we researched publish it.",
    tone: "good",
  },
  {
    rank: "Strong*",
    title: "Per-lot COA lookup tool",
    body: "Some brands let you enter your bag's lot code to pull a per-batch lab report (e.g. pathogens, mycotoxins). Real and useful — but you must check your specific lot, so we mark it 'needs review' until a document is confirmed.",
    tone: "info",
  },
  {
    rank: "Supporting",
    title: "Independent study or certification",
    body: "A published study or certification tested foods in a category (e.g. the Clean Label Project study). Real evidence — but usually about a category or brand, not your exact product.",
    tone: "info",
  },
  {
    rank: "Weak",
    title: "Brand-published values",
    body: "The brand publishes its own contaminant numbers, but the lab is unnamed and there's no independent COA. Stronger than marketing, but still a brand claim.",
    tone: "warn",
  },
  {
    rank: "Weakest",
    title: "Brand claim / marketing",
    body: "The brand says it tests, or that its food is high quality, with no values. A claim is not independent lab verification.",
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
    body: "We check the FDA's official recall feed. Recent and serious recalls (Class I, within ~2 years) weigh most. A brand-level match (same brand, different product) is a watch flag — never an exact-product recall.",
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
    title: "Brand transparency",
    body: "Whether the brand owns its facilities, names a nutritionist, publishes testing, and responds to recalls (a WSAVA-style view). Transparency builds trust but isn't a purity measurement.",
  },
  {
    icon: FlaskConical,
    title: "Pet-specific fit",
    body: "Your pet's actual profile — species, life stage, body condition, diagnoses, allergies — comes first. Breed is only a secondary, breed-aware consideration, never a 'best food for your breed' claim.",
  },
];

const CAPS: string[] = [
  "No lab evidence → purity confidence stays low (“no public lab test found”), no matter the marketing.",
  "Only an independent, CURRENT, product-level COA can unlock high purity confidence.",
  "Stale lab data (past its freshness window) is treated as out of date.",
  "We never use “cleanest”, “purest”, “safest”, or “verified clean” without that product-level evidence.",
  "A photo or label scan never raises purity confidence.",
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
          Petwell rates food on the strength of the evidence behind it — and tells you exactly how strong that
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
            mainstream dog or cat brand published downloadable, product-level independent COAs. Because of that, the
            highest any food reaches in Petwell today is &quot;candidate&quot; or &quot;needs review&quot; — never
            &quot;cleanest&quot;.
          </Text>
        </View>

        {/* What else we look at */}
        <Text style={styles.section}>What else we weigh</Text>
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

        {/* Hard rules / caps */}
        <Text style={styles.section}>Hard rules we never break</Text>
        <Card style={{ gap: 10 }}>
          {CAPS.map((c) => (
            <View key={c} style={styles.capRow}>
              <Ban size={15} color={Colors.coral600} style={{ marginTop: 2 }} />
              <Text style={styles.capText}>{c}</Text>
            </View>
          ))}
        </Card>

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
  capRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  capText: { ...Fonts.small, color: Colors.ink, flex: 1, lineHeight: 19 },
});
