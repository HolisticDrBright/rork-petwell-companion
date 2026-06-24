import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bell, ChevronLeft, MapPin, Phone, Stethoscope, Video } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";

export default function TelehealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { urgent } = useLocalSearchParams<{ urgent?: string }>();
  const isUrgent = urgent === "1";
  const [notified, setNotified] = useState<boolean>(false);

  const findEmergency = useCallback(() => {
    Linking.openURL("https://www.google.com/maps/search/emergency+vet+near+me").catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <ChevronLeft size={24} color={Colors.ink} />
        </Pressable>
        <Text style={Fonts.h3}>Talk to a vet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {/* Urgent banner first */}
        {isUrgent ? (
          <View style={styles.urgentCard}>
            <Phone size={18} color={Colors.red600} />
            <Text style={styles.urgentText}>
              For urgent symptoms, don&apos;t wait for telehealth — call your vet or an emergency clinic now.
            </Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Video size={30} color={Colors.teal700} />
          </View>
          <Text style={styles.title}>Vet telehealth is coming soon</Text>
          <Text style={styles.body}>
            We&apos;re partnering with licensed veterinary telehealth providers so you can get advice
            without leaving home. It&apos;s not connected yet.
          </Text>
          <Text style={styles.bodyStrong}>
            For urgent symptoms, call your vet or emergency clinic.
          </Text>
        </View>

        {/* Real, working actions */}
        <Card style={{ gap: 12, marginTop: Space.lg }}>
          <Text style={styles.cardTitle}>Right now you can</Text>
          <PrimaryButton
            label="Find emergency vets nearby"
            icon={<MapPin size={18} color="#fff" />}
            variant="primary"
            onPress={findEmergency}
          />
          <PrimaryButton
            label="Build a vet-ready report"
            icon={<Stethoscope size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={() => router.replace("/vet-report")}
          />
          <Pressable
            onPress={() => setNotified(true)}
            style={({ pressed }) => [styles.notify, pressed && { opacity: 0.8 }]}
          >
            <Bell size={16} color={Colors.teal700} />
            <Text style={styles.notifyText}>
              {notified ? "Thanks — we'll let you know when it's live" : "Notify me when telehealth is live"}
            </Text>
          </Pressable>
        </Card>

        <Text style={styles.disclaimer}>
          Petwell guidance is informational and not a diagnosis. In an emergency, contact a veterinary
          professional immediately.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  urgentCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.red100,
    borderRadius: Radius.md,
    padding: Space.md,
    marginBottom: Space.md,
  },
  urgentText: { ...Fonts.small, color: Colors.red600, flex: 1, lineHeight: 19, fontWeight: "600" },
  hero: { alignItems: "center", paddingTop: Space.lg },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Space.md,
  },
  title: { ...Fonts.title, fontSize: 23, textAlign: "center" },
  body: { ...Fonts.bodySoft, textAlign: "center", marginTop: 10, lineHeight: 22 },
  bodyStrong: { ...Fonts.body, color: Colors.ink, textAlign: "center", marginTop: 12, fontWeight: "700", lineHeight: 21 },
  cardTitle: { ...Fonts.h3 },
  notify: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  notifyText: { ...Fonts.small, color: Colors.teal700 },
  disclaimer: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.lg, lineHeight: 18 },
});
