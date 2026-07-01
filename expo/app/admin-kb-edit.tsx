import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { isCurrentUserAdmin } from "@/lib/backend";
import { refusalFor, reviewOutput } from "@/lib/ai/safety";
import type { KbArea, KbSpecies, KbUrgency } from "@/lib/symptomKb/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { symptomKbService } from "@/services/symptomKbService";

const AREAS: KbArea[] = ["poop", "skin", "ear", "eye", "teeth"];
const SPECIES: KbSpecies[] = ["both", "dog", "cat"];
const URGENCIES: KbUrgency[] = ["info", "watch", "vet_soon", "emergency"];
const csv = (s: string): string[] => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/**
 * Add / edit a symptom KB entry (admin-only via RLS). New entries are always
 * pending vet review. A conservative-language guard blocks diagnosis, treatment,
 * or purity phrasing — the KB describes and defers, it never diagnoses.
 */
export default function AdminKbEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [ready, setReady] = useState<boolean>(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [note, setNote] = useState<string | null>(null);

  const [area, setArea] = useState<KbArea>("poop");
  const [species, setSpecies] = useState<KbSpecies>("both");
  const [urgency, setUrgency] = useState<KbUrgency>("watch");
  const [title, setTitle] = useState<string>("");
  const [feature, setFeature] = useState<string>("");
  const [tokens, setTokens] = useState<string>("");
  const [mayIndicate, setMayIndicate] = useState<string>("");
  const [watch, setWatch] = useState<string>("");
  const [concern, setConcern] = useState<string>("");
  const [sourceName, setSourceName] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupabaseConfigured) return active && setDenied("Connect a Supabase backend to edit the knowledge base.");
      if (!(await isCurrentUserAdmin())) return active && setDenied("This area is for admins only.");
      if (id) {
        const row = await symptomKbService.getById(id);
        if (active && row) {
          setArea(row.area);
          setSpecies(row.species);
          setUrgency(row.urgency);
          setTitle(row.title);
          setFeature(row.feature);
          setTokens(row.matchTokens.join(", "));
          setMayIndicate(row.mayIndicate);
          setWatch(row.watchFor.join(", "));
          setConcern(row.relatedConcern);
          setSourceName(row.source.name);
          setSourceUrl(row.source.url ?? "");
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const onSave = useCallback(async () => {
    setNote(null);
    if (!title.trim() || !mayIndicate.trim()) {
      setNote("Title and the “may indicate” text are required.");
      return;
    }
    // Conservative-language guard: KB entries describe + defer, never diagnose/treat.
    const review = reviewOutput(`${title} ${mayIndicate}`);
    if (!review.ok) {
      setNote(`${refusalFor(review.flags)} Please reword as an observation to discuss with a vet.`);
      return;
    }
    setSaving(true);
    const res = await symptomKbService.upsertEntry({
      id: id || undefined,
      area,
      species,
      urgency,
      title: title.trim(),
      feature: feature.trim(),
      matchTokens: csv(tokens),
      mayIndicate: mayIndicate.trim(),
      watchFor: csv(watch),
      relatedConcern: concern.trim() || "other",
      sourceName: sourceName.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) router.back();
    else setNote(res.error ?? "Couldn't save — you may not have admin rights.");
  }, [id, area, species, urgency, title, feature, tokens, mayIndicate, watch, concern, sourceName, sourceUrl, router]);

  if (denied) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: id ? "Edit entry" : "Add entry" }} />
        <Text style={styles.msg}>{denied}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: id ? "Edit entry" : "Add entry" }} />
        <ActivityIndicator color={Colors.teal700} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: id ? "Edit entry" : "Add entry" }} />

      <Text style={styles.label}>Area</Text>
      <Chips options={AREAS} value={area} onChange={setArea} />
      <Text style={styles.label}>Species</Text>
      <Chips options={SPECIES} value={species} onChange={setSpecies} />
      <Text style={styles.label}>Urgency</Text>
      <Chips options={URGENCIES} value={urgency} onChange={setUrgency} />

      <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Black or tarry stool" />
      <Field
        label="May indicate (describe + defer — no diagnosis)"
        value={mayIndicate}
        onChange={setMayIndicate}
        placeholder="e.g. …can be associated with… and is worth a vet check."
        multiline
      />
      <Field label="Match tokens (comma-separated)" value={tokens} onChange={setTokens} placeholder="black, tarry, melena" />
      <Field label="Watch for (comma-separated)" value={watch} onChange={setWatch} placeholder="lethargy, pale gums" />
      <Field label="Feature key" value={feature} onChange={setFeature} placeholder="stool_color" />
      <Field label="Related triage concern" value={concern} onChange={setConcern} placeholder="diarrhea / skin / ear / eye / other" />
      <Field label="Source name" value={sourceName} onChange={setSourceName} placeholder="Merck Veterinary Manual" />
      <Field label="Source URL" value={sourceUrl} onChange={setSourceUrl} placeholder="https://…" />

      {note ? <Text style={styles.note}>{note}</Text> : null}

      <PrimaryButton
        label={saving ? "Saving…" : id ? "Save changes" : "Add entry (pending review)"}
        variant="coral"
        onPress={onSave}
        style={[{ marginTop: Space.lg }, saving && { opacity: 0.7 }]}
      />
      <Text style={styles.foot}>
        {id
          ? "Edits keep the current review status — re-toggle in the review list if needed."
          : "New entries are saved as pending vet review."}
      </Text>
    </ScrollView>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[styles.chip, value === o && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o }}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: Space.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.inkFaint}
        multiline={multiline}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, backgroundColor: Colors.cream, alignItems: "center", justifyContent: "center", padding: Space.lg },
  msg: { ...Fonts.body, color: Colors.inkSoft, textAlign: "center" },
  label: { ...Fonts.h3, fontSize: 14, marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.teal700 },
  chipText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Space.md, fontSize: 15, color: Colors.ink, ...cardShadow },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  note: { ...Fonts.small, color: Colors.coral600, marginTop: Space.md, lineHeight: 18 },
  foot: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: 10, lineHeight: 18 },
});
