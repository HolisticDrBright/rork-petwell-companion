import { Stack, useRouter } from "expo-router";
import {
  Bell,
  Bluetooth,
  ChevronRight,
  Crown,
  Download,
  FileText,
  Lock,
  Mail,
  PawPrint,
  Shield,
  Trash2,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

interface Row {
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  route?: string;
  danger?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { premium } = usePets();

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "Pets & care",
      rows: [
        { label: "Manage pets", icon: PawPrint, route: "/add-pet" },
        { label: "Reminders", icon: Bell, route: "/reminders" },
        { label: "Connected devices", icon: Bluetooth, route: "/devices" },
      ],
    },
    {
      title: "Data & privacy",
      rows: [
        { label: "Export all data (PDF)", icon: Download, route: "/vet-report" },
        { label: "Privacy policy", icon: Shield },
        { label: "Data permissions", icon: Lock },
      ],
    },
    {
      title: "Support",
      rows: [
        { label: "Contact us", icon: Mail },
        { label: "Vet-ready report guide", icon: FileText, route: "/vet-report" },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Settings & privacy" }} />

      {/* Premium banner */}
      <Pressable
        onPress={() => router.push("/premium")}
        style={({ pressed }) => [styles.premiumBanner, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.crownWrap}>
          <Crown size={22} color={Colors.amber500} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumTitle}>{premium ? "Premium active" : "Petwell Premium"}</Text>
          <Text style={styles.premiumSub}>
            {premium ? "Thanks for supporting Petwell" : "Unlimited scans, correlations & more"}
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
      </Pressable>

      {/* Privacy promise */}
      <View style={styles.promise}>
        <Shield size={18} color={Colors.teal700} />
        <Text style={styles.promiseText}>
          Your pet&apos;s data belongs to you. We never sell pet photos or health data, and export is
          always free.
        </Text>
      </View>

      {groups.map((g) => (
        <View key={g.title} style={styles.group}>
          <Text style={styles.groupTitle}>{g.title}</Text>
          <Card style={{ gap: 0 }}>
            {g.rows.map((r, i) => (
              <View key={r.label}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => (r.route ? router.push(r.route as never) : undefined)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                >
                  <r.icon size={19} color={r.danger ? Colors.red600 : Colors.teal700} />
                  <Text style={[styles.rowLabel, r.danger && { color: Colors.red600 }]}>{r.label}</Text>
                  <ChevronRight size={17} color={Colors.inkFaint} />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Pressable style={styles.deleteRow}>
        <Trash2 size={18} color={Colors.red600} />
        <Text style={styles.deleteText}>Delete account & data</Text>
      </Pressable>

      <Text style={styles.version}>Petwell · v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.teal800,
    borderRadius: Radius.lg,
    padding: Space.md,
  },
  crownWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { ...Fonts.h2, color: "#fff", fontSize: 17 },
  premiumSub: { ...Fonts.small, color: Colors.teal100, marginTop: 1 },
  promise: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.md,
  },
  promiseText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  group: { marginTop: Space.lg },
  groupTitle: { ...Fonts.tiny, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: Colors.hairline, marginLeft: 46 },
  row: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 14 },
  rowLabel: { ...Fonts.h3, flex: 1, fontSize: 15 },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: Space.xl, paddingVertical: 12 },
  deleteText: { ...Fonts.h3, color: Colors.red600, fontSize: 15 },
  version: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.md },
});
