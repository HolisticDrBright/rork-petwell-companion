import { useRouter } from "expo-router";
import {
  BarChart3,
  Bone,
  Camera,
  Droplet,
  Ear,
  Eye,
  FileSearch,
  ScanLine,
  Scale,
  Smile,
  Sparkles,
  Tag,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PetSwitcher } from "@/components/PetSwitcher";
import { Card, Disclaimer } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { FOOD_SCANS, HEALTH_SCANS } from "@/constants/scans";
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
  scan: ScanLine,
  list: FileSearch,
  chart: BarChart3,
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
  const Icon = ICONS[icon] ?? Camera;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.cardIcon}>
        <Icon size={22} color={Colors.teal700} />
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardHint}>{hint}</Text>
    </Pressable>
  );
});

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet, premium } = usePets();

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
          Snap or upload a photo. We'll note what we see, suggest follow-ups, and save it to{" "}
          {selectedPet.name}'s timeline. Every result is correctable by hand.
        </Text>
      </View>

      {/* Health Scans */}
      <View style={styles.section}>
        <View style={styles.sectionLabel}>
          <Camera size={16} color={Colors.teal700} />
          <Text style={styles.sectionLabelText}>Health scans</Text>
        </View>
        <View style={styles.grid}>
          {HEALTH_SCANS.map((c) => (
            <ScanCard
              key={c.id}
              label={c.label}
              hint={c.hint}
              icon={c.icon}
              onPress={() => router.push({ pathname: "/scan-flow", params: { type: c.id } })}
            />
          ))}
        </View>
      </View>

      {/* Food Scans */}
      <View style={styles.section}>
        <View style={styles.sectionLabel}>
          <Tag size={16} color={Colors.teal700} />
          <Text style={styles.sectionLabelText}>Food scans</Text>
        </View>
        <View style={styles.grid}>
          {FOOD_SCANS.map((c) => (
            <ScanCard
              key={c.id}
              label={c.label}
              hint={c.hint}
              icon={c.icon}
              onPress={() => router.push({ pathname: "/scan-flow", params: { type: c.id } })}
            />
          ))}
        </View>
      </View>

      {/* Food Intelligence promo */}
      <Pressable
        onPress={() => router.push("/food-intelligence")}
        style={({ pressed }) => [styles.foodIntelCard, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.foodIntelIcon}>
          <FileSearch size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.foodIntelTitle}>Food Intelligence</Text>
          <Text style={styles.foodIntelSub}>
            See nutrition fit, ingredient concerns, recalls, and cleaner alternatives for any food.
          </Text>
        </View>
      </Pressable>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Every scan gives a quality score and lets you correct the result by hand. Photo checks are
          guidance, not a diagnosis.{!premium ? " Upgrade for unlimited scans." : ""}
        </Text>
      </View>

      <View style={{ marginTop: Space.md, paddingHorizontal: Space.md }}>
        <Disclaimer compact />
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
  section: { marginBottom: Space.lg },
  sectionLabel: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: Space.md, marginBottom: 10,
  },
  sectionLabelText: { ...Fonts.tiny, letterSpacing: 0.3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, paddingHorizontal: Space.md },
  card: {
    width: "48%", flexGrow: 1,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Space.md, gap: 4, ...cardShadow,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  cardLabel: { ...Fonts.h3, fontSize: 15 },
  cardHint: { ...Fonts.small, color: Colors.inkFaint },
  foodIntelCard: {
    flexDirection: "row", alignItems: "center", gap: Space.sm,
    backgroundColor: Colors.teal800, marginHorizontal: Space.md, borderRadius: Radius.lg, padding: Space.md,
  },
  foodIntelIcon: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  foodIntelTitle: { ...Fonts.h2, color: "#fff", fontSize: 17 },
  foodIntelSub: { ...Fonts.small, color: Colors.teal100, marginTop: 2 },
  note: {
    marginHorizontal: Space.md, marginTop: Space.md,
    backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: Space.md,
  },
  noteText: { ...Fonts.small, lineHeight: 19, color: Colors.inkSoft },
});
