import { Stack } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Space } from "@/constants/colors";
import { PRIVACY_POLICY } from "@/lib/legal/content";

// The copy lives in lib/legal/content.ts — the single source shared with the
// hosted static pages (scripts/export-legal-pages.ts), so they can't drift.
export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: PRIVACY_POLICY.title }} />
      <Text style={styles.title}>{PRIVACY_POLICY.title}</Text>
      <Text style={styles.updated}>Last updated {PRIVACY_POLICY.lastUpdated}</Text>

      {PRIVACY_POLICY.intro.map((p, i) => (
        <Text key={i} style={styles.p}>
          {p}
        </Text>
      ))}

      {PRIVACY_POLICY.sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.h}>{s.title}</Text>
          {s.paragraphs.map((p, i) => (
            <Text key={i} style={[styles.p, i > 0 && { marginTop: 8 }]}>
              {p}
            </Text>
          ))}
        </View>
      ))}

      <Text style={styles.footer}>{PRIVACY_POLICY.footer}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  updated: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2, marginBottom: Space.md },
  section: { marginTop: Space.lg },
  h: { ...Fonts.h3, marginBottom: 6 },
  p: { ...Fonts.bodySoft, lineHeight: 22 },
  footer: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16, marginTop: Space.xl },
});
