import { useRouter } from "expo-router";
import {
  Bone,
  Droplet,
  Ear,
  Eye,
  Scale,
  Smile,
  Sparkles,
  Tag,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetSwitcher } from "@/components/PetSwitcher";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { SCAN_CATEGORIES } from "@/constants/scans";
import { usePets } from "@/providers/PetProvider";

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  droplet: Droplet,
  sparkle: Sparkles,
  ear: Ear,
  eye: Eye,
  tooth: Smile,
  scale: Scale,
  tag: Tag,
  bone: Bone,
};

const ScanCard = memo(function ScanCard({
  label,
  hint,
  icon,
  onPress,
}: {
  label: string;
  hint: string;
  icon: string;
  onPress: () => void;
}) {
  const Icon = ICONS[icon] ?? Droplet;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.cardIcon}>
        <Icon size={24} color={Colors.teal700} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardHint}>{hint}</Text>
    </Pressable>
  );
});

export default function ScanScreen() {
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
        <Text style={styles.title}>Scan & track</Text>
        <Text style={styles.subtitle}>
          Snap or upload a photo. We&apos;ll note what we see, suggest follow-ups, and save it to{" "}
          {selectedPet.name}&apos;s timeline.
        </Text>
      </View>

      <View style={styles.grid}>
        {SCAN_CATEGORIES.map((c) => (
          <ScanCard
            key={c.id}
            label={c.label}
            hint={c.hint}
            icon={c.icon}
            onPress={() => router.push({ pathname: "/scan-flow", params: { type: c.id } })}
          />
        ))}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Every scan gives a quality score and lets you correct the result by hand. Photo checks are
          guidance, not a diagnosis.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  intro: { paddingHorizontal: Space.md, marginTop: Space.sm, marginBottom: Space.lg },
  title: { ...Fonts.title, marginBottom: 6 },
  subtitle: { ...Fonts.bodySoft, lineHeight: 22 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    paddingHorizontal: Space.md,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    gap: 4,
    ...cardShadow,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardLabel: { ...Fonts.h3, fontSize: 15 },
  cardHint: { ...Fonts.small, color: Colors.inkFaint },
  note: {
    margin: Space.md,
    marginTop: Space.lg,
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    padding: Space.md,
  },
  noteText: { ...Fonts.small, lineHeight: 19, color: Colors.inkSoft },
});
