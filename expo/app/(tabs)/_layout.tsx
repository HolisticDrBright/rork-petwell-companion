import { Tabs } from "expo-router";
import { Activity, FileText, Home, MessageCircleQuestion, ScanLine } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { FirstPetGate } from "@/components/FirstPetGate";
import { LoadFailed } from "@/components/ui";
import Colors from "@/constants/colors";
import { usePets } from "@/providers/PetProvider";

export default function TabLayout() {
  const { isLoading, backendReady, onboarded, hasPets, petsFailed, retryPets } = usePets();

  // If the pet list couldn't be fetched at all (offline, backend down), say so
  // and offer a retry. Without this the app sits on a spinner forever with no
  // explanation and no way out.
  if (petsFailed) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: Colors.cream }}>
        <LoadFailed
          title="Can't reach your pets right now"
          subtitle="You're offline or Petwell can't be reached. Your data is safe — try again in a moment."
          onRetry={retryPets}
        />
      </View>
    );
  }

  // Hold the tab screens until the pet source has settled — they assume a
  // selected pet, and mounting them with a null pet would crash. Once settled,
  // a brand-new (zero-pet) onboarded user gets the first-pet flow instead of
  // fake demo pets. Pre-onboarding renders the tabs so index can redirect to
  // /onboarding as before.
  if (isLoading || !backendReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.cream }}>
        <ActivityIndicator color={Colors.teal700} />
      </View>
    );
  }
  if (onboarded && !hasPets) {
    return <FirstPetGate />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.teal800,
        tabBarInactiveTintColor: Colors.inkFaint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.hairline,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 68,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: "Ask",
          tabBarIcon: ({ color, size }) => <MessageCircleQuestion color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => <ScanLine color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Records",
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
