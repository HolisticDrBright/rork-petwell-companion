import { Stack } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";

const LAST_UPDATED = "June 26, 2026";

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

export default function TermsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
      <Stack.Screen options={{ title: "Terms of Use" }} />
      <Text style={styles.title}>Terms of Use</Text>
      <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>

      {/* The most important term, up top */}
      <View style={styles.callout}>
        <TriangleAlert size={18} color={Colors.amber600} />
        <Text style={styles.calloutText}>
          Petwell is not a veterinarian and does not diagnose, cure, or treat disease. Its guidance is informational
          and supportive only. For an emergency, or before changing diet, supplements, or medication, contact a
          licensed veterinarian.
        </Text>
      </View>

      <Section title="Acceptance">
        <P>By using Petwell, you agree to these terms. If you don&apos;t agree, please don&apos;t use the app.</P>
      </Section>

      <Section title="Not veterinary advice">
        <P>
          Triage urgency, food reviews, health scores, patterns, and integrative support plans are educational tools to
          help you observe trends and prepare for veterinary visits. They are not a diagnosis and are not a substitute
          for professional veterinary care. Always defer to your veterinarian, especially when red-flag signs appear.
        </P>
      </Section>

      <Section title="Emergencies">
        <P>
          Do not use Petwell to manage an emergency. If your pet shows severe signs (trouble breathing, collapse,
          seizures, pale gums, repeated vomiting, inability to urinate, suspected toxin exposure, or trauma), seek
          emergency veterinary care immediately.
        </P>
      </Section>

      <Section title="AI features">
        <P>
          Optional AI features (assistant chat, explanations, label reading, record and COA summaries) are informational
          only and are not veterinary advice. AI can be wrong or incomplete; review its output and confirm anything
          important with your veterinarian before relying on it. AI does not diagnose or prescribe and never overrides
          the emergency guidance above — urgent symptoms or suspected poisoning require a veterinarian or emergency
          clinic. AI-extracted data (labels, records, lab results) is unverified until reviewed.
        </P>
      </Section>

      <Section title="Your account & responsibility">
        <P>
          You are responsible for the accuracy of what you log and for keeping your account credentials secure. You can
          export or delete your data at any time from Settings.
        </P>
      </Section>

      <Section title="Acceptable use">
        <P>
          Use Petwell for your own pets&apos; care. Don&apos;t misuse the service, attempt to access other users&apos;
          data, or rely on it as a sole source of medical decisions.
        </P>
      </Section>

      <Section title="Privacy">
        <P>Your data is handled as described in our Privacy Policy.</P>
      </Section>

      <Section title="Disclaimers & limitation of liability">
        <P>
          Petwell is provided &ldquo;as is,&rdquo; without warranties. To the fullest extent permitted by law, Petwell
          and its makers are not liable for decisions made based on the app&apos;s guidance. Veterinary judgment always
          takes precedence.
        </P>
      </Section>

      <Section title="Changes">
        <P>We may update these terms as the app evolves; the &ldquo;last updated&rdquo; date will change accordingly.</P>
      </Section>

      <Section title="Contact">
        <P>Questions? Email support@petwell.app.</P>
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
  callout: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.amber100, borderRadius: Radius.md, padding: Space.md },
  calloutText: { ...Fonts.small, color: Colors.ink, flex: 1, lineHeight: 19, fontWeight: "600" },
  section: { marginTop: Space.lg },
  h: { ...Fonts.h3, marginBottom: 6 },
  p: { ...Fonts.bodySoft, lineHeight: 22 },
  footer: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16, marginTop: Space.xl },
});
