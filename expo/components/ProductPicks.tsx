import { AlertTriangle, ExternalLink, Package, ShieldAlert } from "lucide-react-native";
import React, { memo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { AffiliateDisclosure } from "@/components/AffiliateDisclosure";
import { EvidenceBadge, InfoNote } from "@/components/integrative";
import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { KITS } from "@/lib/protocols/productCatalog";
import type { ProductPick, ProtocolProducts } from "@/lib/protocols/productPicks";
import { PRODUCT_LIST_CAVEAT } from "@/lib/protocols/productPicks";
import { ACTION_EXPLAINER, ACTION_LABEL, GRADE_MEANING, type ProductAction } from "@/lib/protocols/productSafety";

const ACTION_STYLE: Record<ProductAction, { color: string; bg: string }> = {
  recommend: { color: Colors.green600, bg: Colors.green100 },
  caution: { color: Colors.amber600, bg: Colors.amber100 },
  vet_only: { color: Colors.teal700, bg: Colors.teal50 },
  info_only: { color: Colors.inkSoft, bg: Colors.cream2 },
  avoid: { color: Colors.red600, bg: Colors.red100 },
};

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** What's inside a multi-product kit, each piece graded on its own. */
const KitContents = memo(function KitContents({ productId }: { productId: string }) {
  const kit = KITS[productId];
  if (!kit) return null;
  return (
    <View style={styles.kitBox}>
      <Text style={styles.kitTitle}>What&apos;s inside</Text>
      {kit.components.map((c, i) => (
        <View key={`${c.name}-${i}`} style={styles.kitRow}>
          <View style={styles.kitGrade}>
            <Text style={styles.kitGradeText}>{c.grade}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kitName}>
              {c.name}
              {c.step ? <Text style={styles.kitStep}> · {c.step}</Text> : null}
            </Text>
            <Text style={styles.kitWhat}>{c.what}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.kitNote}>{kit.note}</Text>
      <Text style={styles.kitNote}>
        Each part is graded on its own evidence. Petwell doesn&apos;t give a bundle a single grade — that would
        let the strongest ingredient speak for the weakest.
      </Text>
    </View>
  );
});

const ProductCard = memo(function ProductCard({ pick }: { pick: ProductPick }) {
  const { product, verdict, action } = pick;
  const tone = ACTION_STYLE[action];
  const price =
    product.priceUsd === null
      ? "price via your vet"
      : `$${product.priceUsd.toFixed(2)} when checked`;

  return (
    <Card style={styles.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.brand}>{product.brand}</Text>
        </View>
        <EvidenceBadge grade={product.grade} />
      </View>

      <View style={[styles.actionPill, { backgroundColor: tone.bg }]}>
        <Text style={[styles.actionText, { color: tone.color }]}>{ACTION_LABEL[action]}</Text>
      </View>
      <Text style={styles.actionExplainer}>{ACTION_EXPLAINER[action]}</Text>

      <Text style={styles.summary}>{product.summary}</Text>
      <Text style={styles.gradeMeaning}>
        <Text style={styles.gradeKey}>Grade {product.grade} · </Text>
        {GRADE_MEANING[product.grade]}
      </Text>

      {product.isKit ? <KitContents productId={product.id} /> : null}

      {verdict.notes.length > 0 ? (
        <View style={styles.notes}>
          {verdict.notes.map((n) => (
            <View key={`${n.ruleId}-${n.label}`} style={styles.noteRow}>
              <AlertTriangle size={14} color={Colors.amber600} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noteCopy}>{n.copy}</Text>
                <Text style={styles.noteBasis}>{n.basis}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => openUrl(product.url)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${product.name} at ${product.store}`}
        style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.8 }]}
      >
        <ExternalLink size={15} color={Colors.teal700} />
        <Text style={styles.linkText}>
          View at {product.store} · {price}
        </Text>
      </Pressable>
    </Card>
  );
});

const NotRecommendedCard = memo(function NotRecommendedCard({ pick }: { pick: ProductPick }) {
  const { product, verdict } = pick;
  return (
    <Card style={[styles.card, styles.avoidCard]}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.brand}>{product.brand}</Text>
        </View>
        <ShieldAlert size={18} color={Colors.red600} />
      </View>
      <Text style={styles.avoidWhy}>{product.summary}</Text>
      {verdict.notes.map((n) => (
        <Text key={`${n.ruleId}-${n.label}`} style={styles.avoidNote}>
          {n.copy}
        </Text>
      ))}
    </Card>
  );
});

/**
 * The product section of a protocol. Renders nothing at all when there are no
 * graded products for this condition — an empty "Products" heading reads like a
 * shop that's out of stock, which isn't what's happening.
 */
export const ProductPicks = memo(function ProductPicks({ products }: { products: ProtocolProducts }) {
  if (products.emergency) {
    return (
      <View style={styles.section}>
        <View style={styles.emergency}>
          <ShieldAlert size={20} color="#fff" />
          <Text style={styles.emergencyText}>{products.emergency.copy}</Text>
        </View>
      </View>
    );
  }

  if (products.picks.length === 0 && products.notRecommended.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Package size={18} color={Colors.teal700} />
        <Text style={styles.sectionTitle}>Products people use for this</Text>
      </View>
      <InfoNote>{PRODUCT_LIST_CAVEAT}</InfoNote>

      {products.picks.map((p) => (
        <ProductCard key={p.product.id} pick={p} />
      ))}

      {products.notRecommended.length > 0 ? (
        <>
          <Text style={styles.avoidHeading}>Sold for this, but we don&apos;t recommend it</Text>
          {products.notRecommended.map((p) => (
            <NotRecommendedCard key={p.product.id} pick={p} />
          ))}
        </>
      ) : null}

      <AffiliateDisclosure />
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginTop: Space.lg, gap: Space.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { ...Fonts.h2 },
  card: { gap: 8 },
  avoidCard: { borderWidth: 1, borderColor: Colors.red100 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: Space.sm },
  name: { ...Fonts.h3 },
  brand: { ...Fonts.small, color: Colors.inkFaint, marginTop: 1 },
  actionPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  actionText: { ...Fonts.tiny, fontWeight: "800" },
  actionExplainer: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  summary: { ...Fonts.body, lineHeight: 21 },
  gradeMeaning: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16 },
  gradeKey: { fontWeight: "800", color: Colors.inkSoft },
  notes: { gap: 8, marginTop: 2 },
  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  noteCopy: { ...Fonts.small, color: Colors.ink, lineHeight: 18 },
  noteBasis: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 2, lineHeight: 15 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  linkText: { ...Fonts.small, color: Colors.teal700, fontWeight: "700" },
  avoidHeading: { ...Fonts.h3, marginTop: Space.sm, color: Colors.red600 },
  avoidWhy: { ...Fonts.body, lineHeight: 21 },
  avoidNote: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 18 },
  emergency: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.red600,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  emergencyText: { ...Fonts.body, color: "#fff", fontWeight: "700", flex: 1, lineHeight: 21 },
  kitBox: {
    backgroundColor: Colors.cream2,
    borderRadius: Radius.sm,
    padding: Space.sm,
    gap: 8,
    marginTop: 2,
  },
  kitTitle: { ...Fonts.tiny, fontWeight: "800", color: Colors.inkSoft, letterSpacing: 0.3 },
  kitRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  kitGrade: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  kitGradeText: { ...Fonts.tiny, fontWeight: "800", color: Colors.inkSoft },
  kitName: { ...Fonts.small, fontWeight: "700", color: Colors.ink },
  kitStep: { fontWeight: "400", color: Colors.inkFaint },
  kitWhat: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
  kitNote: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16 },
});
