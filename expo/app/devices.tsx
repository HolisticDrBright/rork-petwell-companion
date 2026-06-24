import { Stack } from "expo-router";
import {
  Activity,
  Bluetooth,
  Heart,
  MapPin,
  Moon,
  Wind,
} from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { DEVICES } from "@/constants/mockData";

const DATA_TYPES = [
  { label: "Activity", icon: Activity },
  { label: "Sleep", icon: Moon },
  { label: "Resting heart rate", icon: Heart },
  { label: "Respiratory rate", icon: Wind },
  { label: "Scratching", icon: Activity },
  { label: "Location", icon: MapPin },
];

export default function DevicesScreen() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Connected devices" }} />

      <Text style={styles.title}>Connected devices</Text>
      <Text style={styles.subtitle}>
        Link a wearable to bring activity, sleep, and vitals into the timeline — so behavior
        connects to diet and symptoms.
      </Text>

      <View style={styles.list}>
        {DEVICES.map((d) => {
          const isOn = connected[d.id] ?? d.connected;
          return (
            <Card key={d.id} style={styles.deviceCard}>
              <View style={styles.deviceTop}>
                <View style={styles.deviceIcon}>
                  <Bluetooth size={20} color={Colors.teal700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{d.name}</Text>
                  <Text style={[Fonts.small, { color: isOn ? Colors.green600 : Colors.inkFaint }]}>
                    {isOn ? "Connected" : "Not connected"}
                  </Text>
                </View>
                <Switch
                  value={isOn}
                  onValueChange={(v) => setConnected((c) => ({ ...c, [d.id]: v }))}
                  trackColor={{ true: Colors.teal500, false: Colors.hairline }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.tags}>
                {d.dataTypes.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Data types we can track</Text>
      <Card style={{ gap: 0 }}>
        {DATA_TYPES.map((dt, i) => (
          <View key={dt.label}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.dataRow}>
              <dt.icon size={18} color={Colors.teal700} />
              <Text style={styles.dataLabel}>{dt.label}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Text style={styles.note}>
        Wearable syncing is a preview. Connections shown here are placeholders for upcoming
        integrations.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, lineHeight: 22, marginTop: 4, marginBottom: Space.lg },
  list: { gap: Space.sm },
  deviceCard: { gap: Space.sm },
  deviceTop: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { backgroundColor: Colors.cream2, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  tagText: { ...Fonts.small, color: Colors.inkSoft, fontSize: 12 },
  sectionTitle: { ...Fonts.h2, marginTop: Space.xl, marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  dataRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  dataLabel: { ...Fonts.h3, fontSize: 15 },
  note: { ...Fonts.small, color: Colors.inkFaint, marginTop: Space.lg, lineHeight: 19, textAlign: "center" },
});
