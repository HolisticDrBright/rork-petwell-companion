import { Stack } from "expo-router";
import { Bell, Clock, Plus, Repeat } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useQueryClient } from "@tanstack/react-query";

import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";
import { remindersService } from "@/services";
import type { Reminder } from "@/types/pet";

export default function RemindersScreen() {
  const { selectedPet, reminders, toggleReminder, mode } = usePets();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [label, setLabel] = useState<string>("");
  const [time, setTime] = useState<string>("");
  // Locally-added reminders are scoped per pet so they don't bleed across the
  // in-screen PetSwitcher.
  const [extraByPet, setExtraByPet] = useState<Record<string, Reminder[]>>({});
  const [extraEnabled, setExtraEnabled] = useState<Record<string, boolean>>({});

  const save = useCallback(async () => {
    const lbl = label.trim();
    if (!lbl) {
      setAddOpen(false);
      return;
    }
    const reminder: Reminder = {
      id: `local-${Date.now()}`,
      label: lbl,
      detail: "Custom reminder",
      time: time.trim() || "9:00a",
      repeat: "Daily",
      enabled: true,
    };
    if (mode === "remote") {
      try {
        await remindersService.createReminder(selectedPet.id, {
          label: lbl,
          time: reminder.time,
          repeat: "Daily",
          detail: reminder.detail,
        });
        queryClient.invalidateQueries({ queryKey: ["reminders", selectedPet.id] });
      } catch (e) {
        console.warn("[petwell] add reminder failed:", e);
      }
    } else {
      setExtraByPet((prev) => ({ ...prev, [selectedPet.id]: [...(prev[selectedPet.id] ?? []), reminder] }));
      setExtraEnabled((prev) => ({ ...prev, [reminder.id]: true }));
    }
    setLabel("");
    setTime("");
    setAddOpen(false);
  }, [label, time, mode, selectedPet.id, queryClient]);

  const extra = extraByPet[selectedPet.id] ?? [];
  const all: { reminder: Reminder; local: boolean }[] = [
    ...reminders.map((r) => ({ reminder: r, local: false })),
    ...extra.map((r) => ({ reminder: { ...r, enabled: extraEnabled[r.id] ?? true }, local: true })),
  ];

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
      <Text style={styles.subtitle}>Care, medication, and follow-up nudges for {selectedPet.name}.</Text>

      <View style={{ gap: Space.sm, marginTop: Space.md }}>
        {all.map(({ reminder: r, local }) => (
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
              onValueChange={(v) =>
                local
                  ? setExtraEnabled((prev) => ({ ...prev, [r.id]: v }))
                  : toggleReminder(`${selectedPet.id}:${r.id}`, v)
              }
              trackColor={{ true: Colors.teal500, false: Colors.hairline }}
              thumbColor="#fff"
            />
          </Card>
        ))}
      </View>

      <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
        <Plus size={18} color={Colors.teal700} />
        <Text style={styles.addText}>Add a reminder</Text>
      </Pressable>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={Fonts.h2}>New reminder</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="What to remember (e.g. Give Apoquel)"
              placeholderTextColor={Colors.inkFaint}
              style={styles.modalInput}
              autoFocus
            />
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="Time (e.g. 8:00a)"
              placeholderTextColor={Colors.inkFaint}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setAddOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton label="Add reminder" variant="primary" onPress={save} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: Space.lg },
  modalCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.lg, gap: 12 },
  modalInput: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 2 },
});
