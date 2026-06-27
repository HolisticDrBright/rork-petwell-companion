import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { PawPrint, Plus, Sparkles } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { config } from "@/lib/config";
import { usePets } from "@/providers/PetProvider";

/**
 * First-run empty state. Production no longer auto-seeds demo pets, so a brand-new
 * account genuinely has zero pets — instead of crashing the pet-dependent screens
 * (or, worse, showing fake Buddy/Luna/Milo) we show this and route to /add-pet.
 *
 * The "Try a demo profile" shortcut is offered only when a backend is connected
 * (so the seeded demo pets persist and carry their DEMO label). It is never
 * auto-loaded — the user has to tap it.
 */
export function FirstPetGate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canUseAuth, loadDemoProfile } = usePets();
  const [busy, setBusy] = useState<boolean>(false);

  const onTryDemo = useCallback(async () => {
    setBusy(true);
    const ok = await loadDemoProfile();
    if (!ok) setBusy(false); // on success the gate unmounts as pets arrive
  }, [loadDemoProfile]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + Space.lg }]}>
      <View style={styles.hero}>
        <LinearGradient colors={[Colors.teal700, Colors.teal900]} style={styles.heroCircle}>
          <PawPrint size={52} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>Add your first pet</Text>
        <Text style={styles.subtitle}>
          Petwell organizes food, symptoms, records, reminders, and vet-ready answers around your
          pet. Create a profile to get started — it&apos;s yours, and you can export it anytime.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Add a pet"
          variant="coral"
          icon={<Plus size={18} color="#fff" />}
          onPress={() => router.push("/add-pet")}
        />
        {canUseAuth && config.demoModeEnabled ? (
          <Pressable
            onPress={onTryDemo}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Try a demo profile with sample pets"
            style={({ pressed }) => [styles.demoLink, pressed && { opacity: 0.7 }]}
          >
            {busy ? (
              <ActivityIndicator color={Colors.teal700} />
            ) : (
              <>
                <Sparkles size={16} color={Colors.teal700} />
                <Text style={styles.demoText}>Just exploring? Try a demo profile</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, paddingHorizontal: Space.lg, justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: Space.md },
  heroCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.sm,
    shadowColor: Colors.teal900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { ...Fonts.title, textAlign: "center" },
  subtitle: { ...Fonts.body, fontSize: 16, color: Colors.inkSoft, textAlign: "center", lineHeight: 24 },
  footer: { gap: 6 },
  demoLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  demoText: { ...Fonts.h3, color: Colors.teal700, fontSize: 14.5 },
});
