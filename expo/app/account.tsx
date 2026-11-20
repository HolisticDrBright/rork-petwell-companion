import * as Linking from "expo-linking";
import { requestPasswordReset } from "@/lib/authRecovery";
import { Stack, useRouter } from "expo-router";
import { Check, LogOut, Mail, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";
import { exportJson } from "@/lib/report/export";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountScreen() {
  const router = useRouter();
  const { authEmail, isAuthenticated, canUseAuth, signUp, signIn, signOut, hasDeviceData, deviceData } = usePets();

  const [mode, setMode] = useState<"signup" | "signin" | "reset">("signin");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = mode === "reset" || password.length >= (mode === "signup" ? 8 : 6);
  const canSubmit = emailValid && passwordValid && !busy;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "reset") {
        await requestPasswordReset(email, Linking.createURL("reset-password"));
        setInfo("If this email has an account, you will receive a reset link. Open it on this device.");
        return;
      }
      const res = mode === "signup" ? await signUp(email, password, Linking.createURL("account")) : await signIn(email, password);
      if (!res.ok) { setError(res.error ?? "Something went wrong."); return; }
      if (res.needsConfirmation) {
        setInfo("Check your email to confirm your account, then sign in.");
        setMode("signin"); setPassword(""); return;
      }
      setPassword("");
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account services are unavailable. Please try again.");
    } finally { setBusy(false); }
  }, [canSubmit, mode, email, password, signUp, signIn, router]);

  const doSignOut = useCallback(async () => {
    setBusy(true);
    try { await signOut(); router.replace("/"); }
    catch { setError("Could not sign out. Please try again."); }
    finally { setBusy(false); }
  }, [signOut, router]);

  const headerNote = useMemo(
    () =>
      mode === "signup"
        ? "Create an account to back up your pets and sync across devices. Existing device-only data stays on this device; it is not automatically uploaded."
        : mode === "reset" ? "Enter your email to request a password reset." : "Welcome back — sign in to access your pets on this device.",
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
      {hasDeviceData ? <Card style={{ gap: 8, marginBottom: Space.md }}>
        <Text style={Fonts.h3}>Device-only records found</Text>
        <Text style={styles.body}>These records are still on this device and have not been uploaded to your account. Export a copy before clearing device data.</Text>
        <PrimaryButton label="Export device records" variant="outline" onPress={async () => {
          try {
            const method = await exportJson({ app: "Petwell", exportedAt: new Date().toISOString(), data: deviceData }, "petwell-device-records.json");
            if (method === "none") throw new Error("Export failed.");
          }
          catch { setError("Could not export device records. Please try again."); }
        }} />
      </Card> : null}

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
              Saved account records are private to your account and available when you sign in on another device.
            </Text>
          </Card>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
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
            Signing out keeps your account data safe in the cloud and returns this device to the sign-in screen.
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
            {mode !== "reset" ? <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={mode === "signup" ? "At least 8 characters" : "Password"}
                placeholderTextColor={Colors.inkFaint}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                style={styles.input}
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            </View> : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <PrimaryButton
              label={busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
              icon={busy ? undefined : mode === "signup" ? <Mail size={18} color="#fff" /> : <Check size={18} color="#fff" />}
              variant="primary"
              onPress={submit}
              disabled={!canSubmit}
              style={!canSubmit ? { opacity: 0.6 } : undefined}
            />
            {mode !== "reset" ? <Pressable accessibilityRole="button" onPress={() => { setMode("reset"); setPassword(""); setError(null); setInfo(null); }}><Text style={styles.info}>Forgot password?</Text></Pressable> : null}
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
