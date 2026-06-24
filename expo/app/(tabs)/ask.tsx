import { useRouter } from "expo-router";
import {
  Activity,
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
import { Card, Disclaimer } from "@/components/ui";
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

const CATEGORY_LABELS: Record<string, string> = {
  digestive: "Digestive",
  skin: "Skin & coat",
  eyeear: "Eyes & ears",
  mobility: "Mobility",
  general: "General",
  urinary: "Urinary",
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

  // Group concerns by category
  const grouped = CONCERNS.reduce<Record<string, typeof CONCERNS>>((acc, c) => {
    const cat = c.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PetSwitcher onAddPet={() => router.push("/add-pet")} />
      </View>

      {/* Intro */}
      <View style={styles.intro}>
        <View style={styles.nurseBadge}>
          <ShieldCheck size={15} color={Colors.teal700} />
          <Text style={styles.nurseText}>Calm, guided intake</Text>
        </View>
        <Text style={styles.title}>What's going on with {selectedPet.name}?</Text>
        <Text style={styles.subtitle}>
          We'll ask a few short questions, starting with safety. Then share possible causes,
          what supports them, and how urgent it looks.
        </Text>
      </View>

      {/* Red-flag safety intro */}
      <Card style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>We start with red flags first</Text>
        <Text style={styles.safetyBody}>
          Before narrowing things down, we check for signs that need faster attention — like
          blood, difficulty breathing, collapse, or severe pain. If anything feels like an
          emergency right now, don't wait for this flow.
        </Text>
        <Pressable onPress={() => {}} style={styles.emergencyBtn}>
          <Text style={styles.emergencyBtnText}>Find emergency clinic</Text>
          <ChevronRight size={16} color={Colors.red600} />
        </Pressable>
      </Card>

      {/* Concern categories */}
      {Object.entries(grouped).map(([category, concerns]) => (
        <View key={category} style={styles.categorySection}>
          <Text style={styles.categoryLabel}>{CATEGORY_LABELS[category] ?? category}</Text>
          <View style={styles.categoryList}>
            {concerns.map((c) => (
              <ConcernRow
                key={c.id}
                id={c.id}
                label={c.label}
                icon={c.icon}
                onPress={() => router.push({ pathname: "/ask-flow", params: { concern: c.id } })}
              />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.disclaimerWrap}>
        <Disclaimer />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Space.md, marginBottom: Space.sm },
  intro: { paddingHorizontal: Space.md, marginTop: Space.sm, marginBottom: Space.md },
  nurseBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.teal50, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, marginBottom: 10,
  },
  nurseText: { ...Fonts.small, color: Colors.teal700 },
  title: { ...Fonts.title, marginBottom: 6, lineHeight: 32 },
  subtitle: { ...Fonts.bodySoft, lineHeight: 22 },
  safetyCard: {
    marginHorizontal: Space.md, marginBottom: Space.md,
    backgroundColor: Colors.red100, borderWidth: 1, borderColor: Colors.red100,
    gap: Space.sm,
  },
  safetyTitle: { ...Fonts.h3, color: Colors.red600 },
  safetyBody: { ...Fonts.small, lineHeight: 19, color: Colors.ink },
  emergencyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    paddingVertical: 4,
  },
  emergencyBtnText: { fontSize: 13, fontWeight: "700", color: Colors.red600 },
  categorySection: { marginBottom: Space.sm },
  categoryLabel: { ...Fonts.tiny, paddingHorizontal: Space.md, marginBottom: 8, letterSpacing: 0.5 },
  categoryList: { paddingHorizontal: Space.md, gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: Space.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, ...cardShadow,
  },
  rowIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center",
  },
  rowLabel: { ...Fonts.h3, flex: 1 },
  disclaimerWrap: { paddingHorizontal: Space.md, marginTop: Space.md },
});
