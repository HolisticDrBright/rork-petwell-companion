import { Stack } from "expo-router";
import { BadgeCheck, ExternalLink, FlaskConical, Scale, ShieldCheck, ShoppingBag } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { NoPetSelected } from "@/components/NoPetSelected";
import { EvidenceBadge, InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getMode } from "@/lib/backend";
import {
  AFFILIATE_DISCLOSURE,
  MARKETPLACE_STATUS,
  MARKETPLACE_STATUS_LIVE,
  PRODUCT_CATEGORIES,
  rankProducts,
  type MarketplaceProduct,
  type ProductCategory,
} from "@/lib/integrative/marketplace";
import { isSupabaseConfigured } from "@/lib/supabase";
import { marketplaceService } from "@/services/marketplaceService";
import { usePets } from "@/providers/PetProvider";

export default function MarketplaceScreen() {
  const { selectedPet } = usePets();
  const [category, setCategory] = useState<ProductCategory>("food");
  const [liveCatalog, setLiveCatalog] = useState<MarketplaceProduct[] | null>(null);

  // Load the researched catalog in remote mode; the bundled research preview
  // stays as the offline/demo fallback so the screen never goes blank.
  useEffect(() => {
    if (!(isSupabaseConfigured && getMode() === "remote")) return;
    let alive = true;
    marketplaceService
      .listCatalog()
      .then((products) => {
        if (alive && products.length > 0) setLiveCatalog(products);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const isLive = (liveCatalog?.length ?? 0) > 0;
  const ranked = useMemo(
    () => (selectedPet ? rankProducts(category, selectedPet, liveCatalog ?? undefined) : []),
    [category, selectedPet, liveCatalog],
  );

  if (!selectedPet) return <NoPetSelected />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Trusted picks" subtitle="Best fit on the evidence we can verify — never pay-to-rank" />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Trust banner */}
        <Card style={styles.trustCard}>
          <ShieldCheck size={18} color={Colors.teal700} />
          <View style={{ flex: 1 }}>
            <View style={styles.previewPill}>
              <Text style={styles.previewPillText}>{isLive ? MARKETPLACE_STATUS_LIVE : MARKETPLACE_STATUS}</Text>
            </View>
            <Text style={styles.trustText}>
              These are the most transparent foods based on public evidence — ranked on pet fit, species safety, recalls,
              ingredient transparency, and any lab testing, never on payment. We say &ldquo;best fit on available
              data,&rdquo; not &ldquo;cleanest&rdquo; or &ldquo;safest&rdquo;: those need product-level lab proof no
              mainstream brand publishes yet.
            </Text>
          </View>
        </Card>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: Space.md }}
          style={{ marginTop: Space.md, marginBottom: Space.sm }}
        >
          {PRODUCT_CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategory(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {ranked.map((r, idx) => (
          <Card key={r.product.id} style={[styles.productCard, !r.speciesSafe && styles.dimCard]}>
            <View style={styles.prodHead}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{r.product.name}</Text>
                <Text style={styles.prodBrand}>{r.product.brand}</Text>
                <Text style={styles.prodBlurb}>{r.product.blurb}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <EvidenceBadge grade={r.product.evidence} />
              {r.product.labTested ? (
                <View style={styles.labBadge}>
                  <FlaskConical size={11} color={Colors.teal700} />
                  <Text style={styles.labText}>Lab tested</Text>
                </View>
              ) : null}
              {r.product.nascSeal ? (
                <View style={styles.labBadge}>
                  <ShieldCheck size={11} color={Colors.teal700} />
                  <Text style={styles.labText}>NASC seal</Text>
                </View>
              ) : null}
              {r.product.transparency >= 5 ? (
                <View style={styles.labBadge}>
                  <BadgeCheck size={11} color={Colors.teal700} />
                  <Text style={styles.labText}>Transparent</Text>
                </View>
              ) : null}
            </View>

            {!r.speciesSafe ? (
              <View style={styles.speciesWarn}>
                <Text style={styles.speciesWarnText}>Not formulated for {selectedPet.species}s — check with your vet.</Text>
              </View>
            ) : null}

            {/* Trust provenance */}
            <View style={styles.trustMeta}>
              <Text style={styles.trustMetaLine}>
                Third-party COA: {r.product.sourceUrl ? r.product.sourceUrl : "not linked in this research preview"}
              </Text>
              {r.product.recallNote ? (
                <Text style={[styles.trustMetaLine, { color: Colors.amber600 }]}>Recall note: {r.product.recallNote}</Text>
              ) : (
                <Text style={styles.trustMetaLine}>Recalls: none on file</Text>
              )}
              <Text style={styles.trustMetaLine}>Criteria last reviewed: {r.product.lastReviewed}</Text>
            </View>

            <View style={styles.whyBox}>
              <Text style={styles.whyTitle}>Review criteria</Text>
              {r.whyRanked.map((w, i) => (
                <View key={i} style={styles.whyRow}>
                  <Scale size={12} color={Colors.inkFaint} style={{ marginTop: 3 }} />
                  <Text style={styles.whyText}>{w}</Text>
                </View>
              ))}
            </View>

            {(() => {
              const link = r.product.affiliateUrl ?? r.product.productUrl;
              if (!link) return null;
              const isAffiliate = !!r.product.affiliateUrl;
              return (
                <Pressable
                  onPress={() => Linking.openURL(link).catch(() => {})}
                  accessibilityRole="link"
                  style={styles.linkBtn}
                >
                  <ExternalLink size={13} color={Colors.teal700} />
                  <Text style={styles.linkBtnText}>View at {r.product.brand}</Text>
                  {isAffiliate ? <Text style={styles.affiliateTag}>affiliate link</Text> : null}
                </Pressable>
              );
            })()}
          </Card>
        ))}

        {ranked.length === 0 ? (
          <Card style={{ marginTop: Space.sm }}>
            <Text style={styles.placeholderText}>No reviewed products in this category yet.</Text>
          </Card>
        ) : null}

        {/* Buying context + affiliate disclosure */}
        <View style={{ marginTop: Space.md, gap: Space.sm }}>
          <View style={styles.placeholderRow}>
            <ShoppingBag size={15} color={Colors.inkFaint} />
            <Text style={styles.placeholderText}>
              {isLive
                ? "Links open the brand's own site — Petwell doesn't sell or fulfill anything. Reviewed picks are not endorsements; ask your vet about any category before buying."
                : "Shopping isn't connected — this is a research preview of ranking criteria, not endorsements or buy links. Ask your vet about any category before buying."}
            </Text>
          </View>
          <InfoNote>{AFFILIATE_DISCLOSURE}</InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  trustCard: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.teal50 },
  trustText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipActive: { backgroundColor: Colors.teal800, borderColor: Colors.teal800 },
  chipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  productCard: { gap: 10, marginBottom: Space.sm },
  dimCard: { opacity: 0.7 },
  prodHead: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  rankText: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  prodName: { ...Fonts.h3, fontSize: 15 },
  prodBrand: { ...Fonts.tiny, color: Colors.teal700, marginTop: 1, letterSpacing: 0.2 },
  prodBlurb: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 18 },
  trustMeta: { backgroundColor: Colors.cream, borderRadius: Radius.sm, padding: 10, gap: 2 },
  trustMetaLine: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
  previewPill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.teal100,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 6,
  },
  previewPillText: { fontSize: 10.5, fontWeight: "800", color: Colors.teal800, letterSpacing: 0.4 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  labBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.teal50, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  labText: { fontSize: 10.5, fontWeight: "800", color: Colors.teal700 },
  speciesWarn: { backgroundColor: Colors.amber100, borderRadius: Radius.sm, padding: 8 },
  speciesWarnText: { ...Fonts.small, color: Colors.amber600, fontWeight: "700" },
  whyBox: { backgroundColor: Colors.cream, borderRadius: Radius.md, padding: 12, gap: 4 },
  whyTitle: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5, marginBottom: 2 },
  whyRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  whyText: { ...Fonts.small, color: Colors.inkSoft, flex: 1, lineHeight: 18 },
  placeholderRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  placeholderText: { ...Fonts.small, color: Colors.inkFaint, flex: 1, lineHeight: 18 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkBtnText: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  affiliateTag: { fontSize: 10, fontWeight: "700", color: Colors.inkFaint, fontStyle: "italic" },
});
