import { Stack } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Space } from "@/constants/colors";
import { useSubscription } from "@/providers/SubscriptionProvider";

export default function PremiumScreen() {
  const { isPro, isSupported, restore, manageSubscription } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const run = async (action: "restore" | "manage") => {
    if (busy) return;
    setBusy(true); setStatus(null);
    try {
      if (action === "manage") await manageSubscription();
      else {
        const result = await restore();
        setStatus(result.ok ? result.isPro ? "Purchases restored." : "No previous purchases found." : result.error ?? "Could not restore purchases.");
      }
    } catch { setStatus("Could not connect to the store. Please try again."); }
    finally { setBusy(false); }
  };
  return <ScrollView style={{ backgroundColor: Colors.cream }} contentContainerStyle={{ padding: Space.md }}>
    <Stack.Screen options={{ title: "Petwell Pro", headerShown: true }} />
    <Card style={{ gap: 16 }}>
      <Text style={Fonts.h3}>{isPro ? "Your Pro subscription" : "Pro plans are not available yet"}</Text>
      <Text style={Fonts.bodySoft}>New Pro purchases are paused while we finalize the paid features. Current app features and data export do not require a new subscription.</Text>
      <Text style={Fonts.bodySoft}>Existing customers can restore purchases or manage their subscription. Pausing new purchases does not cancel an existing subscription.</Text>
      {isSupported ? <>
        <PrimaryButton label="Restore purchases" disabled={busy} variant="outline" onPress={() => run("restore")} />
        <PrimaryButton label="Manage subscription" disabled={busy} variant="outline" onPress={() => run("manage")} />
      </> : <Text style={Fonts.bodySoft}>To restore purchases or manage a subscription, use the app on the device where you subscribed, or your store account settings.</Text>}
      {status ? <Text accessibilityRole="alert" style={Fonts.small}>{status}</Text> : null}
    </Card>
  </ScrollView>;
}
