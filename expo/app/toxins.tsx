import { Stack, useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, Search, ShieldAlert } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, Disclaimer } from "@/components/ui";
import { EmergencyContacts } from "@/components/EmergencyContacts";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { NO_TREATMENT_NOTE, NOT_FOUND_NOT_SAFE } from "@/lib/toxins/contacts";
import { SEVERITY_LABEL, severityRank } from "@/lib/toxins/safety";
import { searchToxins } from "@/lib/toxins/search";
import type { ToxinCategory, ToxinEntry, ToxinSeverity } from "@/lib/toxins/types";
import { usePets } from "@/providers/PetProvider";

const SEV_STYLE: Record<ToxinSeverity, { color: string; bg: string }> = {
  emergency: { color: Colors.red600, bg: Colors.red100 },
  high: { color: Colors.coral600, bg: Colors.coral100 },
  caution: { color: Colors.amber600, bg: Colors.amber100 },
  usually_safe: { color: Colors.green600, bg: Colors.green100 },
  unknown: { color: Colors.inkSoft, bg: Colors.cream2 },
};

const CATEGORIES: { key: ToxinCategory; label: string }[] = [
  { key: "food", label: "Foods" },
  { key: "plant", label: "Plants" },
  { key: "medication", label: "Medications" },
  { key: "supplement", label: "Supplements" },
  { key: "household", label: "Household" },
  { key: "essential_oil", label: "Oils" },
  { key: "recreational", label: "Recreational" },
];

type SpeciesFilter = "dog" | "cat" | "all";

/** Severity to show on a list card for the current species filter. */
function cardSeverity(entry: ToxinEntry, filter: SpeciesFilter): ToxinSeverity {
  if (filter === "dog") return entry.dogSeverity;
  if (filter === "cat") return entry.catSeverity;
  return severityRank(entry.dogSeverity) >= severityRank(entry.catSeverity) ? entry.dogSeverity : entry.catSeverity;
}

export default function ToxinsScreen() {
  const router = useRouter();
  const { selectedPet } = usePets();
  const [query, setQuery] = useState<string>("");
  const [species, setSpecies] = useState<SpeciesFilter>(selectedPet.species);
  const [category, setCategory] = useState<ToxinCategory | null>(null);

  const results = useMemo(() => {
    const list = searchToxins(query, species === "all" ? undefined : species, category);
    return [...list].sort(
      (a, b) =>
        severityRank(cardSeverity(b, species)) - severityRank(cardSeverity(a, species)) || a.name.localeCompare(b.name),
    );
  }, [query, species, category]);

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

        {/* Species selector (defaults to the selected pet) */}
        <View style={styles.segment}>
          {(["dog", "cat", "all"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSpecies(s)}
              style={[styles.segmentBtn, species === s && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: species === s }}
            >
              <Text style={[styles.segmentText, species === s && styles.segmentTextActive]}>
                {s === "dog" ? "Dogs" : s === "cat" ? "Cats" : "Both"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          style={{ marginTop: 10 }}
        >
          <Pressable
            onPress={() => setCategory(null)}
            style={[styles.chip, category === null && styles.chipActive]}
          >
            <Text style={[styles.chipText, category === null && styles.chipTextActive]}>All</Text>
          </Pressable>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setCategory((prev) => (prev === c.key ? null : c.key))}
              style={[styles.chip, category === c.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.scopeNote}>
          {results.length} of {searchToxins("").length} highest-priority dog & cat toxins. Tap one for details and what to
          do.
        </Text>

        {/* Results */}
        {results.length === 0 ? (
          <View style={styles.notFound}>
            <AlertTriangle size={20} color={Colors.amber600} />
            <Text style={styles.notFoundTitle}>No match for “{trimmed}”</Text>
            <Text style={styles.notFoundText}>{NOT_FOUND_NOT_SAFE}</Text>
          </View>
        ) : (
          results.map((entry) => {
            const sev = cardSeverity(entry, species);
            const style = SEV_STYLE[sev];
            return (
              <Pressable
                key={entry.slug}
                onPress={() => router.push({ pathname: "/toxin-detail", params: { slug: entry.slug, species } })}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel={`${entry.name}, ${SEVERITY_LABEL[sev]}`}
              >
                <Card style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{entry.name}</Text>
                    <Text style={styles.cardSummary} numberOfLines={2}>
                      {entry.summary}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.sevBadge, { backgroundColor: style.bg }]}>
                      <Text style={[styles.sevText, { color: style.color }]}>{SEVERITY_LABEL[sev]}</Text>
                    </View>
                    <ChevronRight size={18} color={Colors.inkFaint} />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        {/* About / sources / review policy */}
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>About this data</Text>
          <Text style={styles.aboutText}>
            Petwell&apos;s toxin guide uses original summaries written from public veterinary poison-control references
            (ASPCA Animal Poison Control, Pet Poison Helpline, and the Merck Veterinary Manual). Each entry lists its
            source and last-reviewed date. Entries are marked “needs review” until a veterinarian verifies them.
          </Text>
          <Text style={styles.aboutText}>{NO_TREATMENT_NOTE}</Text>
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
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    padding: 3,
    marginTop: 10,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: "center" },
  segmentActive: { backgroundColor: Colors.surface },
  segmentText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  segmentTextActive: { color: Colors.teal800 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipActive: { backgroundColor: Colors.teal800, borderColor: Colors.teal800 },
  chipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  scopeNote: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 10, lineHeight: 15 },
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
  card: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Space.sm },
  name: { ...Fonts.h3, fontSize: 15 },
  cardSummary: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2, lineHeight: 17 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  sevBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.pill },
  sevText: { fontSize: 10.5, fontWeight: "800" },
  about: { backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: Space.md, marginTop: Space.lg, gap: 8 },
  aboutTitle: { ...Fonts.h3, fontSize: 14 },
  aboutText: { ...Fonts.tiny, color: Colors.inkSoft, lineHeight: 16 },
});
