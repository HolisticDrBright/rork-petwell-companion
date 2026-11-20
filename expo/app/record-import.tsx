import { NoPetSelected } from "@/components/NoPetSelected";
import { SaveStatus } from "@/components/SaveStatus";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { useSaveAction } from "@/hooks/useSaveAction";
import { getUserId } from "@/lib/backend";
import { usePets } from "@/providers/PetProvider";
import { recordIngestionKey, recordIngestionService, type RecordField } from "@/services/recordIngestionService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

function DocumentPhoto({ path }: { path: string }) {
  const { data, isError } = useQuery({
    queryKey: ["record-image", path],
    queryFn: () => recordIngestionService.photo(path),
    staleTime: 240_000,
    refetchInterval: 270_000,
  });
  if (isError) return <Text style={Fonts.small}>Photo is unavailable.</Text>;
  return data ? <Image source={{ uri: data }} accessibilityLabel="Attached veterinary document" style={styles.photo} contentFit="contain" /> : null;
}

function Review({ id, photo, extraction, onReviewed }: {
  id: string; photo: string; extraction: RecordField[]; onReviewed: (fields?: RecordField[]) => void;
}) {
  const [fields, setFields] = useState(extraction);
  const { saving, saveError, runSave } = useSaveAction();
  function review(accept: boolean) {
    const values = fields.map(f => ({ ...f, value: f.value.trim() })).filter(f => f.value);
    void runSave(async () => {
      await recordIngestionService.review(id, values, accept);
      onReviewed(accept ? values : undefined);
    });
  }
  return (
    <Card style={styles.card}>
      <Text style={Fonts.h3}>Review the extracted fields</Text>
      <Text style={Fonts.small}>Compare each field with the photo. Edit mistakes and clear fields you want to omit. Percentages are the model’s transcription estimates.</Text>
      <DocumentPhoto path={photo} />
      {fields.map((field, index) => {
        const label = field.key.replace(/_/g, " ");
        return (
          <View key={index}>
            <Text style={Fonts.small}>{label}{field.group ? ` · group ${field.group}` : ""} · {Math.round(field.confidence * 100)}%</Text>
            <TextInput accessibilityLabel={`${label} ${field.group || ""}`.trim()} style={styles.input} value={field.value} maxLength={500} editable={!saving}
              onChangeText={value => setFields(old => old.map((f, i) => i === index ? { ...f, value } : f))} />
          </View>
        );
      })}
      <SaveStatus saving={saving} saveError={saveError} />
      <PrimaryButton label="Confirm and save to records" disabled={saving || !fields.some(f => f.value.trim())} onPress={() => review(true)} />
      <PrimaryButton label="Reject proposal" variant="outline" disabled={saving} onPress={() => review(false)} />
    </Card>
  );
}

export default function RecordImportScreen() {
  const { selectedPet, mode } = usePets();
  const router = useRouter();
  const petId = selectedPet?.id ?? "";
  const queryClient = useQueryClient();
  const proposals = useQuery({ queryKey: recordIngestionKey(petId), queryFn: () => recordIngestionService.list(petId),
    enabled: !!petId && mode === "remote" });
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedFields, setSavedFields] = useState<RecordField[] | null>(null);
  const upload = useRef<{ uri: string; path: string; pet: string; owner: string } | null>(null);
  const pending = useRef(false);

  async function choose(camera: boolean) {
    if (busy) return;
    setError(null);
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setError("Allow camera access or choose a photo from your library.");
        return;
      }
      const options = { mediaTypes: ["images" as const], allowsEditing: false, quality: 1 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.assets?.[0]) setUri(result.assets[0].uri);
    } catch { setError("Couldn’t open the photo picker. Try again."); }
  }

  async function extract() {
    const owner = getUserId();
    if (!uri || !petId || !owner || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const cached = upload.current;
      const path = cached?.uri === uri && cached.owner === owner && cached.pet === petId ? cached.path : await recordIngestionService.upload(uri);
      upload.current = { uri, path, owner, pet: petId };
      await recordIngestionService.extract(petId, path);
      await proposals.refetch();
      setUri(null);
      upload.current = null;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t read this document. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!selectedPet) return <NoPetSelected />;
  const suggestions = savedFields?.filter(field => field.key === "medication_name" ||
    (field.key === "vaccine_name" && savedFields?.some(f => f.key === "vaccine_due" && f.group === field.group))) ?? [];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Import vet document" }} />
      <Text style={Fonts.h2}>Import a record for {selectedPet.name}</Text>
      {mode !== "remote" ? <Text style={Fonts.small}>Sign in to import documents.</Text> : <>
        <Card style={styles.card}>
          <Text style={Fonts.body}>Take a photo of a lab report, vaccine certificate, invoice, or discharge note. Petwell reads the photo and saves a draft for you to review.</Text>
          <Text style={Fonts.small}>When you tap Read document, the photo is sent to the AI provider. The record is added only after you confirm the fields.</Text>
          <PrimaryButton label="Take document photo" disabled={busy} onPress={() => choose(true)} />
          <PrimaryButton label="Choose photo" variant="outline" disabled={busy} onPress={() => choose(false)} />
          {uri ? <>
            <Image source={{ uri }} accessibilityLabel="Selected document photograph" style={styles.photo} contentFit="contain" />
            <PrimaryButton label={busy ? "Reading document…" : "Read document"} disabled={busy} onPress={extract} />
          </> : null}
          {error ? <Text accessibilityRole="alert" style={Fonts.small}>{error}</Text> : null}
        </Card>
        {proposals.isError ? <PrimaryButton label="Reload saved proposals" variant="outline" onPress={() => { void proposals.refetch(); }} /> : null}
        {savedFields ? <Card style={styles.card}>
          <Text style={Fonts.h3}>Document saved</Text>
          {suggestions.length ? <Text style={Fonts.small}>Create a reminder from a reviewed field or skip this step.</Text> : null}
          {suggestions.map((field, index) => (
            <PrimaryButton key={index} variant="outline" label={`Review reminder for ${field.value}`}
              onPress={() => router.push({ pathname: "/care-schedules", params: {
                taskTitle: field.value,
                taskKind: field.key === "medication_name" ? "med" : "custom",
                taskDate: savedFields.find(f => f.key === "vaccine_due" && f.group === field.group)?.value ?? "",
              } })} />
          ))}
          <PrimaryButton variant="outline" label="Done" onPress={() => setSavedFields(null)} />
        </Card> : null}
        {proposals.data?.map(item => item.status === "pending_review" ? (
          <Review key={item.id} id={item.id} photo={item.image_path} extraction={item.extraction as unknown as RecordField[]}
            onReviewed={fields => {
              if (fields) setSavedFields(fields);
              void queryClient.invalidateQueries({ queryKey: recordIngestionKey(petId) });
              void queryClient.invalidateQueries({ queryKey: ["records", petId] });
            }} />
        ) : <Card key={item.id} style={styles.card}>
          <Text style={Fonts.h3}>Saved document</Text>
          <Text style={Fonts.small}>{new Date(item.created_at).toLocaleDateString()}</Text>
          {preview === item.id ? <DocumentPhoto path={item.image_path} /> : null}
          <PrimaryButton label={preview === item.id ? "Hide photo" : "Open attached photo"} variant="outline"
            onPress={() => setPreview(preview === item.id ? null : item.id)} />
        </Card>)}
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Space.md, gap: Space.md, paddingBottom: Space.xl },
  card: { gap: Space.sm },
  photo: { width: "100%", height: 240, borderRadius: Radius.md, backgroundColor: Colors.cream2 },
  input: { ...Fonts.body, padding: Space.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.hairline },
});
