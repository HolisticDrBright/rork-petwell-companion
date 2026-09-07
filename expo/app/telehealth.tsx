import { Stack } from "expo-router";
import { AlertTriangle, CalendarPlus, ExternalLink, Video, XCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { EmergencyContacts } from "@/components/EmergencyContacts";
import { InfoNote, ScreenHeader } from "@/components/integrative";
import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getMode } from "@/lib/backend";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  REQUEST_STATUS_LABELS,
  TELEHEALTH_COMING_SOON_BLURB,
  TELEHEALTH_NOT_EMERGENCY_LINE,
  TELEHEALTH_SCOPE_NOTE,
  canCancelRequest,
  isTelehealthLive,
  type TelehealthPractitioner,
  type TelehealthRequest,
} from "@/lib/telehealth";
import { usePets } from "@/providers/PetProvider";
import { telehealthService } from "@/services/telehealthService";

export default function TelehealthScreen() {
  const { selectedPet } = usePets();
  const remote = isSupabaseConfigured && getMode() === "remote";

  const [loading, setLoading] = useState<boolean>(true);
  const [practitioners, setPractitioners] = useState<TelehealthPractitioner[]>([]);
  const [requests, setRequests] = useState<TelehealthRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [composerFor, setComposerFor] = useState<TelehealthPractitioner | null>(null);
  const [reason, setReason] = useState<string>("");
  const [preferredTimes, setPreferredTimes] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [vets, mine] = await Promise.all([telehealthService.listPractitioners(), telehealthService.myRequests()]);
      setPractitioners(vets);
      setRequests(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load telehealth");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!remote) {
      setLoading(false);
      return;
    }
    void load();
  }, [remote, load]);

  const live = isTelehealthLive(practitioners.length);
  const onWaitlist = useMemo(() => requests.some((r) => r.kind === "waitlist" && r.status !== "cancelled"), [requests]);
  const appointments = useMemo(() => requests.filter((r) => r.kind === "appointment"), [requests]);

  const joinWaitlist = useCallback(async () => {
    setBusy(true);
    try {
      await telehealthService.joinWaitlist(selectedPet?.id ?? null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the waitlist");
    } finally {
      setBusy(false);
    }
  }, [selectedPet?.id, load]);

  const submitRequest = useCallback(async () => {
    if (!composerFor) return;
    setBusy(true);
    try {
      await telehealthService.requestAppointment({
        petId: selectedPet?.id ?? null,
        practitionerId: composerFor.id,
        reason,
        preferredTimes,
      });
      setComposerFor(null);
      setReason("");
      setPreferredTimes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the request");
    } finally {
      setBusy(false);
    }
  }, [composerFor, selectedPet?.id, reason, preferredTimes, load]);

  const cancel = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await telehealthService.cancelRequest(id);
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const book = useCallback((vet: TelehealthPractitioner) => {
    if (vet.bookingUrl) {
      Linking.openURL(vet.bookingUrl).catch(() => {});
    } else {
      setComposerFor(vet);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Vet telehealth" subtitle="Video visits with a licensed veterinarian" />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {!remote ? (
          <Card>
            <Text style={styles.body}>
              Telehealth needs an online account. Sign in with the app&apos;s full (remote) mode to join the waitlist
              or book a visit.
            </Text>
          </Card>
        ) : loading ? (
          <ActivityIndicator color={Colors.teal700} style={{ marginTop: Space.lg }} />
        ) : (
          <>
            {error ? (
              <Card style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </Card>
            ) : null}

            {!live ? (
              <Card style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <Video size={26} color={Colors.teal700} />
                </View>
                <View style={styles.soonPill}>
                  <Text style={styles.soonPillText}>COMING SOON</Text>
                </View>
                <Text style={styles.heroTitle}>Talk to a vet from home</Text>
                <Text style={styles.body}>{TELEHEALTH_COMING_SOON_BLURB}</Text>
                {onWaitlist ? (
                  <View style={styles.joinedBox}>
                    <Text style={styles.joinedText}>
                      You&apos;re on the list — we&apos;ll let you know the moment booking opens.
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => void joinWaitlist()}
                    disabled={busy}
                    accessibilityRole="button"
                    style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                  >
                    <CalendarPlus size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Notify me when booking opens</Text>
                  </Pressable>
                )}
              </Card>
            ) : (
              <>
                {practitioners.map((vet) => (
                  <Card key={vet.id} style={styles.vetCard}>
                    <Text style={styles.vetName}>
                      {vet.displayName}
                      {vet.credentials ? <Text style={styles.vetCreds}>{`  ${vet.credentials}`}</Text> : null}
                    </Text>
                    {vet.specialties.length ? (
                      <View style={styles.chipRow}>
                        {vet.specialties.map((s) => (
                          <View key={s} style={styles.chip}>
                            <Text style={styles.chipText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {vet.bio ? <Text style={styles.body}>{vet.bio}</Text> : null}
                    <Pressable
                      onPress={() => book(vet)}
                      accessibilityRole="button"
                      style={styles.primaryBtn}
                    >
                      {vet.bookingUrl ? <ExternalLink size={15} color="#fff" /> : <CalendarPlus size={15} color="#fff" />}
                      <Text style={styles.primaryBtnText}>
                        {vet.bookingUrl ? `Book with ${vet.displayName}` : "Request an appointment"}
                      </Text>
                    </Pressable>
                  </Card>
                ))}

                {composerFor ? (
                  <Card style={styles.vetCard}>
                    <Text style={styles.vetName}>Request with {composerFor.displayName}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={`What's going on with ${selectedPet?.name ?? "your pet"}? (brief)`}
                      placeholderTextColor={Colors.inkFaint}
                      value={reason}
                      onChangeText={setReason}
                      multiline
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Times that work for you (e.g. weekday evenings)"
                      placeholderTextColor={Colors.inkFaint}
                      value={preferredTimes}
                      onChangeText={setPreferredTimes}
                    />
                    <Pressable
                      onPress={() => void submitRequest()}
                      disabled={busy}
                      accessibilityRole="button"
                      style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                    >
                      <Text style={styles.primaryBtnText}>Send request</Text>
                    </Pressable>
                    <Text style={styles.tiny}>
                      You&apos;ll get a confirmation with the visit time and video link.
                    </Text>
                  </Card>
                ) : null}
              </>
            )}

            {appointments.length ? (
              <Card style={styles.vetCard}>
                <Text style={styles.sectionTitle}>Your requests</Text>
                {appointments.map((r) => (
                  <View key={r.id} style={styles.reqRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqLabel}>{REQUEST_STATUS_LABELS[r.status]}</Text>
                      {r.scheduledAt ? (
                        <Text style={styles.tiny}>{new Date(r.scheduledAt).toLocaleString()}</Text>
                      ) : (
                        <Text style={styles.tiny}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                      )}
                    </View>
                    {r.status === "scheduled" && r.meetingUrl ? (
                      <Pressable
                        onPress={() => void Linking.openURL(r.meetingUrl as string).catch(() => {})}
                        accessibilityRole="link"
                        style={styles.smallBtn}
                      >
                        <Video size={13} color={Colors.teal700} />
                        <Text style={styles.smallBtnText}>Join</Text>
                      </Pressable>
                    ) : null}
                    {canCancelRequest(r.status) ? (
                      <Pressable
                        onPress={() => void cancel(r.id)}
                        disabled={busy}
                        accessibilityRole="button"
                        style={styles.smallBtn}
                      >
                        <XCircle size={13} color={Colors.inkFaint} />
                        <Text style={[styles.smallBtnText, { color: Colors.inkFaint }]}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Card>
            ) : null}
          </>
        )}

        <Card style={styles.redFlagCard}>
          <AlertTriangle size={16} color={Colors.amber600} />
          <Text style={styles.redFlagText}>{TELEHEALTH_NOT_EMERGENCY_LINE}</Text>
        </Card>
        <EmergencyContacts showCallToAction={false} />
        <View style={{ marginTop: Space.sm }}>
          <InfoNote>{TELEHEALTH_SCOPE_NOTE}</InfoNote>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  body: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  tiny: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 4 },
  errorCard: { backgroundColor: Colors.amber100, marginBottom: Space.sm },
  errorText: { ...Fonts.small, color: Colors.amber600, fontWeight: "700" },
  heroCard: { alignItems: "flex-start", gap: 8 },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  soonPill: {
    backgroundColor: Colors.teal100,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  soonPillText: { fontSize: 10.5, fontWeight: "800", color: Colors.teal800, letterSpacing: 0.6 },
  heroTitle: { ...Fonts.h3 },
  joinedBox: { backgroundColor: Colors.teal50, borderRadius: Radius.sm, padding: 10, alignSelf: "stretch" },
  joinedText: { ...Fonts.small, color: Colors.teal900, fontWeight: "700" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.teal800,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  primaryBtnText: { ...Fonts.small, color: "#fff", fontWeight: "800" },
  vetCard: { gap: 8, marginTop: Space.sm },
  vetName: { ...Fonts.h3, fontSize: 15 },
  vetCreds: { ...Fonts.small, color: Colors.teal700, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: "700", color: Colors.teal700 },
  input: {
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: Radius.sm,
    padding: 10,
    ...Fonts.small,
    color: Colors.ink,
    backgroundColor: Colors.surface,
  },
  sectionTitle: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqLabel: { ...Fonts.small, fontWeight: "700", color: Colors.ink },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.teal50,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { ...Fonts.tiny, color: Colors.teal700, fontWeight: "800" },
  redFlagCard: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: Colors.amber100,
    marginTop: Space.md,
    marginBottom: Space.sm,
  },
  redFlagText: { ...Fonts.small, color: Colors.amber600, fontWeight: "700", flex: 1, lineHeight: 18 },
});
