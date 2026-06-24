import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Barcode, ChevronRight, ScanText, Search } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { foodService, type BarcodeLookupResult, type FoodProductSummary } from "@/services";
import { usePets } from "@/providers/PetProvider";

type Mode = "barcode" | "search" | "label";

const SAMPLE_BARCODES = [
  { code: "0850000000110", label: "Gentle Bowl · LID Salmon" },
  { code: "0850000000028", label: "Harvest Hound · Chicken & Pea" },
  { code: "0850000000141", label: "Budget Bites · Beefy Bites" },
];

interface Suggestion {
  id: string;
  name: string;
  brand: string | null;
}

export default function FoodScanScreen() {
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const { selectedPet } = usePets();

  const [mode, setMode] = useState<Mode>((initialMode as Mode) || "barcode");
  const [barcode, setBarcode] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [labelText, setLabelText] = useState<string>("");
  const [nameHint, setNameHint] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const openResult = useCallback(
    (productId: string, raw?: string | null, source?: string) => {
      router.push({
        pathname: "/food-result",
        params: { productId, raw: raw ?? "", source: source ?? "manual" },
      });
    },
    [router]
  );

  const handleLookup = useCallback(
    async (result: BarcodeLookupResult, raw?: string) => {
      if (result.productId) {
        openResult(result.productId, raw ?? result.rawLabelText, result.source);
        return;
      }
      if (result.suggestions.length) {
        setSuggestions(result.suggestions);
        setStatus(
          result.source === "openpetfoodfacts"
            ? `Found "${result.matchedName ?? "a product"}" but no exact catalog match — pick the closest below.`
            : "No exact match — pick the closest below or try search."
        );
      } else {
        setStatus("No match found. Try the Search tab to find it by name.");
      }
    },
    [openResult]
  );

  const onBarcode = useCallback(async () => {
    if (!barcode.trim()) return;
    setBusy(true);
    setStatus(null);
    setSuggestions([]);
    try {
      const res = await foodService.lookupByBarcode(barcode.trim());
      await handleLookup(res);
    } catch {
      setStatus("Lookup failed — check your connection or try Search.");
    } finally {
      setBusy(false);
    }
  }, [barcode, handleLookup]);

  const onSearch = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const rows: FoodProductSummary[] = await foodService.searchProducts(query.trim() || undefined);
      setSuggestions(rows.map((r) => ({ id: r.id, name: r.name, brand: r.brand })));
      if (rows.length === 0) setStatus("No products found. Try a different name.");
    } catch {
      setStatus("Search failed — please try again.");
    } finally {
      setBusy(false);
    }
  }, [query]);

  const onLabel = useCallback(async () => {
    if (!labelText.trim()) {
      setStatus("Paste or type the ingredient list so we can identify the product.");
      return;
    }
    setBusy(true);
    setStatus(null);
    setSuggestions([]);
    try {
      const res = await foodService.matchLabel(labelText.trim(), nameHint.trim() || undefined);
      await handleLookup(res, labelText.trim());
    } catch {
      setStatus("Couldn't read that label — try the Search tab.");
    } finally {
      setBusy(false);
    }
  }, [labelText, nameHint, handleLookup]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Food Intelligence" }} />

      <Text style={styles.title}>Food Intelligence</Text>
      <Text style={styles.subtitle}>
        Scan or search a food, treat, or supplement for a review tailored to {selectedPet.name}.
      </Text>

      {/* Mode switch */}
      <View style={styles.modeRow}>
        <ModeButton icon={Barcode} label="Barcode" active={mode === "barcode"} onPress={() => { setMode("barcode"); setStatus(null); setSuggestions([]); }} />
        <ModeButton icon={Search} label="Search" active={mode === "search"} onPress={() => { setMode("search"); setStatus(null); setSuggestions([]); }} />
        <ModeButton icon={ScanText} label="Label" active={mode === "label"} onPress={() => { setMode("label"); setStatus(null); setSuggestions([]); }} />
      </View>

      {mode === "barcode" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Enter or scan a barcode</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="e.g. 0850000000110"
            placeholderTextColor={Colors.inkFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
          <PrimaryButton label="Look up product" variant="primary" onPress={onBarcode} />
          <Text style={styles.hint}>Looks up Open Pet Food Facts, then matches our catalog.</Text>
          <View style={styles.sampleWrap}>
            {SAMPLE_BARCODES.map((s) => (
              <Pressable key={s.code} style={styles.sample} onPress={() => setBarcode(s.code)}>
                <Text style={styles.sampleText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {mode === "search" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Search by product name</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            placeholder="e.g. salmon, renal, puppy"
            placeholderTextColor={Colors.inkFaint}
            returnKeyType="search"
            style={styles.input}
          />
          <PrimaryButton label="Search catalog" variant="primary" onPress={onSearch} />
        </Card>
      ) : null}

      {mode === "label" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Paste the ingredient panel</Text>
          <Text style={styles.hint}>
            Snap the label, then paste or type the ingredients and guaranteed analysis. OCR reads the
            label only — it identifies the product, never its purity.
          </Text>
          <TextInput
            value={nameHint}
            onChangeText={setNameHint}
            placeholder="Product name (optional)"
            placeholderTextColor={Colors.inkFaint}
            style={styles.input}
          />
          <TextInput
            value={labelText}
            onChangeText={setLabelText}
            placeholder={"Ingredients: Deboned Chicken, Peas, ...\nGuaranteed Analysis\nCrude Protein (min) 26%"}
            placeholderTextColor={Colors.inkFaint}
            multiline
            style={[styles.input, styles.multiline]}
          />
          <PrimaryButton label="Analyze label" variant="primary" onPress={onLabel} />
        </Card>
      ) : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={Colors.teal700} />
          <Text style={styles.hint}>Looking that up…</Text>
        </View>
      ) : null}

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {suggestions.length ? (
        <View style={{ marginTop: Space.md }}>
          <Text style={styles.cardLabel}>{mode === "search" ? "Results" : "Closest matches"}</Text>
          <Card style={{ gap: 0, marginTop: 8 }}>
            {suggestions.map((s, i) => (
              <Pressable key={s.id} onPress={() => openResult(s.id, mode === "label" ? labelText : null, mode)}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.suggestionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={Fonts.h3}>{s.name}</Text>
                    {s.brand ? <Text style={Fonts.small}>{s.brand}</Text> : null}
                  </View>
                  <ChevronRight size={18} color={Colors.inkFaint} />
                </View>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      <Text style={styles.footNote}>
        Reviews are personalized to {selectedPet.name}&apos;s allergies and conditions. Guidance only,
        not a diagnosis — and you can correct any match on the next screen.
      </Text>
    </ScrollView>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`${label} lookup`}
      accessibilityState={{ selected: active }}
      style={[styles.modeBtn, active && styles.modeBtnActive]}
    >
      <Icon size={18} color={active ? "#fff" : Colors.teal700} />
      <Text style={[styles.modeBtnText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, marginTop: 2, marginBottom: Space.lg, lineHeight: 21 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: Space.md },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    ...cardShadow,
  },
  modeBtnActive: { backgroundColor: Colors.teal700 },
  modeBtnText: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  cardLabel: { ...Fonts.h3, fontSize: 15 },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  hint: { ...Fonts.small, color: Colors.inkFaint, lineHeight: 18 },
  sampleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sample: { backgroundColor: Colors.teal50, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  sampleText: { ...Fonts.tiny, color: Colors.teal700, fontWeight: "700" },
  busy: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Space.md },
  status: { ...Fonts.small, color: Colors.inkSoft, marginTop: Space.md, lineHeight: 19 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  suggestionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 10 },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.xl, lineHeight: 18 },
});
