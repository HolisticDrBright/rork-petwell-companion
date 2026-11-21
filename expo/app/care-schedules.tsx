import { FormScrollView } from "@/components/FormScrollView";
import { NoPetSelected } from "@/components/NoPetSelected";
import { SaveStatus } from "@/components/SaveStatus";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { scheduleTemplates } from "@/lib/careScheduleRules";
import { useSaveAction } from "@/hooks/useSaveAction";
import { usePets } from "@/providers/PetProvider";
import { careScheduleService, localDateLabel, RECURRENCES, SCHEDULE_KINDS, scheduleKey, type CareSchedule, type ScheduleDraft } from "@/services/careScheduleService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

function startFields(draft?: CareSchedule) {
  return {
    date: draft?.start_local.slice(0, 10) ?? localDateLabel(new Date()),
    time: draft?.start_local.slice(11, 16) ?? "08:00",
  };
}

type Suggestion = { taskTitle?: string; taskDate?: string; taskKind?: string };

function ScheduleEditor({ id, species, breed, ageYears, row, suggested, close }: {
  id: string; species: "dog" | "cat"; breed: string; ageYears: number; row?: CareSchedule; suggested: Suggestion; close: () => void;
}) {
  const query = useQueryClient();
  const { saving, saveError, runSave } = useSaveAction();
  const [kind, setKind] = useState(row?.kind ?? (suggested.taskKind === "med" ? "med" : "custom"));
  const [title, setTitle] = useState(row?.title ?? suggested.taskTitle?.slice(0, 100) ?? "");
  const [instructions, setInstructions] = useState(row?.instructions ?? "");
  const [rule, setRule] = useState(row?.rrule ?? (suggested.taskDate ? "FREQ=DAILY;COUNT=1" : "FREQ=DAILY"));
  const [date, setDate] = useState(row || !suggested.taskDate || !/^\d{4}-\d{2}-\d{2}$/.test(suggested.taskDate)
    ? startFields(row).date : suggested.taskDate);
  const [time, setTime] = useState(startFields(row).time);
  const [detail, setDetail] = useState(
    typeof row?.dose_portion === "object" && row.dose_portion && "amount" in row.dose_portion && typeof row.dose_portion.amount === "string"
      ? row.dose_portion.amount : "",
  );
  const [active, setActive] = useState(row?.active ?? true);
  const [inputError, setInputError] = useState<string | null>(null);
  const timezone = row?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const templates = scheduleTemplates(species, breed, ageYears);

  function applyTemplate(template: (typeof templates)[number]) {
    setTitle(template.title);
    setKind(template.kind);
    setInstructions(template.instructions);
    setRule(template.rrule ?? "FREQ=DAILY");
  }

  function save() {
    const day = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setInputError("Enter a valid date (YYYY-MM-DD) and time (24-hour HH:MM).");
      return;
    }
    setInputError(null);
    const draft: ScheduleDraft = {
      kind, title: title.trim(), instructions: instructions.trim() || null, rrule: rule,
      start_local: `${date}T${time}:00`, timezone, active,
      dose_portion: detail.trim() && (kind === "med" || kind === "meal") ? { amount: detail.trim() } : null,
    };
    void runSave(async () => {
      await careScheduleService.save(id, draft, row?.id);
      await query.invalidateQueries({ queryKey: scheduleKey(id) });
      close();
    });
  }

  return (
    <Card style={styles.card}>
      <Text style={Fonts.h3}>{row ? "Edit recurring schedule" : "New recurring schedule"}</Text>
      {row ? <Text style={Fonts.small}>Changes apply to future tasks. Completed tasks keep their original details.</Text> :
        templates.map(template => <PrimaryButton key={template.title} label={`Use template: ${template.title}`}
          variant="outline" onPress={() => applyTemplate(template)} />)}
      <Text style={Fonts.small}>Task type</Text>
      <View style={styles.choices}>
        {SCHEDULE_KINDS.map(([value, label]) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === kind }}
            style={[styles.chip, value === kind && styles.selected]} onPress={() => setKind(value)}>
            <Text style={Fonts.small}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput accessibilityLabel="Schedule title" placeholder="Task name" value={title} maxLength={100} onChangeText={setTitle} style={styles.input} />
      <TextInput accessibilityLabel="Instructions" placeholder="Instructions (optional)" value={instructions} maxLength={500}
        onChangeText={setInstructions} multiline style={styles.input} />
      {kind === "med" || kind === "meal" ? (
        <TextInput accessibilityLabel={kind === "med" ? "Prescribed dose" : "Portion"} placeholder={kind === "med" ? "Prescribed dose (optional)" : "Portion (optional)"}
          value={detail} onChangeText={setDetail} maxLength={120} style={styles.input} />
      ) : null}
      <Text style={Fonts.small}>Start date and time ({timezone})</Text>
      <View style={styles.choices}>
        <TextInput accessibilityLabel="Start date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate}
          maxLength={10} style={[styles.input, { flex: 2 }]} />
        <TextInput accessibilityLabel="Start time" placeholder="HH:MM" value={time} onChangeText={setTime}
          maxLength={5} style={[styles.input, { flex: 1 }]} />
      </View>
      <Text style={Fonts.small}>Repeat</Text>
      <View style={styles.choices}>
        {RECURRENCES.map(([value, label]) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === rule }}
            style={[styles.chip, value === rule && styles.selected]} onPress={() => setRule(value)}>
            <Text style={Fonts.small}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.switchRow}><Text style={Fonts.body}>Schedule active</Text><Switch accessibilityLabel="Schedule active" value={active} onValueChange={setActive} /></View>
      {inputError ? <Text accessibilityRole="alert" style={Fonts.small}>{inputError}</Text> : null}
      <SaveStatus saving={saving} saveError={saveError} />
      <PrimaryButton label="Save schedule" disabled={saving || !title.trim()} onPress={save} />
      <PrimaryButton label="Cancel" variant="outline" disabled={saving} onPress={close} />
    </Card>
  );
}

export default function CareSchedulesScreen() {
  const suggested = useLocalSearchParams<Suggestion>();
  const { selectedPet, mode } = usePets();
  const id = selectedPet?.id ?? "";
  const [editor, setEditor] = useState<CareSchedule | "new" | null>(suggested.taskTitle ? "new" : null);
  const { data, isError, isPending, refetch } = useQuery({
    queryKey: [...scheduleKey(id), "rules"],
    queryFn: () => careScheduleService.list(id),
    enabled: !!id && mode === "remote",
  });
  if (!selectedPet) return <NoPetSelected />;
  return (
    <FormScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Recurring schedules" }} />
      <Text style={Fonts.h2}>{selectedPet.name}’s schedules</Text>
      <Text style={Fonts.bodySoft}>Recurring tasks appear on Today, Reminders, and the shared checklist for people who have access.</Text>
      {mode !== "remote" ? <Text style={Fonts.small}>Sign in to manage schedules.</Text> : (
        <>
          {isError ? <PrimaryButton label="Retry loading schedules" variant="outline" onPress={() => { void refetch(); }} /> : null}
          {isPending ? <Text style={Fonts.small}>Loading schedules…</Text> : null}
          {data?.map(row => (
            <Card key={row.id} style={styles.card}>
              <Text style={Fonts.h3}>{row.title}{row.active ? "" : " · Paused"}</Text>
              <Text style={Fonts.small}>{RECURRENCES.find(([rule]) => rule === row.rrule)?.[1] ?? "Repeating"} · {row.start_local.slice(11, 16)} · {row.timezone}</Text>
              <PrimaryButton label={`Edit ${row.title}`} variant="outline" onPress={() => setEditor(row)} />
            </Card>
          ))}
          {editor ? <ScheduleEditor key={`${id}:${editor === "new" ? "new" : editor.id}`} id={id} species={selectedPet.species} breed={selectedPet.breed} ageYears={selectedPet.ageYears}
            row={editor === "new" ? undefined : editor} suggested={suggested} close={() => setEditor(null)} /> :
            <PrimaryButton label="Add recurring schedule" onPress={() => setEditor("new")} />}
        </>
      )}
    </FormScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Space.md, paddingBottom: Space.xl, gap: Space.md },
  card: { gap: Space.sm },
  input: { ...Fonts.body, padding: Space.sm, borderColor: Colors.hairline, borderWidth: 1, borderRadius: Radius.md },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: Space.xs },
  chip: { borderColor: Colors.hairline, borderWidth: 1, padding: Space.sm, borderRadius: Radius.md },
  selected: { backgroundColor: Colors.teal50, borderColor: Colors.teal700 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
