import { Stack } from "expo-router";
import { Bell, Clock, Plus, Repeat } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { PetSwitcher } from "@/components/PetSwitcher";
import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

export default function RemindersScreen() {
  const { selectedPet, reminders, toggleReminder } = usePets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Reminders" }} />

      <View style={{ marginBottom: Space.md }}>
        <PetSwitcher />
      </View>

      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.subtitle}>
        Care, medication, and follow-up nudges for {selectedPet.name}.
      </Text>

      <View style={{ gap: Space.sm, marginTop: Space.md }}>
        {reminders.map((r) => {
          const key = `${selectedPet.id}:${r.id}`;
          return (
            <Card key={r.id} style={styles.reminderCard}>
              <View style={[styles.iconWrap, !r.enabled && styles.iconWrapOff]}>
                <Bell size={20} color={r.enabled ? Colors.teal700 : Colors.inkFaint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Fonts.h3, !r.enabled && { color: Colors.inkFaint }]}>{r.label}</Text>
                <Text style={Fonts.small}>{r.detail}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Clock size={12} color={Colors.inkSoft} />
                    <Text style={styles.metaText}>{r.time}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Repeat size={12} color={Colors.inkSoft} />
                    <Text style={styles.metaText}>{r.repeat}</Text>
                  </View>
                </View>
              </View>
              <Switch
                value={r.enabled}
                onValueChange={(v) => toggleReminder(key, v)}
                trackColor={{ true: Colors.teal500, false: Colors.hairline }}
                thumbColor="#fff"
              />
            </Card>
          );
        })}
      </View>

      <Pressable style={styles.addBtn}>
        <Plus size={18} color={Colors.teal700} />
        <Text style={styles.addText}>Add a reminder</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, marginTop: 4 },
  reminderCard: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapOff: { backgroundColor: Colors.cream2 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.cream2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  metaText: { ...Fonts.small, fontSize: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.lg,
    paddingVertical: 16,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.teal100,
    borderStyle: "dashed",
  },
  addText: { ...Fonts.h3, color: Colors.teal700 },
});
