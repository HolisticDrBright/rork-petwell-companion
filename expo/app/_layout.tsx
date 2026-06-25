import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Colors from "@/constants/colors";
import { PetProvider } from "@/providers/PetProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.cream },
        headerShadowVisible: false,
        headerTintColor: Colors.teal800,
        headerTitleStyle: { fontWeight: "800", color: Colors.ink },
        contentStyle: { backgroundColor: Colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="add-pet" options={{ title: "Add a pet", presentation: "modal" }} />
      <Stack.Screen name="ask-flow" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="triage-result" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="log" options={{ title: "Add a log", presentation: "modal" }} />
      <Stack.Screen name="scan-flow" options={{ title: "Scan", presentation: "card" }} />
      <Stack.Screen name="scan-result" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="food-scan" options={{ title: "Food Intelligence", presentation: "card" }} />
      <Stack.Screen name="food-result" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="telehealth" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="vet-report" options={{ title: "Vet-ready summary", presentation: "modal" }} />
      <Stack.Screen name="reminders" options={{ title: "Reminders", presentation: "card" }} />
      <Stack.Screen name="premium" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ title: "Settings & privacy", presentation: "card" }} />
      <Stack.Screen name="devices" options={{ title: "Connected devices", presentation: "card" }} />
      <Stack.Screen name="health-score" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="patterns" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="protocols" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="protocol-detail" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="meal-planner" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="treat-audit" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="environment" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="programs" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="program-detail" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="marketplace" options={{ headerShown: false, presentation: "card" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PetProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </PetProvider>
    </QueryClientProvider>
  );
}
