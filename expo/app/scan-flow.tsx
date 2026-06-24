import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, Lightbulb, Target, Upload } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { SCAN_CATEGORIES } from "@/constants/scans";
import { usePets } from "@/providers/PetProvider";

const GUIDANCE = [
  { icon: Lightbulb, text: "Use bright, natural light" },
  { icon: Target, text: "Keep the area centered and in focus" },
  { icon: ImagePlus, text: "Upload existing photos if that's easier" },
];

export default function ScanFlowScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { selectedPet } = usePets();
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");

  const category = useMemo(
    () => SCAN_CATEGORIES.find((c) => c.id === type),
    [type]
  );

  const pickImage = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
    } catch {
      // ignore picker errors
    }
  }, []);

  const analyze = useCallback(() => {
    router.replace({ pathname: "/scan-result", params: { type: type ?? "poop", notes } });
  }, [router, type, notes]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: category?.label ?? "Scan" }} />

      <Text style={styles.title}>{category?.label ?? "Scan"}</Text>
      <Text style={styles.subtitle}>
        For {selectedPet.name} · {category?.hint}
      </Text>

      {/* Photo area */}
      <Pressable onPress={pickImage} style={styles.photoArea}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <>
            <View style={styles.cameraCircle}>
              <Camera size={30} color={Colors.teal700} />
            </View>
            <Text style={styles.photoTitle}>Take or upload a photo</Text>
            <Text style={styles.photoHint}>Tap to choose from your library</Text>
          </>
        )}
      </Pressable>

      {photo ? (
        <Pressable onPress={pickImage} style={styles.replaceRow}>
          <Upload size={15} color={Colors.teal700} />
          <Text style={styles.replaceText}>Replace photo</Text>
        </Pressable>
      ) : null}

      {/* Guidance overlay */}
      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>For the best read</Text>
        {GUIDANCE.map((g, i) => (
          <View key={i} style={styles.guideRow}>
            <g.icon size={17} color={Colors.teal700} />
            <Text style={styles.guideText}>{g.text}</Text>
          </View>
        ))}
      </View>

      {/* Manual notes */}
      <Text style={styles.notesLabel}>Add notes (optional)</Text>
      <Text style={styles.notesHint}>Smell, color, behavior, pain, appetite, duration…</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Softer than usual, slight smell, eating normally"
        placeholderTextColor={Colors.inkFaint}
        multiline
        style={styles.input}
      />

      <PrimaryButton
        label="Analyze photo"
        variant="coral"
        onPress={analyze}
        style={{ marginTop: Space.lg }}
      />
      <Text style={styles.footNote}>
        You&apos;ll be able to correct anything we get wrong on the next screen.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, marginTop: 2, marginBottom: Space.lg },
  photoArea: {
    height: 240,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.hairline,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  photoTitle: { ...Fonts.h3 },
  photoHint: { ...Fonts.small },
  replaceRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 12 },
  replaceText: { ...Fonts.small, color: Colors.teal700 },
  guideCard: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.teal100,
  },
  guideTitle: { ...Fonts.h3, color: Colors.teal900, marginBottom: 2 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  guideText: { ...Fonts.body, color: Colors.teal900, flex: 1 },
  notesLabel: { ...Fonts.h3, marginTop: Space.lg },
  notesHint: { ...Fonts.small, marginTop: 2, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.md,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: 15,
    color: Colors.ink,
    ...cardShadow,
  },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: 10 },
});
