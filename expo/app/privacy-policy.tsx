import { Stack } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Space } from "@/constants/colors";

const LAST_UPDATED = "June 25, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.h}>{title}</Text>
      {children}
    </View>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

      <P>
        Petwell helps you track and understand your pet&apos;s health. This policy explains what we collect, how it is
        used, and the control you have. It is written to be read by a person, not just a lawyer.
      </P>

      <Section title="Information you provide">
        <P>
          Pet profiles (name, species, breed, age, weight, conditions, allergies), the logs you add (food, stool, skin,
          weight, activity, medications, symptoms), photos you choose to scan, triage answers, and — if you create an
          account — your email address. You decide what to enter.
        </P>
      </Section>

      <Section title="How we use it">
        <P>
          To provide the app&apos;s features: triage guidance, food reviews, the health score, patterns to watch,
          integrative support plans, programs, and vet-ready reports. Insights are generated from your own logs to help
          you and your veterinarian — never to diagnose.
        </P>
      </Section>

      <Section title="What we do NOT do">
        <P>
          We do not sell your pet&apos;s photos or health data. We do not use your pet&apos;s photos or data to train
          models when you opt out of training in Settings. We do not show pay-to-rank product recommendations.
        </P>
      </Section>

      <Section title="Storage & security">
        <P>
          With an account, your data is stored in our backend (Supabase) and isolated to you by row-level security, so
          your records are not accessible to other users. Without an account, the app can run in local mode where your
          data stays on your device. Scan photos are stored only if you allow it in Settings.
        </P>
      </Section>

      <Section title="Your choices & rights">
        <P>
          From Settings &amp; privacy you can: export all of your data as JSON (always free), delete stored scan
          images, delete your account and data, opt out of model/photo training, and turn off personalized insights or
          research sharing. Reference catalog data (e.g. ingredient or protocol libraries) is not personal data and is
          not part of your export.
        </P>
      </Section>

      <Section title="Children">
        <P>Petwell is intended for adults caring for their pets and is not directed at children under 13.</P>
      </Section>

      <Section title="Changes">
        <P>
          We may update this policy as the app evolves. Material changes will be reflected here with a new
          &ldquo;last updated&rdquo; date.
        </P>
      </Section>

      <Section title="Contact">
        <P>Questions about privacy? Email support@petwell.app.</P>
      </Section>

      <Text style={styles.footer}>
        This document is a general template provided for transparency and should be reviewed by qualified counsel
        before public launch.
      </Text>
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
