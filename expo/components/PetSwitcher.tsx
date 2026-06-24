import { Image } from "expo-image";
import { Check, ChevronDown, Plus } from "lucide-react-native";
import React, { memo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";
import type { HealthStatus, Pet } from "@/types/pet";

const STATUS_STYLE: Record<HealthStatus, { color: string; bg: string }> = {
  stable: { color: Colors.green600, bg: Colors.green100 },
  watch: { color: Colors.amber600, bg: Colors.amber100 },
  attention: { color: Colors.coral600, bg: Colors.coral100 },
};

function speciesAge(p: Pet): string {
  return `${p.ageYears} yr ${p.breed}`;
}

export const PetSwitcher = memo(function PetSwitcher({
  onAddPet,
  light,
}: {
  onAddPet?: () => void;
  light?: boolean;
}) {
  const { selectedPet, pets, selectPet } = usePets();
  const [open, setOpen] = useState<boolean>(false);
  const status = STATUS_STYLE[selectedPet.status];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.switcher, pressed && { opacity: 0.9 }]}
      >
        <Image source={{ uri: selectedPet.photo }} style={styles.avatar} contentFit="cover" />
        <View style={styles.switcherInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, light && { color: "#fff" }]} numberOfLines={1}>
              {selectedPet.name}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>
                {selectedPet.statusNote}
              </Text>
            </View>
          </View>
          <Text style={[styles.sub, light && { color: "rgba(255,255,255,0.8)" }]} numberOfLines={1}>
            {speciesAge(selectedPet)}
          </Text>
        </View>
        <ChevronDown size={20} color={light ? "rgba(255,255,255,0.9)" : Colors.inkFaint} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={[Fonts.h2, { marginBottom: Space.sm }]}>Your pets</Text>
            {pets.map((p) => {
              const ps = STATUS_STYLE[p.status];
              const active = p.id === selectedPet.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    selectPet(p.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.petRow,
                    active && styles.petRowActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Image source={{ uri: p.photo }} style={styles.rowAvatar} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={Fonts.h3}>{p.name}</Text>
                    <Text style={Fonts.small}>{speciesAge(p)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: ps.bg }]}>
                    <Text style={[styles.statusText, { color: ps.color }]}>{p.statusNote}</Text>
                  </View>
                  {active ? <Check size={20} color={Colors.teal700} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                setOpen(false);
                onAddPet?.();
              }}
              style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.addIcon}>
                <Plus size={20} color={Colors.teal700} />
              </View>
              <Text style={[Fonts.h3, { color: Colors.teal700 }]}>Add a pet</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  switcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.cream2 },
  switcherInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { ...Fonts.h2 },
  sub: { ...Fonts.small, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill },
  statusText: { fontSize: 11.5, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(20,30,30,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Space.lg,
    paddingBottom: 40,
    gap: 8,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.hairline,
    alignSelf: "center",
    marginBottom: Space.md,
  },
  petRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    padding: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    ...cardShadow,
  },
  petRowActive: { borderWidth: 2, borderColor: Colors.teal500 },
  rowAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cream2 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    padding: Space.sm,
    marginTop: 4,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
});
