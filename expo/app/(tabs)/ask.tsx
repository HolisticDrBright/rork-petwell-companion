import { useRouter } from "expo-router";
import {
  Battery,
  Bone,
  ChevronRight,
  Droplet,
  Ear,
  Eye,
  Footprints,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetSwitcher } from "@/components/PetSwitcher";
import { Disclaimer } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { CONCERNS } from "@/constants/triage";
import { usePets } from "@/providers/PetProvider";

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  droplet: Droplet,
  wave: Waves,
  sparkle: Sparkles,
  ear: Ear,
  eye: Eye,
  footprint: Footprints,
  bone: Bone,
  battery: Battery,
  toilet: Droplet,
  more: MoreHorizontal,
};

const ConcernRow = memo(function ConcernRow({
  id,
  label,
  icon,
  onPress,
}: {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const Icon = ICONS[icon] ?? MoreHorizontal;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.rowIcon}>
        <Icon size={20} color={Colors.teal700} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={18} color={Colors.inkFaint} />
    </Pressable>
  );
});

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet } = usePets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
      </View>

      <View style={styles.intro}>
        <View style={styles.nurseBadge}>
          <ShieldCheck size={15} color={Colors.teal700} />
          <Text style={styles.nurseText}>Calm, guided intake</Text>
        </View>
        <Text style={styles.title}>What&apos;s going on with {selectedPet.name}?</Text>
        <Text style={styles.subtitle}>
          We&apos;ll ask a few short questions, starting with safety, then share possible causes and
          how urgent it looks.
        </Text>
      </View>

      <View style={styles.list}>
        {CONCERNS.map((c) => (
          <ConcernRow
            key={c.id}
            id={c.id}
            label={c.label}
            icon={c.icon}
            onPress={() => router.push({ pathname: "/ask-flow", params: { concern: c.id } })}
          />
        ))}
      </View>

      <View style={styles.disclaimerWrap}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  intro: { paddingHorizontal: Space.md, marginTop: Space.sm, marginBottom: Space.lg },
  nurseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.teal50,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    marginBottom: 10,
  },
  nurseText: { ...Fonts.small, color: Colors.teal700 },
  title: { ...Fonts.title, marginBottom: 6 },
  subtitle: { ...Fonts.bodySoft, lineHeight: 22 },
  list: { paddingHorizontal: Space.md, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    ...cardShadow,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...Fonts.h3, flex: 1 },
  disclaimerWrap: { paddingHorizontal: Space.md, marginTop: Space.lg },
});
