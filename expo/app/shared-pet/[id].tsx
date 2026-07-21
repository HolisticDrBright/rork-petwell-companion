import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AlertTriangle, Bell, Check, CircleDashed, Pill as PillIcon, UtensilsCrossed } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmergencyContacts } from "@/components/EmergencyContacts";
import { Card, Pill, SectionTitle } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getMode, getUserId } from "@/lib/backend";
import { isMembershipActive, type SharedSections } from "@/lib/careCircle";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  careCircleService,
  type CareMember,
  type CareTaskEvent,
  type CareTaskKind,
} from "@/services/careCircleService";

interface ChecklistItem {
  kind: CareTaskKind;
  id: string;
  label: string;
  detail: string | null;
  timeHint: string | null;
}

interface PetHeader {
  name: string;
  species: string;
  breed: string;
}

interface LabelRow {
  label: string;
  detail: string | null;
}

function todayIso(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const RED_FLAG_LINE =
  "If you see collapse, trouble breathing, pale or blue gums, a seizure, nonstop vomiting, or think " +
  "they got into something toxic — call the owner AND a vet or the numbers below right now.";

/**
 * The sitter's Today view for a shared pet: the owner's care protocol as a
 * tap-to-check-off list (attributed, live for the owner), plus the emergency
 * card. Everything shown here is exactly what the owner's section toggles
 * allow — RLS returns nothing else, this screen just renders what arrives.
 */
export default function SharedPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = typeof id === "string" ? id : "";
  const remote = isSupabaseConfigured && getMode() === "remote";
  const myUserId = getUserId();
  const today = todayIso();

  const [state, setState] = useState<"loading" | "no-access" | "ready">("loading");
  const [membership, setMembership] = useState<CareMember | null>(null);
  const [pet, setPet] = useState<PetHeader | null>(null);
  const [tasks, setTasks] = useState<ChecklistItem[]>([]);
  const [meds, setMeds] = useState<ChecklistItem[]>([]);
  const [conditions, setConditions] = useState<LabelRow[]>([]);
  const [allergies, setAllergies] = useState<LabelRow[]>([]);
  const [recentMeals, setRecentMeals] = useState<{ label: string; fedAt: string }[]>([]);
  const [events, setEvents] = useState<CareTaskEvent[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const sections: SharedSections | null = membership?.sharedSections ?? null;
  const active = membership ? isMembershipActive(membership) : false;
  const canLog =
    !!membership && active &&
    (membership.role === "owner" || membership.role === "co_owner" ||
      (membership.role === "caregiver" && sections?.care_protocol === true));

  const load = useCallback(async () => {
    if (!remote || !petId) {
      setState("no-access");
      return;
    }
    try {
      const flushed = await careCircleService.flushPendingCheckoffs();
      if (flushed > 0) setNote(`Synced ${flushed} offline check-off${flushed > 1 ? "s" : ""}.`);

      const m = await careCircleService.myMembership(petId);
      setMembership(m);
      if (!m || !isMembershipActive(m)) {
        setState("no-access");
        return;
      }

      const { data: petRow } = await supabase
        .from("pet_profiles")
        .select("name, species, breed")
        .eq("id", petId)
        .maybeSingle();
      if (petRow) setPet(petRow as PetHeader);

      // Each query is RLS-gated by its section toggle; empty just means "off".
      const [taskRes, remRes, medRes, condRes, allergyRes, mealRes, eventList] = await Promise.all([
        supabase.from("care_tasks").select("id, label, detail, due_time").eq("pet_id", petId).order("sort").limit(50),
        supabase.from("reminders").select("id, label, detail, time_label, enabled").eq("pet_id", petId).order("sort").limit(50),
        supabase.from("pet_medications").select("id, name, dosage, schedule, purpose").eq("pet_id", petId).limit(50),
        supabase.from("pet_conditions").select("label, detail").eq("pet_id", petId).limit(25),
        supabase.from("pet_allergies").select("label, detail").eq("pet_id", petId).limit(25),
        supabase.from("food_logs").select("label, fed_at").eq("pet_id", petId).order("fed_at", { ascending: false }).limit(3),
        careCircleService.listTaskEvents(petId),
      ]);

      const checklist: ChecklistItem[] = [
        ...((taskRes.data ?? []) as { id: string; label: string; detail: string | null; due_time: string | null }[]).map(
          (t) => ({ kind: "care_task" as const, id: t.id, label: t.label, detail: t.detail, timeHint: t.due_time }),
        ),
        ...((remRes.data ?? []) as { id: string; label: string; detail: string | null; time_label: string | null; enabled: boolean }[])
          .filter((r) => r.enabled)
          .map((r) => ({ kind: "reminder" as const, id: r.id, label: r.label, detail: r.detail, timeHint: r.time_label })),
      ];
      setTasks(checklist);
      setMeds(
        ((medRes.data ?? []) as { id: string; name: string; dosage: string | null; schedule: string | null; purpose: string | null }[]).map(
          (m2) => ({
            kind: "medication" as const,
            id: m2.id,
            label: m2.name,
            detail: [m2.dosage, m2.purpose].filter(Boolean).join(" · ") || null,
            timeHint: m2.schedule,
          }),
        ),
      );
      setConditions((condRes.data ?? []) as LabelRow[]);
      setAllergies((allergyRes.data ?? []) as LabelRow[]);
      setRecentMeals(
        ((mealRes.data ?? []) as { label: string; fed_at: string }[]).map((f) => ({ label: f.label, fedAt: f.fed_at })),
      );
      setEvents(eventList);
      setState("ready");
    } catch {
      setState("no-access");
    }
  }, [remote, petId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!remote || !petId) return;
    return careCircleService.subscribeTaskEvents(petId, (event) => {
      setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
    });
  }, [remote, petId]);

  const doneToday = useMemo(() => {
    const map = new Map<string, CareTaskEvent>();
    events
      .filter((e) => e.occurrenceDate === today)
      .forEach((e) => {
        const key = `${e.sourceKind}:${e.sourceId}`;
        const existing = map.get(key);
        if (!existing || e.completedAt > existing.completedAt) map.set(key, e);
      });
    return map;
  }, [events, today]);

  const onCheckOff = useCallback(
    async (item: ChecklistItem) => {
      const key = `${item.kind}:${item.id}`;
      if (doneToday.has(key) || busyKey) return;
      setBusyKey(key);
      try {
        const { queued } = await careCircleService.completeTaskQueued({
          petId,
          sourceKind: item.kind,
          sourceId: item.id,
          occurrenceDate: today,
        });
        if (queued) {
          setNote("No connection — saved on this phone, will sync automatically.");
          setEvents((prev) => [
            {
              id: `pending-${key}-${today}`,
              petId,
              sourceKind: item.kind,
              sourceId: item.id,
              occurrenceDate: today,
              completedBy: myUserId,
              completedAt: new Date().toISOString(),
              note: null,
              photoUrl: null,
            },
            ...prev,
          ]);
        }
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Couldn't check that off.");
      } finally {
        setBusyKey(null);
      }
    },
    [petId, today, doneToday, busyKey, myUserId],
  );

  const who = useCallback(
    (userId: string | null) => (userId && userId === myUserId ? "You" : "Care Circle"),
    [myUserId],
  );

  if (state === "loading") {
    return (
      <View style={[styles.screen, styles.centerFill]}>
        <Stack.Screen options={{ title: "Shared pet" }} />
        <ActivityIndicator color={Colors.teal700} />
      </View>
    );
  }

  if (state === "no-access") {
    return (
      <View style={[styles.screen, { padding: Space.md, justifyContent: "center" }]}>
        <Stack.Screen options={{ title: "Shared pet" }} />
        <Card style={{ gap: Space.sm }}>
          <Text style={Fonts.h3}>Access ended</Text>
          <Text style={Fonts.bodySoft}>
            This pet isn&apos;t shared with you right now. If that&apos;s unexpected, ask the owner to send a
            new invite code.
          </Text>
        </Card>
      </View>
    );
  }

  const renderChecklistRow = (item: ChecklistItem, i: number, showDetail: boolean) => {
    const key = `${item.kind}:${item.id}`;
    const done = doneToday.get(key);
    const busy = busyKey === key;
    return (
      <Pressable
        key={key}
        onPress={() => void onCheckOff(item)}
        disabled={!canLog || !!done || busy}
        style={({ pressed }) => [styles.taskRow, i > 0 && styles.rowDivider, pressed && !done && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={done ? `${item.label}, done` : `Check off ${item.label}`}
        accessibilityState={{ checked: !!done, disabled: !canLog || !!done }}
      >
        <View style={[styles.checkCircle, done ? styles.checkDone : null]}>
          {busy ? (
            <ActivityIndicator size="small" color={Colors.teal800} />
          ) : done ? (
            <Check size={16} color="#fff" />
          ) : (
            <CircleDashed size={16} color={Colors.inkFaint} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Fonts.body, done && styles.taskDoneText]}>{item.label}</Text>
          {showDetail && item.detail ? <Text style={Fonts.tiny}>{item.detail}</Text> : null}
          {done ? (
            <Text style={styles.doneBy}>
              {who(done.completedBy)} · {new Date(done.completedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </Text>
          ) : item.timeHint ? (
            <Text style={Fonts.tiny}>{item.timeHint}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: pet?.name ? `${pet.name} · shared` : "Shared pet" }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={Fonts.title}>{pet?.name ?? "Shared pet"}</Text>
          <Text style={Fonts.bodySoft}>
            {[pet?.breed, pet?.species].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Pill label={membership ? membership.role.replace("_", "-") : ""} color={Colors.teal700} bg={Colors.teal50} />
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {sections?.care_protocol ? (
        <>
          <SectionTitle title="Today's care" />
          {tasks.length === 0 ? (
            <Card>
              <Text style={Fonts.bodySoft}>No checklist items yet — the owner sets these up.</Text>
            </Card>
          ) : (
            <Card style={{ gap: 0 }}>{tasks.map((t, i) => renderChecklistRow(t, i, true))}</Card>
          )}
          {!canLog ? (
            <Text style={[Fonts.tiny, { marginTop: Space.xs }]}>
              You have view-only access — checking off is disabled.
            </Text>
          ) : null}
        </>
      ) : null}

      {sections?.medication_details && meds.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <PillIcon size={18} color={Colors.teal800} />
            <Text style={Fonts.h2}>Medications</Text>
          </View>
          <Text style={styles.medNote}>
            Give exactly what the owner wrote — nothing here is a dosing recommendation from Petwell.
          </Text>
          <Card style={{ gap: 0 }}>{meds.map((m, i) => renderChecklistRow(m, i, true))}</Card>
        </>
      ) : null}

      {sections?.feeding_plan && recentMeals.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <UtensilsCrossed size={18} color={Colors.teal800} />
            <Text style={Fonts.h2}>Recent meals</Text>
          </View>
          <Card style={{ gap: 4 }}>
            {recentMeals.map((f, i) => (
              <Text key={`${f.fedAt}-${i}`} style={Fonts.bodySoft}>
                {f.label} · {new Date(f.fedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Text>
            ))}
          </Card>
        </>
      ) : null}

      {sections?.vet_emergency_contacts ? (
        <>
          <View style={styles.sectionHead}>
            <AlertTriangle size={18} color={Colors.red600} />
            <Text style={Fonts.h2}>Emergency card</Text>
          </View>
          <Card style={{ gap: Space.sm }}>
            {conditions.length > 0 ? (
              <View>
                <Text style={Fonts.small}>Conditions</Text>
                {conditions.map((c, i) => (
                  <Text key={`c-${i}`} style={Fonts.body}>• {c.label}{c.detail ? ` — ${c.detail}` : ""}</Text>
                ))}
              </View>
            ) : null}
            {allergies.length > 0 ? (
              <View>
                <Text style={Fonts.small}>Allergies</Text>
                {allergies.map((a, i) => (
                  <Text key={`a-${i}`} style={Fonts.body}>• {a.label}{a.detail ? ` — ${a.detail}` : ""}</Text>
                ))}
              </View>
            ) : null}
            <View style={styles.redFlagBox}>
              <Text style={styles.redFlagText}>{RED_FLAG_LINE}</Text>
            </View>
            <EmergencyContacts showCallToAction={false} />
          </Card>
        </>
      ) : null}

      <View style={styles.sectionHead}>
        <Bell size={18} color={Colors.teal800} />
        <Text style={Fonts.h2}>Activity</Text>
      </View>
      {events.length === 0 ? (
        <Card>
          <Text style={Fonts.bodySoft}>Check-offs from the whole Care Circle appear here.</Text>
        </Card>
      ) : (
        <Card style={{ gap: 0 }}>
          {events.slice(0, 12).map((e, i) => (
            <View key={e.id} style={[styles.taskRow, i > 0 && styles.rowDivider]}>
              <View style={[styles.checkCircle, styles.checkDone]}>
                <Check size={14} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={Fonts.body}>{who(e.completedBy)} checked off a {e.sourceKind.replace("_", " ")}</Text>
                <Text style={Fonts.tiny}>{e.occurrenceDate}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text style={[Fonts.tiny, { marginTop: Space.lg }]}>
        Your check-offs are timestamped and attributed, and the owner sees them live. Petwell is
        informational only — it never replaces the owner&apos;s instructions or a veterinarian.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Space.md, paddingBottom: Space.xl * 2 },
  centerFill: { alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  note: { ...Fonts.small, color: Colors.teal700, marginTop: Space.xs },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: Space.xs, marginTop: Space.lg, marginBottom: Space.sm },
  taskRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: Space.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hairline },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: Colors.teal600 },
  taskDoneText: { textDecorationLine: "line-through", color: Colors.inkFaint },
  doneBy: { ...Fonts.tiny, color: Colors.teal700 },
  medNote: { ...Fonts.tiny, marginBottom: Space.xs },
  redFlagBox: { backgroundColor: Colors.red100, borderRadius: Radius.sm, padding: Space.sm },
  redFlagText: { ...Fonts.small, color: Colors.red600, lineHeight: 18 },
});
