import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { AFFILIATE_DISCLOSURE } from "@/lib/integrative/marketplace";

/**
 * FTC affiliate disclosure. MUST be rendered on every screen that can show an
 * affiliate (or retailer) outbound product link — marketplace, food results,
 * care plans — not only where the link happens to be tapped. A source-scan
 * test (tests/data.test.ts) enforces that any screen referencing affiliate or
 * retailer-fallback URLs also renders this component.
 */
export function AffiliateDisclosure() {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.text}>{AFFILIATE_DISCLOSURE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: Space.sm,
    marginTop: Space.sm,
  },
  text: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 16 },
});
