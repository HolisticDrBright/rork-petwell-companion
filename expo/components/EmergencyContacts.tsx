import { Phone } from "lucide-react-native";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { EMERGENCY_CONTACTS, POISON_CALL_TO_ACTION } from "@/lib/toxins/contacts";

/**
 * One-tap animal-poison emergency call buttons (ASPCA APCC + Pet Poison Helpline).
 * Reused on the toxin lookup screen, triage results, and the vet report.
 */
export function EmergencyContacts({ showCallToAction = true }: { showCallToAction?: boolean }) {
  return (
    <View style={styles.wrap}>
      {showCallToAction ? <Text style={styles.cta}>{POISON_CALL_TO_ACTION}</Text> : null}
      {EMERGENCY_CONTACTS.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => Linking.openURL(c.tel).catch(() => {})}
          style={({ pressed }) => [styles.callBtn, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel={`Call ${c.name} at ${c.display}`}
        >
          <View style={styles.callIcon}>
            <Phone size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.callName}>{c.name}</Text>
            <Text style={styles.callNote}>{c.note}</Text>
          </View>
          <Text style={styles.callNumber}>{c.display}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  cta: { ...Fonts.small, color: Colors.ink, lineHeight: 18, fontWeight: "600" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.coral500,
    borderRadius: Radius.md,
    padding: Space.sm,
  },
  callIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  callName: { ...Fonts.h3, color: "#fff", fontSize: 14.5 },
  callNote: { ...Fonts.tiny, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  callNumber: { ...Fonts.h3, color: "#fff", fontSize: 15 },
});
