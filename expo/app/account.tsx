import { Stack, useRouter } from "expo-router";
import { Check, LogOut, Mail, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountScreen() {
  const router = useRouter();
  const { authEmail, isAuthenticated, canUseAuth, signUp, signIn, signOut } = usePets();

  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = mode === "signup" ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    if (res.needsConfirmation) {
      setInfo("Account created — check your email to confirm, then sign in.");
      setMode("signin");
      setPassword("");
      return;
    }
    router.back();
  }, [canSubmit, mode, email, password, signUp, signIn, router]);

  const doSignOut = useCallback(async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    router.back();
  }, [signOut, router]);

  const headerNote = useMemo(
    () =>
      mode === "signup"
        ? "Create an account to back up your pets and sync across devices. Your current data stays attached to you."
        : "Welcome back — sign in to access your pets on this device.",
    [mode],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Account" }} />

      {!canUseAuth ? (
        <Card style={{ gap: 8 }}>
          <Text style={Fonts.h3}>Accounts are offline right now</Text>
          <Text style={styles.body}>
            The app is running in local mode (no backend configured), so your data is stored privately on this device.
            Connect a backend to create an account and sync across devices.
          </Text>
        </Card>
      ) : isAuthenticated ? (
        <>
          <Card style={{ gap: 12 }}>
            <View style={styles.signedInRow}>
              <View style={styles.avatar}>
                <ShieldCheck size={22} color={Colors.teal700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={Fonts.tiny}>SIGNED IN</Text>
                <Text style={styles.email}>{authEmail}</Text>
              </View>
            </View>
            <Text style={styles.body}>
              Your pets, logs, scans, and reports are backed up to your account and protected by row-level security.
            </Text>
          </Card>
          <Pressable
            onPress={doSignOut}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.8 }]}
          >
            <LogOut size={18} color={Colors.red600} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          <Text style={styles.note}>
            Signing out keeps your account data safe in the cloud and starts a fresh local session on this device.
          </Text>
        </>
      ) : (
        <>
          {/* Mode toggle */}
          <View style={styles.toggle}>
            <Pressable
              onPress={() => { setMode("signup"); setError(null); }}
              style={[styles.toggleBtn, mode === "signup" && styles.toggleActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "signup" }}
            >
              <Text style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}>Create account</Text>
            </Pressable>
            <Pressable
              onPress={() => { setMode("signin"); setError(null); }}
              style={[styles.toggleBtn, mode === "signin" && styles.toggleActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "signin" }}
            >
              <Text style={[styles.toggleText, mode === "signin" && styles.toggleTextActive]}>Sign in</Text>
            </Pressable>
          </View>

          <Text style={styles.headerNote}>{headerNote}</Text>

          <Card style={{ gap: 12 }}>
            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.inkFaint}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <PrimaryButton
              label={busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              icon={busy ? undefined : mode === "signup" ? <Mail size={18} color="#fff" /> : <Check size={18} color="#fff" />}
              variant="primary"
              onPress={submit}
              disabled={!canSubmit}
              style={!canSubmit ? { opacity: 0.6 } : undefined}
            />
            {busy ? <ActivityIndicator color={Colors.teal700} /> : null}
          </Card>

          <Text style={styles.note}>
            Petwell only uses your email to secure your account. Your pet data is private to you and protected by
            row-level security — see our Privacy Policy.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  body: { ...Fonts.bodySoft, lineHeight: 21 },
  signedInRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  email: { ...Fonts.h3, fontSize: 16 },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Space.lg,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.red100,
  },
  signOutText: { ...Fonts.h3, color: Colors.red600, fontSize: 15 },
  toggle: { flexDirection: "row", backgroundColor: Colors.cream2, borderRadius: Radius.pill, padding: 4, marginBottom: Space.md },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.pill, alignItems: "center" },
  toggleActive: { backgroundColor: Colors.teal700 },
  toggleText: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "800" },
  toggleTextActive: { color: "#fff" },
  headerNote: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19, marginBottom: Space.md },
  label: { ...Fonts.tiny, color: Colors.inkFaint, letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  error: { ...Fonts.small, color: Colors.red600, lineHeight: 18 },
  info: { ...Fonts.small, color: Colors.teal700, lineHeight: 18 },
  note: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.lg, lineHeight: 18 },
});
