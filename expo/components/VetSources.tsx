import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { VetCitation } from "../../supabase/functions/_shared/grounding";

export type { VetCitation };

export function VetSources({ citations }: { citations: VetCitation[] }) {
  if (!citations.length) return null;
  return (
    <View style={styles.sources}>
      <Text style={Fonts.tiny}>Veterinary sources</Text>
      {citations.filter(citation => citation.url.startsWith("https://")).map(citation => (
        <Pressable key={citation.source_id} accessibilityRole="link" style={styles.chip}
          onPress={() => { void Linking.openURL(citation.url).catch(() => {}); }}>
          <Text style={styles.label}>{citation.title} · {citation.publisher}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sources: { gap: Space.xs, marginTop: Space.sm },
  chip: { alignSelf: "flex-start", borderRadius: Radius.md, backgroundColor: Colors.teal50, padding: Space.sm },
  label: { ...Fonts.small, color: Colors.teal800 },
});
