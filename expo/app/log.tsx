import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Activity,
  Bone,
  Check,
  Droplet,
  HeartPulse,
  Pill,
  Scale,
  Sparkles,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { RECORDS } from "@/constants/mockData";
import { shouldShowDemoData } from "@/lib/dataMode";
import { usePets } from "@/providers/PetProvider";
import type { LogCategory, TimelineEntry } from "@/types/pet";

type LogKind = Extract<
  LogCategory,
  "food" | "stool" | "skin" | "weight" | "activity" | "meds" | "symptom"
>;

const KINDS: {
  id: LogKind;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}[] = [
  { id: "food", label: "Food", icon: Bone, color: Colors.teal600 },
  { id: "stool", label: "Stool", icon: Droplet, color: Colors.green600 },
  { id: "skin", label: "Itching", icon: Sparkles, color: Colors.amber600 },
  { id: "weight", label: "Weight", icon: Scale, color: Colors.teal800 },
  { id: "activity", label: "Activity", icon: Activity, color: Colors.coral500 },
  { id: "meds", label: "Meds", icon: Pill, color: Colors.teal700 },
  { id: "symptom", label: "Symptom", icon: HeartPulse, color: Colors.red500 },
];

const MEALS = ["Breakfast", "Dinner", "Treat", "Snack"];
const ACTIVITIES = ["Walk", "Play", "Run", "Fetch"];

function nowLabel(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "a" : "p";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, "0")}${ap}`;
}

export default function LogScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { selectedPet, addLog, todayIso } = usePets();

  const initial = useMemo<LogKind>(() => {
    const match = KINDS.find((k) => k.id === type);
    return match ? match.id : "food";
  }, [type]);

  const [kind, setKind] = useState<LogKind>(initial);

  // Per-kind inputs
  const [meal, setMeal] = useState<string>("Breakfast");
  const [food, setFood] = useState<string>("");
  const [portion, setPortion] = useState<string>("");
  const [stool, setStool] = useState<number>(4);
  const [itch, setItch] = useState<number>(4);
  const [weight, setWeight] = useState<string>(String(selectedPet.weightLb));
  const [minutes, setMinutes] = useState<string>("");
  const [actType, setActType] = useState<string>("Walk");
  const [med, setMed] = useState<string>("");
  const [symptom, setSymptom] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Medication-name autocomplete hints. Demo records are only consulted in
  // dev/demo mode so production never surfaces sample medications.
  const medSuggestions = useMemo(
    () =>
      shouldShowDemoData
        ? (RECORDS[selectedPet.demoKey ?? selectedPet.id]?.Medications ?? []).map((m) => m.title)
        : [],
    [selectedPet.id, selectedPet.demoKey]
  );

  const active = KINDS.find((k) => k.id === kind)!;

  const valid = useMemo(() => {
    switch (kind) {
      case "food":
        return food.trim().length > 0;
      case "weight":
        return weight.trim().length > 0 && !Number.isNaN(Number(weight));
      case "activity":
        return minutes.trim().length > 0 && !Number.isNaN(Number(minutes));
      case "meds":
        return med.trim().length > 0;
      case "symptom":
        return symptom.trim().length > 0;
      default:
        return true; // stool / skin always have a value
    }
  }, [kind, food, weight, minutes, med, symptom]);

  const buildEntry = useCallback((): TimelineEntry => {
    const base = {
      id: `log-${Date.now()}`,
      petId: selectedPet.id,
      date: todayIso,
      time: nowLabel(),
    };
    const note = notes.trim();
    switch (kind) {
      case "food":
        return {
          ...base,
          category: "food",
          title: `${meal}: ${food.trim()}`,
          detail: [portion.trim(), note].filter(Boolean).join(" · ") || undefined,
        };
      case "stool":
        return {
          ...base,
          category: "stool",
          title: `Stool logged · ${stool}/5`,
          detail: note || (stool <= 2 ? "Loose" : stool >= 4 ? "Well formed" : "Soft"),
          value: stool * 2,
          urgency: stool <= 2 ? "amber" : undefined,
        };
      case "skin":
        return {
          ...base,
          category: "skin",
          title: `Itching ${itch}/10`,
          detail: note || undefined,
          value: itch,
        };
      case "weight":
        return {
          ...base,
          category: "weight",
          title: `Weight: ${Number(weight)} lb`,
          detail: note || undefined,
          value: Number(weight),
        };
      case "activity":
        return {
          ...base,
          category: "activity",
          title: `${actType}: ${Number(minutes)} minutes`,
          detail: note || undefined,
          value: Math.min(10, Math.round(Number(minutes) / 6)),
        };
      case "meds":
        return {
          ...base,
          category: "meds",
          title: `${med.trim()} given`,
          detail: note || undefined,
        };
      case "symptom":
        return {
          ...base,
          category: "symptom",
          title: symptom.trim(),
          detail: note || undefined,
        };
    }
  }, [
    kind,
    selectedPet.id,
    todayIso,
    notes,
    meal,
    food,
    portion,
    stool,
    itch,
    weight,
    actType,
    minutes,
    med,
    symptom,
  ]);

  const save = useCallback(() => {
    if (!valid) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addLog(selectedPet.id, buildEntry());
    router.replace("/(tabs)/timeline");
  }, [valid, addLog, selectedPet.id, buildEntry, router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Add a log" }} />

      <Text style={styles.title}>What would you like to log?</Text>
      <Text style={styles.subtitle}>For {selectedPet.name} · saves straight to the timeline</Text>

      {/* Category selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        style={{ marginHorizontal: -Space.md, paddingHorizontal: Space.md, marginTop: Space.md }}
      >
        {KINDS.map((k) => {
          const on = k.id === kind;
          return (
            <Pressable
              key={k.id}
              testID={`log-kind-${k.id}`}
              onPress={() => setKind(k.id)}
              style={[styles.kindChip, on && { backgroundColor: k.color, borderColor: k.color }]}
            >
              <k.icon size={16} color={on ? "#fff" : k.color} />
              <Text style={[styles.kindText, on && { color: "#fff" }]}>{k.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Contextual input card */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.cardIcon, { backgroundColor: active.color + "1A" }]}>
            <active.icon size={20} color={active.color} />
          </View>
          <Text style={styles.cardTitle}>Log {active.label.toLowerCase()}</Text>
        </View>

        {kind === "food" ? (
          <>
            <Label>Meal</Label>
            <ChipRow options={MEALS} value={meal} onChange={setMeal} />
            <Label>What did they eat?</Label>
            <TextInput
              testID="log-food-input"
              value={food}
              onChangeText={setFood}
              placeholder="e.g. Lamb & rice kibble"
              placeholderTextColor={Colors.inkFaint}
              style={styles.input}
            />
            <Label>Portion (optional)</Label>
            <TextInput
              value={portion}
              onChangeText={setPortion}
              placeholder="e.g. 1.5 cups"
              placeholderTextColor={Colors.inkFaint}
              style={styles.input}
            />
          </>
        ) : null}

        {kind === "stool" ? (
          <>
            <Label>Stool score</Label>
            <Scale5 value={stool} onChange={setStool} color={active.color} />
            <View style={styles.scaleEnds}>
              <Text style={styles.scaleEnd}>1 · Loose</Text>
              <Text style={styles.scaleEnd}>5 · Firm</Text>
            </View>
          </>
        ) : null}

        {kind === "skin" ? (
          <>
            <Label>Itching level (0–10)</Label>
            <Scale11 value={itch} onChange={setItch} color={active.color} />
            <View style={styles.scaleEnds}>
              <Text style={styles.scaleEnd}>0 · None</Text>
              <Text style={styles.scaleEnd}>10 · Severe</Text>
            </View>
          </>
        ) : null}

        {kind === "weight" ? (
          <>
            <Label>Weight</Label>
            <View style={styles.suffixRow}>
              <TextInput
                testID="log-weight-input"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="71.2"
                placeholderTextColor={Colors.inkFaint}
                style={[styles.input, { flex: 1 }]}
              />
              <Text style={styles.suffix}>lb</Text>
            </View>
          </>
        ) : null}

        {kind === "activity" ? (
          <>
            <Label>Type</Label>
            <ChipRow options={ACTIVITIES} value={actType} onChange={setActType} />
            <Label>Duration</Label>
            <View style={styles.suffixRow}>
              <TextInput
                testID="log-activity-input"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={Colors.inkFaint}
                style={[styles.input, { flex: 1 }]}
              />
              <Text style={styles.suffix}>min</Text>
            </View>
          </>
        ) : null}

        {kind === "meds" ? (
          <>
            <Label>Medication or supplement</Label>
            {medSuggestions.length > 0 ? (
              <ChipRow options={medSuggestions} value={med} onChange={setMed} wrap />
            ) : null}
            <TextInput
              testID="log-meds-input"
              value={med}
              onChangeText={setMed}
              placeholder="e.g. Apoquel 16mg"
              placeholderTextColor={Colors.inkFaint}
              style={styles.input}
            />
          </>
        ) : null}

        {kind === "symptom" ? (
          <>
            <Label>What are you noticing?</Label>
            <TextInput
              testID="log-symptom-input"
              value={symptom}
              onChangeText={setSymptom}
              placeholder="e.g. Sneezing a few times this morning"
              placeholderTextColor={Colors.inkFaint}
              multiline
              style={[styles.input, styles.multiline]}
            />
            <Text style={styles.symptomHint}>
              Worried about this? The Ask tab can walk you through it safely.
            </Text>
          </>
        ) : null}
      </View>

      {/* Shared notes */}
      <Label style={{ marginTop: Space.lg }}>Notes (optional)</Label>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything else worth remembering…"
        placeholderTextColor={Colors.inkFaint}
        multiline
        style={[styles.input, styles.multiline]}
      />

      <PrimaryButton
        label="Save to timeline"
        icon={<Check size={18} color="#fff" />}
        variant="coral"
        onPress={save}
        style={[{ marginTop: Space.lg }, !valid && styles.disabled]}
      />
      <Text style={styles.footNote}>Logs are yours — saved straight to {selectedPet.name}&apos;s timeline.</Text>
    </ScrollView>
  );
}

function Label({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

function ChipRow({
  options,
  value,
  onChange,
  wrap,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  wrap?: boolean;
}) {
  return (
    <View style={[styles.chipRow, wrap && { flexWrap: "wrap" }]}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Scale5({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <View style={styles.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n === value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.scaleCell, on && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[styles.scaleCellText, on && { color: "#fff" }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Scale11({
  value,
  onChange,
  color,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <View style={styles.scale11}>
      {Array.from({ length: 11 }, (_, n) => {
        const on = n === value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.scale11Cell, on && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[styles.scale11Text, on && { color: "#fff" }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, marginTop: 2 },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
  },
  kindText: { ...Fonts.small, color: Colors.ink },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Space.md,
    marginTop: Space.md,
    ...cardShadow,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: Space.sm },
  cardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cardTitle: { ...Fonts.h2, fontSize: 18 },
  label: { ...Fonts.small, color: Colors.ink, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  suffixRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  suffix: { ...Fonts.h3, color: Colors.inkSoft },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  chipOn: { backgroundColor: Colors.teal800, borderColor: Colors.teal800 },
  chipText: { ...Fonts.small, color: Colors.inkSoft },
  chipTextOn: { color: "#fff" },
  scaleRow: { flexDirection: "row", gap: 8 },
  scaleCell: {
    flex: 1,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  scaleCellText: { ...Fonts.h2, color: Colors.inkSoft },
  scale11: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scale11Cell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  scale11Text: { ...Fonts.h3, fontSize: 14, color: Colors.inkSoft },
  scaleEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  scaleEnd: { ...Fonts.tiny, color: Colors.inkFaint },
  symptomHint: { ...Fonts.small, color: Colors.teal700, marginTop: 8, lineHeight: 18 },
  disabled: { opacity: 0.5 },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: 10 },
});
