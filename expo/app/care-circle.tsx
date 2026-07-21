import { Stack } from "expo-router";
import { Check, Copy, RefreshCw, Share2, ShieldCheck, UserX } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { Card, Pill, PrimaryButton, SectionTitle } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getMode, getUserId } from "@/lib/backend";
import {
  DEFAULT_SHARED_SECTIONS,
  SECTION_KEYS,
  SECTION_LABELS,
  isMembershipActive,
  type CareRole,
  type SectionKey,
  type SharedSections,
} from "@/lib/careCircle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { usePets } from "@/providers/PetProvider";
import {
  careCircleService,
  type CareMember,
  type CareTaskEvent,
  type CreatedInvite,
} from "@/services/careCircleService";

const ROLE_LABEL: Record<CareRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  caregiver: "Caregiver",
  viewer: "Viewer",
};

const EXPIRY_PRESETS = [
  { label: "Open-ended", hours: null },
  { label: "48 hours", hours: 48 },
  { label: "1 week", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
] as const;

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Owner hub for a pet's Care Circle: mint single-use invites with per-section
 * share toggles, see and edit who has access, remove someone in one tap, and
 * watch check-offs arrive live. The database enforces all of it (RLS + RPCs);
 * this screen is a window onto that state.
 */
export default function CareCircleScreen() {
  const { selectedPet } = usePets();
  const remote = isSupabaseConfigured && getMode() === "remote";
  const myUserId = getUserId();

  const [members, setMembers] = useState<CareMember[]>([]);
  const [events, setEvents] = useState<CareTaskEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Invite composer state
  const [composing, setComposing] = useState<boolean>(false);
  const [sections, setSections] = useState<SharedSections>({ ...DEFAULT_SHARED_SECTIONS });
  const [expiryHours, setExpiryHours] = useState<number | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [invite, setInvite] = useState<CreatedInvite | null>(null);

  // Per-member section editor
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editSections, setEditSections] = useState<SharedSections>({ ...DEFAULT_SHARED_SECTIONS });
  const [savingSections, setSavingSections] = useState<boolean>(false);

  const petId = selectedPet?.id ?? null;

  const load = useCallback(async () => {
    if (!petId) return;
    try {
      const [memberList, eventList] = await Promise.all([
        careCircleService.listMembers(petId),
        careCircleService.listTaskEvents(petId),
      ]);
      setMembers(memberList);
      setEvents(eventList.slice(0, 20));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the Care Circle.");
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    if (!remote || !petId) {
      setLoading(false);
      return;
    }
    void load();
    const unsubscribe = careCircleService.subscribeTaskEvents(petId, (event) => {
      setEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 20));
    });
    return unsubscribe;
  }, [remote, petId, load]);

  const memberLabel = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => {
      map.set(m.userId, m.userId === myUserId ? "You" : ROLE_LABEL[m.role]);
    });
    return (userId: string | null) => (userId ? (map.get(userId) ?? "Care Circle") : "A former member");
  }, [members, myUserId]);

  const onCreateInvite = useCallback(async () => {
    if (!petId) return;
    setCreating(true);
    try {
      const accessExpiresAt = expiryHours
        ? new Date(Date.now() + expiryHours * 3600_000).toISOString()
        : null;
      const created = await careCircleService.createInvite(petId, "caregiver", sections, accessExpiresAt);
      setInvite(created);
      setComposing(false);
    } catch (e) {
      Alert.alert("Couldn't create the invite", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setCreating(false);
    }
  }, [petId, sections, expiryHours]);

  const onShareCode = useCallback(async (code: string) => {
    const petName = selectedPet?.name ?? "my pet";
    try {
      await Share.share({
        message:
          `You're invited to help care for ${petName} on Petwell. ` +
          `Install the app, then enter this one-time code: ${code} (valid for 48 hours).`,
      });
    } catch {
      // user dismissed the share sheet
    }
  }, [selectedPet?.name]);

  const onRevoke = useCallback((member: CareMember) => {
    if (!petId) return;
    Alert.alert(
      "Remove access?",
      "They lose access immediately. Everything they logged stays on the timeline, attributed to them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await careCircleService.revokeMember(petId, member.userId);
                await load();
              } catch (e) {
                Alert.alert("Couldn't remove", e instanceof Error ? e.message : "Please try again.");
              }
            })();
          },
        },
      ],
    );
  }, [petId, load]);

  const onSaveSections = useCallback(async (userId: string) => {
    if (!petId) return;
    setSavingSections(true);
    try {
      await careCircleService.updateMemberSections(petId, userId, editSections);
      setEditingUserId(null);
      await load();
    } catch (e) {
      Alert.alert("Couldn't update sharing", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSavingSections(false);
    }
  }, [petId, editSections, load]);

  if (!remote) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Care Circle" }} />
        <Card style={{ gap: Space.sm }}>
          <Text style={Fonts.h3}>Sharing needs an account</Text>
          <Text style={Fonts.bodySoft}>
            The Care Circle syncs live between phones, so it works when you&apos;re signed in with the
            backend connected. Sign in from Settings → Account, then come back here.
          </Text>
        </Card>
      </View>
    );
  }

  if (!selectedPet) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Care Circle" }} />
        <Text style={Fonts.bodySoft}>Add or select a pet first.</Text>
      </View>
    );
  }

  const circleMembers = members.filter((m) => m.role !== "owner");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Care Circle" }} />

      <Text style={Fonts.title}>{selectedPet.name}&apos;s Care Circle</Text>
      <Text style={[Fonts.bodySoft, { marginTop: 4 }]}>
        Share a one-time code with a sitter, walker or family member. You choose exactly which
        sections they see, can change it anytime, and can remove them in one tap.
      </Text>

      {/* ── Invite ─────────────────────────────────────────── */}
      {invite ? (
        <Card style={{ gap: Space.sm, marginTop: Space.md }}>
          <Text style={Fonts.h3}>Share this code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{invite.code}</Text>
          </View>
          <Text style={Fonts.small}>
            Single-use · invite expires in 48 hours
            {invite.accessExpiresAt
              ? ` · access ends ${new Date(invite.accessExpiresAt).toLocaleDateString()}`
              : " · access is open-ended"}
          </Text>
          <PrimaryButton
            label="Send code"
            icon={<Share2 size={18} color="#fff" />}
            onPress={() => void onShareCode(invite.code)}
          />
          <PrimaryButton label="Done" variant="ghost" onPress={() => setInvite(null)} />
        </Card>
      ) : composing ? (
        <Card style={{ gap: Space.sm, marginTop: Space.md }}>
          <Text style={Fonts.h3}>New caregiver invite</Text>
          <Text style={Fonts.small}>What can they see?</Text>
          {SECTION_KEYS.map((key: SectionKey) => (
            <View key={key} style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: Space.sm }}>
                <Text style={Fonts.body}>{SECTION_LABELS[key].label}</Text>
                <Text style={Fonts.tiny}>{SECTION_LABELS[key].note}</Text>
              </View>
              <Switch
                value={sections[key]}
                disabled={key === "wearable_vitals"}
                onValueChange={(v) => setSections((prev) => ({ ...prev, [key]: v }))}
                trackColor={{ true: Colors.teal500, false: Colors.hairline }}
                accessibilityLabel={`Share ${SECTION_LABELS[key].label}`}
              />
            </View>
          ))}
          <Text style={[Fonts.small, { marginTop: Space.xs }]}>Access ends</Text>
          <View style={styles.presetRow}>
            {EXPIRY_PRESETS.map((p) => (
              <Pressable
                key={p.label}
                onPress={() => setExpiryHours(p.hours)}
                style={[styles.preset, expiryHours === p.hours && styles.presetActive]}
                accessibilityRole="button"
              >
                <Text style={[styles.presetText, expiryHours === p.hours && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton
            label={creating ? "Creating…" : "Create invite code"}
            disabled={creating}
            onPress={() => void onCreateInvite()}
          />
          <PrimaryButton label="Cancel" variant="ghost" onPress={() => setComposing(false)} />
        </Card>
      ) : (
        <PrimaryButton
          label="Share this pet"
          icon={<Share2 size={18} color="#fff" />}
          style={{ marginTop: Space.md }}
          onPress={() => {
            setSections({ ...DEFAULT_SHARED_SECTIONS });
            setExpiryHours(null);
            setComposing(true);
          }}
        />
      )}

      {/* ── Members ────────────────────────────────────────── */}
      <SectionTitle title="Who has access" />
      {loading ? (
        <ActivityIndicator color={Colors.teal700} style={{ marginVertical: Space.lg }} />
      ) : error ? (
        <Card>
          <Text style={Fonts.bodySoft}>{error}</Text>
          <PrimaryButton label="Retry" variant="outline" icon={<RefreshCw size={16} color={Colors.teal800} />} onPress={() => void load()} />
        </Card>
      ) : circleMembers.length === 0 ? (
        <Card>
          <Text style={Fonts.bodySoft}>
            Just you so far. Share a code above and whoever claims it will appear here.
          </Text>
        </Card>
      ) : (
        circleMembers.map((m) => {
          const active = isMembershipActive(m);
          const editing = editingUserId === m.userId;
          return (
            <Card key={m.userId} style={{ gap: Space.xs, marginBottom: Space.sm }}>
              <View style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{ROLE_LABEL[m.role]}</Text>
                  <Text style={Fonts.tiny}>
                    Joined {new Date(m.createdAt).toLocaleDateString()}
                    {m.expiresAt ? ` · until ${new Date(m.expiresAt).toLocaleDateString()}` : ""}
                  </Text>
                </View>
                <Pill
                  label={active ? "Active" : m.status === "revoked" ? "Removed" : "Expired"}
                  color={active ? Colors.teal700 : Colors.inkFaint}
                  bg={active ? Colors.teal50 : Colors.cream2}
                />
              </View>
              {active ? (
                <View style={styles.memberActions}>
                  <Pressable
                    onPress={() => {
                      setEditingUserId(editing ? null : m.userId);
                      setEditSections({ ...m.sharedSections });
                    }}
                    style={styles.memberAction}
                    accessibilityRole="button"
                  >
                    <ShieldCheck size={16} color={Colors.teal800} />
                    <Text style={styles.memberActionText}>{editing ? "Close" : "Edit sharing"}</Text>
                  </Pressable>
                  <Pressable onPress={() => onRevoke(m)} style={styles.memberAction} accessibilityRole="button">
                    <UserX size={16} color={Colors.red600} />
                    <Text style={[styles.memberActionText, { color: Colors.red600 }]}>Remove</Text>
                  </Pressable>
                </View>
              ) : null}
              {editing ? (
                <View style={{ gap: 4, marginTop: Space.xs }}>
                  {SECTION_KEYS.map((key) => (
                    <View key={key} style={styles.toggleRow}>
                      <Text style={[Fonts.body, { flex: 1 }]}>{SECTION_LABELS[key].label}</Text>
                      <Switch
                        value={editSections[key]}
                        disabled={key === "wearable_vitals"}
                        onValueChange={(v) => setEditSections((prev) => ({ ...prev, [key]: v }))}
                        trackColor={{ true: Colors.teal500, false: Colors.hairline }}
                        accessibilityLabel={`Share ${SECTION_LABELS[key].label}`}
                      />
                    </View>
                  ))}
                  <PrimaryButton
                    label={savingSections ? "Saving…" : "Save changes"}
                    disabled={savingSections}
                    onPress={() => void onSaveSections(m.userId)}
                  />
                  <Text style={Fonts.tiny}>Changes apply on their very next refresh — no re-invite.</Text>
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      {/* ── Live activity ──────────────────────────────────── */}
      <SectionTitle title="Live activity" />
      {events.length === 0 ? (
        <Card>
          <Text style={Fonts.bodySoft}>
            Check-offs appear here the moment a caregiver taps them.
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: 0 }}>
          {events.map((e, i) => (
            <View key={e.id} style={[styles.eventRow, i > 0 && styles.eventDivider]}>
              <View style={styles.eventCheck}>
                <Check size={14} color={Colors.teal800} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={Fonts.body}>
                  {memberLabel(e.completedBy)} checked off a {e.sourceKind.replace("_", " ")}
                </Text>
                <Text style={Fonts.tiny}>
                  {e.occurrenceDate} · {timeLabel(e.completedAt)}
                  {e.note ? ` · "${e.note}"` : ""}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.footNote}>
        <Copy size={14} color={Colors.inkFaint} />
        <Text style={[Fonts.tiny, { flex: 1 }]}>
          Removing someone never deletes what they logged — care history stays on the timeline,
          attributed. Every invite, change and check-off is recorded in the audit trail.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Space.md, paddingBottom: Space.xl * 2 },
  center: { flex: 1, backgroundColor: Colors.cream, padding: Space.md, justifyContent: "center" },
  codeBox: {
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    paddingVertical: Space.md,
    alignItems: "center",
  },
  codeText: { fontSize: 32, fontWeight: "800", letterSpacing: 6, color: Colors.teal900 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: Space.xs },
  preset: {
    paddingHorizontal: Space.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream2,
  },
  presetActive: { backgroundColor: Colors.teal800 },
  presetText: { ...Fonts.small, color: Colors.inkSoft },
  presetTextActive: { color: "#fff" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  memberActions: { flexDirection: "row", gap: Space.lg, marginTop: 2 },
  memberAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  memberActionText: { ...Fonts.small, color: Colors.teal800 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: Space.sm },
  eventDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hairline },
  eventCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  footNote: { flexDirection: "row", gap: 8, marginTop: Space.lg, alignItems: "flex-start" },
});
