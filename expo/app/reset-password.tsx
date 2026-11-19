import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";
import { acceptRecoveryCode, finishPasswordReset } from "@/lib/authRecovery";

export default function ResetPasswordScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    if (typeof code !== "string" || !code) {
      setError("Open the reset link from your email on the device where you requested it.");
      return;
    }
    acceptRecoveryCode(code).then(() => { if (active) setReady(true); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [code]);
  const save = async () => {
    if (!ready || saving.current) return;
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await finishPasswordReset(password);
      setPassword(""); setConfirmation(""); setDone(true);
      router.setParams({ code: undefined });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update your password. Please try again."); }
    finally { saving.current = false; setBusy(false); }
  };
  return <ScrollView style={{ backgroundColor: Colors.cream }} contentContainerStyle={{ padding: Space.md }} keyboardShouldPersistTaps="handled">
    <Stack.Screen options={{ title: "Reset password" }} />
    <Card style={{ gap: 16 }}>
      <Text style={Fonts.h3}>{done ? "Password updated" : "Choose a new password"}</Text>
      {done ? <PrimaryButton label="Continue to Petwell" onPress={() => router.replace("/")} /> : <>
        <Text style={Fonts.bodySoft}>Use at least 8 characters. Request and open your reset link on the same device.</Text>
        {ready ? <>
          <TextInput accessibilityLabel="New password" placeholder="New password" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} style={{ padding: 14, borderWidth: 1, borderColor: Colors.hairline }} />
          <TextInput accessibilityLabel="Confirm new password" placeholder="Confirm new password" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={confirmation} onChangeText={setConfirmation} style={{ padding: 14, borderWidth: 1, borderColor: Colors.hairline }} />
          <PrimaryButton label={busy ? "Updating…" : "Update password"} disabled={busy || password.length < 8 || !confirmation} onPress={save} />
        </> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: Colors.red600 }}>{error}</Text> : !ready ? <Text>Checking reset link…</Text> : null}
        <PrimaryButton label="Back to sign in" variant="outline" onPress={() => router.replace("/account")} />
      </>}
    </Card>
  </ScrollView>;
}
