import { Stack } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { TERMS_OF_USE } from "@/lib/legal/content";

// The copy lives in lib/legal/content.ts — the single source shared with the
// hosted static pages (scripts/export-legal-pages.ts), so they can't drift.
export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: TERMS_OF_USE.title }} />
      <Text style={styles.title}>{TERMS_OF_USE.title}</Text>
      <Text style={styles.updated}>Last updated {TERMS_OF_USE.lastUpdated}</Text>

      {/* The most important term, up top */}
      {TERMS_OF_USE.callout ? (
        <View style={styles.callout}>
          <TriangleAlert size={18} color={Colors.amber600} />
          <Text style={styles.calloutText}>{TERMS_OF_USE.callout}</Text>
        </View>
      ) : null}

      {TERMS_OF_USE.sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.h}>{s.title}</Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={[styles.p, i > 0 && { marginTop: 8 }]}>
              {p}
            </Text>
          ))}
        </View>
      ))}

      <Text style={styles.footer}>{TERMS_OF_USE.footer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  updated: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2, marginBottom: Space.md },
  callout: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.amber100, borderRadius: Radius.md, padding: Space.md },
  calloutText: { ...Fonts.small, color: Colors.ink, flex: 1, lineHeight: 19, fontWeight: "600" },
  section: { marginTop: Space.lg },
  h: { ...Fonts.h3, marginBottom: 6 },
  p: { ...Fonts.bodySoft, lineHeight: 22 },
  footer: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16, marginTop: Space.xl },
});
