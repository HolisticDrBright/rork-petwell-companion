import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Barcode, Camera, ChevronRight, ImagePlus, ScanText, Search } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AiDisabledNote, AiSparkleButton } from "@/components/ai/AiBits";
import { NoPetSelected } from "@/components/NoPetSelected";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { extractLabelText, runLabelPipeline } from "@/lib/food/labelPipeline";
import { foodService, type BarcodeLookupResult, type FoodProductSummary } from "@/services";
import { aiService } from "@/services/aiService";
import { usePets } from "@/providers/PetProvider";

type Mode = "barcode" | "photo" | "paste" | "search";

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState<boolean>(false);
  const [ocrUnavailable, setOcrUnavailable] = useState<boolean>(false);
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const reset = useCallback((m: Mode) => {
    setMode(m);
    setStatus(null);
    setSuggestions([]);
  }, []);

  const openResult = useCallback(
    (productId: string, raw?: string | null, source?: string) => {
      router.push({
        pathname: "/food-result",
        params: {
          productId,
          raw: raw ?? "",
          source: source ?? "manual",
          image: photoUri ?? "",
        },
      });
    },
    [router, photoUri],
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
            : "No exact match — pick the closest below or try search.",
        );
      } else {
        setStatus("No match found. Try the Search tab to find it by name.");
      }
    },
    [openResult],
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

  /** Capture a label photo (camera or library) and attempt OCR. */
  const capture = useCallback(async (from: "camera" | "library") => {
    setStatus(null);
    setSuggestions([]);
    try {
      const perm =
        from === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setStatus("Petwell needs camera/photo access to scan a food label. You can also paste the label text.");
        return;
      }
      const res =
        from === "camera"
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
      if (res.canceled || !res.assets?.[0]) return;
      const uri = res.assets[0].uri;
      setPhotoUri(uri);
      setOcrBusy(true);
      const { text, available } = await extractLabelText(uri);
      setOcrBusy(false);
      setAiNote(null);
      if (available && text.trim()) {
        setLabelText(text);
        setOcrUnavailable(false);
        setOcrNote("We read this text from your photo — review and fix any errors, then Analyze.");
      } else {
        setOcrUnavailable(true);
        setOcrNote(
          "On-device OCR isn't enabled in this build. Use AI to read the label, or type the ingredients and guaranteed analysis below, then Analyze. (A photo reads the label only — it can't detect contaminants.)",
        );
      }
    } catch {
      setOcrBusy(false);
      setStatus("Couldn't open the camera. Try “Choose from library”, or paste the label text.");
    }
  }, []);

  // AI OCR fallback: upload the captured photo and have the vision model
  // transcribe the label into editable text. Never auto-saved or verified — the
  // user reviews the text and runs the normal deterministic Analyze step.
  const useAiLabel = useCallback(async () => {
    if (!photoUri) return;
    setAiBusy(true);
    setAiNote(null);
    const avail = await aiService.availability({ needsDocs: true });
    if (!avail.ok) {
      setAiBusy(false);
      return setAiNote(avail.reason ?? "AI features are off.");
    }
    const path = await aiService.uploadScanImage(photoUri);
    if (!path) {
      setAiBusy(false);
      return setAiNote("Couldn't upload the photo. Make sure you're signed in.");
    }
    const res = await aiService.visionLabel({ imagePath: path, productHint: nameHint.trim() || undefined });
    setAiBusy(false);
    if (res.disabled) return setAiNote(res.disabledReason ?? "AI features are off.");
    if (!res.ok || !res.data) return setAiNote(res.error ?? "Couldn't read the label. Type it in below instead.");
    const d = res.data;
    const ga = d.guaranteedAnalysis.map((g) => `${g.name}: ${g.value}`).join(", ");
    const composed = [d.ingredientsText, ga].filter((s) => s && s.trim()).join("\n");
    if (composed.trim()) setLabelText(composed);
    const hint = [d.brand, d.productName].filter(Boolean).join(" ");
    if (hint) setNameHint(hint);
    setAiNote("AI transcribed the label below — review and fix any errors, then Analyze. A photo can't detect contaminants.");
  }, [photoUri, nameHint]);

  /** Shared by Photo + Paste: normalize → parse → match against the catalog. */
  const onAnalyze = useCallback(async () => {
    if (!labelText.trim()) {
      setStatus("Add the ingredient text so we can identify the product.");
      return;
    }
    setBusy(true);
    setStatus(null);
    setSuggestions([]);
    try {
      const result = await runLabelPipeline(labelText.trim(), nameHint.trim() || undefined);
      if (result.match.productId) {
        openResult(result.match.productId, labelText.trim(), mode);
        return;
      }
      if (result.match.suggestions.length) {
        setSuggestions(result.match.suggestions);
        setStatus(`Closest matches (match confidence: ${result.confidence}). ${result.warnings.join(" ")}`.trim());
      } else {
        setStatus(`No catalog match. ${result.warnings.join(" ")} Try the Search tab.`.trim());
      }
    } catch {
      setStatus("Couldn't read that label — try the Search tab.");
    } finally {
      setBusy(false);
    }
  }, [labelText, nameHint, mode, openResult]);

  if (!selectedPet) return <NoPetSelected />;

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
        Scan, photograph, or search a food, treat, or supplement for a review tailored to {selectedPet.name}.
      </Text>

      {/* Mode switch — four modes */}
      <View style={styles.modeRow}>
        <ModeButton icon={Barcode} label="Barcode" active={mode === "barcode"} onPress={() => reset("barcode")} />
        <ModeButton icon={Camera} label="Photo" active={mode === "photo"} onPress={() => reset("photo")} />
        <ModeButton icon={ScanText} label="Paste" active={mode === "paste"} onPress={() => reset("paste")} />
        <ModeButton icon={Search} label="Search" active={mode === "search"} onPress={() => reset("search")} />
      </View>

      {mode === "barcode" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Enter a barcode</Text>
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="e.g. 0850000000110"
            placeholderTextColor={Colors.inkFaint}
            keyboardType="number-pad"
            style={styles.input}
          />
          <PrimaryButton label="Look up product" variant="primary" onPress={onBarcode} />
          <Text style={styles.hint}>
            Looks up Open Pet Food Facts, then matches our catalog. Live camera barcode scanning needs a dev build
            with expo-camera (see README).
          </Text>
          <View style={styles.sampleWrap}>
            {SAMPLE_BARCODES.map((s) => (
              <Pressable key={s.code} style={styles.sample} onPress={() => setBarcode(s.code)}>
                <Text style={styles.sampleText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {mode === "photo" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Take a photo of the label</Text>
          <Text style={styles.hint}>
            Photograph the ingredient list / guaranteed analysis panel. OCR reads the label to identify the product —
            it never detects purity or contaminants.
          </Text>

          {Platform.OS === "web" ? (
            <Text style={styles.webNote}>
              Camera capture isn&apos;t available on web — use “Choose image”, Paste, or Search.
            </Text>
          ) : null}

          <View style={styles.captureRow}>
            <Pressable style={styles.captureBtn} onPress={() => capture("camera")} accessibilityRole="button" accessibilityLabel="Take a photo of the label">
              <Camera size={18} color={Colors.teal700} />
              <Text style={styles.captureText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.captureBtn} onPress={() => capture("library")} accessibilityRole="button" accessibilityLabel="Choose a label photo from your library">
              <ImagePlus size={18} color={Colors.teal700} />
              <Text style={styles.captureText}>Choose image</Text>
            </Pressable>
          </View>

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" /> : null}
          {ocrBusy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={Colors.teal700} />
              <Text style={styles.hint}>Reading the label…</Text>
            </View>
          ) : null}
          {ocrNote ? <Text style={styles.ocrNote}>{ocrNote}</Text> : null}
          {photoUri && ocrUnavailable ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <AiSparkleButton label="Use AI to read this label" onPress={useAiLabel} loading={aiBusy} />
              {aiNote ? <AiDisabledNote reason={aiNote} /> : null}
            </View>
          ) : null}

          {photoUri || labelText ? (
            <>
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
              <PrimaryButton label="Analyze label" variant="primary" onPress={onAnalyze} />
            </>
          ) : null}
        </Card>
      ) : null}

      {mode === "paste" ? (
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardLabel}>Paste the ingredient panel</Text>
          <Text style={styles.hint}>
            Type or paste the ingredients and guaranteed analysis. Reading the label identifies the product — it never
            establishes purity.
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
          <PrimaryButton label="Analyze label" variant="primary" onPress={onAnalyze} />
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
              <Pressable key={s.id} onPress={() => openResult(s.id, mode === "photo" || mode === "paste" ? labelText : null, mode)}>
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
        Reviews are personalized to {selectedPet.name}&apos;s allergies and conditions. Guidance only, not a diagnosis —
        and you can correct any match on the next screen.
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
      <Icon size={17} color={active ? "#fff" : Colors.teal700} />
      <Text style={[styles.modeBtnText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  title: { ...Fonts.title },
  subtitle: { ...Fonts.bodySoft, marginTop: 2, marginBottom: Space.lg, lineHeight: 21 },
  modeRow: { flexDirection: "row", gap: 6, marginBottom: Space.md },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    ...cardShadow,
  },
  modeBtnActive: { backgroundColor: Colors.teal700 },
  modeBtnText: { ...Fonts.small, fontSize: 12, color: Colors.teal700, fontWeight: "800" },
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
  webNote: { ...Fonts.small, color: Colors.amber600, lineHeight: 18 },
  captureRow: { flexDirection: "row", gap: 10 },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.teal100,
    backgroundColor: Colors.teal50,
  },
  captureText: { ...Fonts.h3, fontSize: 14, color: Colors.teal700 },
  preview: { width: "100%", height: 180, borderRadius: Radius.md, backgroundColor: Colors.cream2 },
  ocrNote: { ...Fonts.small, color: Colors.teal800, lineHeight: 18 },
  sampleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sample: { backgroundColor: Colors.teal50, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  sampleText: { ...Fonts.tiny, color: Colors.teal700, fontWeight: "700" },
  busy: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: Space.md },
  status: { ...Fonts.small, color: Colors.inkSoft, marginTop: Space.md, lineHeight: 19 },
  divider: { height: 1, backgroundColor: Colors.hairline },
  suggestionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 10 },
  footNote: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.xl, lineHeight: 18 },
});
