/**
 * Blocking state shown when a PRODUCTION build is missing its Supabase backend
 * config. Production must never silently fall back to demo/local data, so we show
 * this instead of the app. (In development this never renders — local mode is fine.)
 */
import { CloudOff } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Space } from "@/constants/colors";

export function BackendRequired() {
  return (
    <View style={styles.container}>
      <CloudOff size={40} color={Colors.coral600} />
      <Text style={styles.title}>Setup required</Text>
      <Text style={styles.body}>
        Petwell can&apos;t reach its backend. This build is missing its Supabase configuration, so it won&apos;t load
        demo or placeholder data in its place.
      </Text>
      <Text style={styles.hint}>
        Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (EAS secrets) and rebuild.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: "center", justifyContent: "center", padding: Space.lg, gap: 12 },
  title: { ...Fonts.h2, fontSize: 22, marginTop: 6 },
  body: { ...Fonts.body, color: Colors.inkSoft, textAlign: "center", lineHeight: 22 },
  hint: { ...Fonts.tiny, color: Colors.inkFaint, textAlign: "center", lineHeight: 16, marginTop: 6 },
});
