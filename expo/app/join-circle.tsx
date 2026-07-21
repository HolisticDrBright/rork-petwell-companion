import { Stack, useRouter } from "expo-router";
import { ChevronRight, KeyRound, PawPrint } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, PrimaryButton, SectionTitle } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { getMode } from "@/lib/backend";
import {
  SECTION_KEYS,
  SECTION_LABELS,
  isValidInviteCode,
  normalizeInviteCode,
  type CareRole,
} from "@/lib/careCircle";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { careCircleService, type ClaimedPet } from "@/services/careCircleService";

const ROLE_LABEL: Record<CareRole, string> = {
  owner: "Owner",
  co_owner: "Co-owner",
  caregiver: "Caregiver",
  viewer: "Viewer",
};

interface SharedPetRow {
  petId: string;
  petName: string;
  role: CareRole;
}

/**
 * "Shared with me": enter a Pet ID code to join a Care Circle, and open pets
 * other people have shared. The join result shows exactly which sections were
 * granted, so scope is transparent on both sides.
 */
export default function JoinCircleScreen() {
  const router = useRouter();
  const remote = isSupabaseConfigured && getMode() === "remote";

  const [code, setCode] = useState<string>("");
  const [claiming, setClaiming] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<ClaimedPet | null>(null);

  const [sharedPets, setSharedPets] = useState<SharedPetRow[]>([]);
  const [loadingShared, setLoadingShared] = useState<boolean>(true);

  const loadShared = useCallback(async () => {
    try {
      const memberships = await careCircleService.listSharedPets();
      if (memberships.length === 0) {
        setSharedPets([]);
        return;
      }
      const ids = memberships.map((m) => m.petId);
      const { data } = await supabase.from("pet_profiles").select("id, name").in("id", ids).limit(50);
      const names = new Map((data ?? []).map((p) => [p.id as string, p.name as string]));
      setSharedPets(
        memberships.map((m) => ({
          petId: m.petId,
          petName: names.get(m.petId) ?? "Shared pet",
          role: m.role,
        })),
      );
    } catch {
      setSharedPets([]);
    } finally {
      setLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    if (!remote) {
      setLoadingShared(false);
      return;
    }
    void loadShared();
  }, [remote, loadShared]);

  const onClaim = useCallback(async () => {
    setClaimError(null);
    if (!isValidInviteCode(code)) {
      setClaimError("That doesn't look like a Petwell code — it's 8 letters and numbers.");
      return;
    }
    setClaiming(true);
    try {
      const result = await careCircleService.claimInvite(code);
      setClaimed(result);
      setCode("");
      void loadShared();
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : "Couldn't join with that code.");
    } finally {
      setClaiming(false);
    }
  }, [code, loadShared]);

  if (!remote) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Shared with me" }} />
        <Card style={{ gap: Space.sm }}>
          <Text style={Fonts.h3}>Sign in to join a Care Circle</Text>
          <Text style={Fonts.bodySoft}>
            Shared pets sync live between phones, so you need a free Petwell account. Sign in from
            Settings → Account, then enter your code here.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "Shared with me" }} />

      {claimed ? (
        <Card style={{ gap: Space.sm }}>
          <Text style={Fonts.h2}>
            {claimed.alreadyMember ? "You're already in" : "You're in!"} 🐾
          </Text>
          <Text style={Fonts.body}>
            You joined {claimed.petName}&apos;s Care Circle as {ROLE_LABEL[claimed.role].toLowerCase()}.
          </Text>
          <Text style={Fonts.small}>You can see:</Text>
          <View style={{ gap: 2 }}>
            {SECTION_KEYS.filter((k) => claimed.sharedSections[k]).map((k) => (
              <Text key={k} style={Fonts.bodySoft}>• {SECTION_LABELS[k].label}</Text>
            ))}
          </View>
          <PrimaryButton
            label={`Open ${claimed.petName}'s care view`}
            onPress={() => {
              const petId = claimed.petId;
              setClaimed(null);
              router.push({ pathname: "/shared-pet/[id]", params: { id: petId } });
            }}
          />
        </Card>
      ) : (
        <Card style={{ gap: Space.sm }}>
          <View style={styles.headRow}>
            <KeyRound size={20} color={Colors.teal800} />
            <Text style={Fonts.h3}>Have a Pet ID code?</Text>
          </View>
          <Text style={Fonts.bodySoft}>
            Enter the one-time code the pet&apos;s owner sent you. You&apos;ll see exactly what they&apos;re
            sharing before anything else happens.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(normalizeInviteCode(t))}
            placeholder="E.G. CVF6W96D"
            placeholderTextColor={Colors.inkFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            style={styles.codeInput}
            accessibilityLabel="Invite code"
          />
          {claimError ? <Text style={styles.error}>{claimError}</Text> : null}
          <PrimaryButton
            label={claiming ? "Joining…" : "Join Care Circle"}
            disabled={claiming || code.length === 0}
            onPress={() => void onClaim()}
          />
        </Card>
      )}

      <SectionTitle title="Pets shared with me" />
      {loadingShared ? (
        <ActivityIndicator color={Colors.teal700} style={{ marginVertical: Space.lg }} />
      ) : sharedPets.length === 0 ? (
        <Card>
          <Text style={Fonts.bodySoft}>
            Nothing yet. When someone shares their pet with you, it shows up here.
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: 0 }}>
          {sharedPets.map((p, i) => (
            <Pressable
              key={p.petId}
              onPress={() => router.push({ pathname: "/shared-pet/[id]", params: { id: p.petId } })}
              style={({ pressed }) => [styles.petRow, i > 0 && styles.petDivider, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${p.petName}`}
            >
              <View style={styles.petIcon}>
                <PawPrint size={18} color={Colors.teal800} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={Fonts.body}>{p.petName}</Text>
                <Text style={Fonts.tiny}>{ROLE_LABEL[p.role]}</Text>
              </View>
              <ChevronRight size={18} color={Colors.inkFaint} />
            </Pressable>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  content: { padding: Space.md, paddingBottom: Space.xl * 2 },
  center: { flex: 1, backgroundColor: Colors.cream, padding: Space.md, justifyContent: "center" },
  headRow: { flexDirection: "row", alignItems: "center", gap: Space.xs },
  codeInput: {
    backgroundColor: Colors.cream2,
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
    color: Colors.ink,
    textAlign: "center",
  },
  error: { ...Fonts.small, color: Colors.red600 },
  petRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: Space.sm },
  petDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.hairline },
  petIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
});
