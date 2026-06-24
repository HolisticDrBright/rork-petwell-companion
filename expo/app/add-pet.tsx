import { Stack, useRouter } from "expo-router";
import { Cat, Dog, PawPrint } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

function Field({
  label,
  placeholder,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.inkFaint}
        keyboardType={keyboard ?? "default"}
        style={styles.input}
      />
    </View>
  );
}

export default function AddPetScreen() {
  const router = useRouter();
  const { addPet } = usePets();
  const [species, setSpecies] = useState<"dog" | "cat">("dog");
  const [name, setName] = useState<string>("");
  const [breed, setBreed] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [conditions, setConditions] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    await addPet({
      name: name.trim(),
      species,
      breed: breed.trim(),
      ageYears: Number(age) || 0,
      weightLb: Number(weight) || 0,
      conditions: conditions
        .split(/[,\n]/)
        .map((c) => c.trim())
        .filter(Boolean),
    });
    router.back();
  }, [canSave, addPet, name, species, breed, age, weight, conditions, router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Add a pet" }} />

      <View style={styles.photoPick}>
        <View style={styles.photoCircle}>
          <PawPrint size={32} color={Colors.teal700} />
        </View>
        <Text style={styles.photoText}>Add a photo</Text>
      </View>

      <Text style={styles.label}>Species</Text>
      <View style={styles.speciesRow}>
        <Pressable
          onPress={() => setSpecies("dog")}
          style={[styles.speciesBtn, species === "dog" && styles.speciesActive]}
        >
          <Dog size={22} color={species === "dog" ? "#fff" : Colors.teal700} />
          <Text style={[styles.speciesText, species === "dog" && { color: "#fff" }]}>Dog</Text>
        </Pressable>
        <Pressable
          onPress={() => setSpecies("cat")}
          style={[styles.speciesBtn, species === "cat" && styles.speciesActive]}
        >
          <Cat size={22} color={species === "cat" ? "#fff" : Colors.teal700} />
          <Text style={[styles.speciesText, species === "cat" && { color: "#fff" }]}>Cat</Text>
        </Pressable>
      </View>

      <Field label="Name" placeholder="e.g. Buddy" value={name} onChange={setName} />
      <Field label="Breed / mix" placeholder="e.g. Golden Retriever" value={breed} onChange={setBreed} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field label="Age (years)" placeholder="5" value={age} onChange={setAge} keyboard="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Weight (lb)" placeholder="71" value={weight} onChange={setWeight} keyboard="numeric" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Health background</Text>
      <Text style={styles.sectionHint}>Known conditions, allergies, medications, or diet notes.</Text>
      <TextInput
        value={conditions}
        onChangeText={setConditions}
        placeholder="e.g. Chicken allergy, itchy skin, on Apoquel"
        placeholderTextColor={Colors.inkFaint}
        multiline
        style={[styles.input, styles.multiline]}
      />

      <PrimaryButton
        label={saving ? "Saving…" : "Save pet"}
        variant="coral"
        onPress={handleSave}
        style={[{ marginTop: Space.xl }, !canSave && { opacity: 0.5 }]}
      />
      <Text style={styles.note}>Your pet is saved to your Petwell account and synced across screens.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  photoPick: { alignItems: "center", gap: 8, marginBottom: Space.lg },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.teal100,
  },
  photoText: { ...Fonts.small, color: Colors.teal700 },
  label: { ...Fonts.h3, marginBottom: 8 },
  speciesRow: { flexDirection: "row", gap: Space.sm, marginBottom: Space.md },
  speciesBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
  },
  speciesActive: { backgroundColor: Colors.teal700, borderColor: Colors.teal700 },
  speciesText: { ...Fonts.h3, color: Colors.teal700 },
  field: { marginBottom: Space.md },
  fieldLabel: { ...Fonts.h3, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    ...cardShadow,
  },
  multiline: { minHeight: 90, textAlignVertical: "top", marginTop: 8 },
  row: { flexDirection: "row", gap: Space.sm },
  sectionTitle: { ...Fonts.h2, marginTop: Space.sm },
  sectionHint: { ...Fonts.small, marginTop: 2 },
  note: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: 10 },
});
