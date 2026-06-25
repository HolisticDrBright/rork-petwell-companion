import { Stack } from "expo-router";
import { AlertTriangle, ExternalLink, Search, ShieldAlert } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, Disclaimer } from "@/components/ui";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { NO_TREATMENT_NOTE, NOT_FOUND_NOT_SAFE } from "@/lib/toxins/contacts";
import { searchToxins } from "@/lib/toxins/lookup";
import type { ToxinEntry, ToxinSeverity } from "@/lib/toxins/types";

const SEV_STYLE: Record<ToxinSeverity, { color: string; bg: string; label: string }> = {
  toxic: { color: Colors.red600, bg: Colors.red100, label: "Toxic — emergency" },
  high: { color: Colors.coral600, bg: Colors.coral100, label: "High risk" },
  caution: { color: Colors.amber600, bg: Colors.amber100, label: "Caution" },
};

const SEV_RANK: Record<ToxinSeverity, number> = { toxic: 3, high: 2, caution: 1 };

function speciesLabel(s: ToxinEntry["species"]): string {
  return s === "both" ? "Dogs & cats" : s === "cat" ? "Cats" : "Dogs";
}

function categoryLabel(c: ToxinEntry["category"]): string {
  return c === "essential_oil" ? "essential oil" : c;
}

export default function ToxinsScreen() {
  const [query, setQuery] = useState<string>("");

  const results = useMemo(() => {
    const list = searchToxins(query);
    return [...list].sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || a.name.localeCompare(b.name));
  }, [query]);

  const trimmed = query.trim();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Is it toxic?" }} />
      <ScrollView
        contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Emergency contacts — always visible, top of screen */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHead}>
            <ShieldAlert size={18} color={Colors.coral600} />
            <Text style={styles.emergencyTitle}>Animal poison control</Text>
          </View>
          <EmergencyContacts />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={18} color={Colors.inkFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search a food, plant, product, or medicine"
            placeholderTextColor={Colors.inkFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search the toxin database"
          />
        </View>
        <Text style={styles.scopeNote}>
          Covering the {searchToxins("").length} highest-priority toxins for dogs and cats. Showing all species so
          nothing is hidden.
        </Text>

        {/* Results */}
        {results.length === 0 ? (
          <View style={styles.notFound}>
            <AlertTriangle size={20} color={Colors.amber600} />
            <Text style={styles.notFoundTitle}>No match for “{trimmed}”</Text>
            <Text style={styles.notFoundText}>{NOT_FOUND_NOT_SAFE}</Text>
          </View>
        ) : (
          results.map((entry) => <ToxinCard key={entry.slug} entry={entry} />)
        )}

        {/* Footer: never-treatment note + standard disclaimer */}
        <View style={styles.footNote}>
          <Text style={styles.footNoteText}>{NO_TREATMENT_NOTE}</Text>
        </View>
        <View style={{ marginTop: Space.md }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

function ToxinCard({ entry }: { entry: ToxinEntry }) {
  const sev = SEV_STYLE[entry.severity];
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.name}>{entry.name}</Text>
        <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
          <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{speciesLabel(entry.species)}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{categoryLabel(entry.category)}</Text>
        </View>
        {entry.bodySystems.map((b) => (
          <View key={b} style={styles.tag}>
            <Text style={styles.tagText}>{b}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>{entry.note}</Text>

      <Text style={styles.signsLabel}>Signs to watch for</Text>
      <Text style={styles.signs}>{entry.signs.join(" · ")}</Text>

      {/* Provenance: source, last reviewed, review status */}
      <View style={styles.provRow}>
        <Pressable
          style={styles.sourceLink}
          onPress={() => Linking.openURL(entry.source.url).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={`Open source: ${entry.source.name}`}
        >
          <ExternalLink size={13} color={Colors.teal700} />
          <Text style={styles.sourceText} numberOfLines={1}>
            {entry.source.name}
          </Text>
        </Pressable>
      </View>
      <View style={styles.provMetaRow}>
        <Text style={styles.provMeta}>Reviewed {entry.lastReviewed}</Text>
        <View style={styles.reviewBadge}>
          <Text style={styles.reviewBadgeText}>
            {entry.reviewStatus === "vet_reviewed" ? "Vet reviewed" : "Pending vet review"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  emergencyCard: {
    backgroundColor: Colors.coral100,
    borderRadius: Radius.lg,
    padding: Space.md,
    gap: 10,
  },
  emergencyHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  emergencyTitle: { ...Fonts.h3, color: Colors.coral600 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Space.sm,
    marginTop: Space.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  searchInput: { flex: 1, paddingVertical: 12, ...Fonts.body, color: Colors.ink },
  scopeNote: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 6, lineHeight: 15 },
  notFound: {
    backgroundColor: Colors.amber100,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: Space.md,
    gap: 6,
    alignItems: "flex-start",
  },
  notFoundTitle: { ...Fonts.h3, color: Colors.ink },
  notFoundText: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  card: { gap: 8, marginTop: Space.md },
  cardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  name: { ...Fonts.h2, fontSize: 17, flex: 1 },
  sevBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill },
  sevText: { fontSize: 11, fontWeight: "800" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: Colors.cream2, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { ...Fonts.tiny, color: Colors.inkSoft, textTransform: "capitalize" },
  note: { ...Fonts.body, color: Colors.inkSoft, lineHeight: 20 },
  signsLabel: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.4, marginTop: 2 },
  signs: { ...Fonts.small, color: Colors.ink, lineHeight: 19 },
  provRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  sourceText: { ...Fonts.tiny, color: Colors.teal700, flex: 1 },
  provMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  provMeta: { ...Fonts.tiny, color: Colors.inkFaint },
  reviewBadge: { backgroundColor: Colors.amber100, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  reviewBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.amber600 },
  footNote: { backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: Space.md, marginTop: Space.lg },
  footNoteText: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
});
