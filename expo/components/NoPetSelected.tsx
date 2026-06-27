import { useRouter } from "expo-router";
import { PawPrint, Plus } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";

/**
 * Fallback for pet-dependent screens when no pet is selected. In normal flow the
 * first-pet gate (app/(tabs)/_layout) keeps these screens from mounting without a
 * pet, but this keeps every consumer safe (deep links, race conditions) instead
 * of crashing on a null pet.
 */
export function NoPetSelected({ message }: { message?: string }) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <PawPrint size={30} color={Colors.teal700} />
      </View>
      <Text style={styles.title}>No pet selected</Text>
      <Text style={styles.subtitle}>{message ?? "Add a pet to use this screen."}</Text>
      <PrimaryButton
        label="Add a pet"
        variant="coral"
        icon={<Plus size={18} color="#fff" />}
        onPress={() => router.push("/add-pet")}
        style={{ marginTop: Space.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.lg,
    gap: Space.sm,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.sm,
  },
  title: { ...Fonts.h2, textAlign: "center" },
  subtitle: { ...Fonts.body, color: Colors.inkSoft, textAlign: "center" },
});
