import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bell, Check, ChevronLeft, Leaf, MapPin, PhoneCall, Phone, Stethoscope, Video } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { storage } from "@/services";

interface PreferredVet {
  name: string;
  phone: string;
}

const NOTIFY_KEY = "petwell.telehealth.notified";
const VET_KEY = "petwell.preferredVet";

export default function TelehealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { urgent, holistic } = useLocalSearchParams<{ urgent?: string; holistic?: string }>();
  const isUrgent = urgent === "1";
  const isHolistic = holistic === "1";
  const [notified, setNotified] = useState<boolean>(false);
  const [vet, setVet] = useState<PreferredVet | null>(null);
  const [vetName, setVetName] = useState<string>("");
  const [vetPhone, setVetPhone] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      const [n, v] = await Promise.all([
        storage.getJSON<boolean>(NOTIFY_KEY, false),
        storage.getJSON<PreferredVet | null>(VET_KEY, null),
      ]);
      if (!active) return;
      setNotified(n);
      if (v) {
        setVet(v);
        setVetName(v.name);
        setVetPhone(v.phone);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onNotify = useCallback(() => {
    setNotified(true);
    storage.setJSON(NOTIFY_KEY, true);
  }, []);

  const saveVet = useCallback(() => {
    const next: PreferredVet = { name: vetName.trim(), phone: vetPhone.trim() };
    if (!next.name && !next.phone) return;
    setVet(next);
    storage.setJSON(VET_KEY, next);
  }, [vetName, vetPhone]);

  const callVet = useCallback(() => {
    if (vet?.phone) Linking.openURL(`tel:${vet.phone.replace(/[^0-9+]/g, "")}`).catch(() => {});
  }, [vet]);

  const findEmergency = useCallback(() => {
    Linking.openURL("https://www.google.com/maps/search/emergency+vet+near+me").catch(() => {});
  }, []);

  const findHolistic = useCallback(() => {
    Linking.openURL(
      "https://www.google.com/maps/search/holistic+integrative+veterinarian+near+me"
    ).catch(() => {});
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

        {/* Holistic / integrative intro when arriving from an integrative plan */}
        {isHolistic && !isUrgent ? (
          <View style={styles.holisticCard}>
            <Leaf size={18} color={Colors.teal700} />
            <Text style={styles.holisticText}>
              Integrative and holistic vets blend conventional medicine with nutrition, herbs, and
              lifestyle care. Look for an accredited practitioner to review any natural support plan.
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
            label="Find a holistic / integrative vet"
            icon={<Leaf size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={findHolistic}
          />
          <PrimaryButton
            label="Build a vet-ready report"
            icon={<Stethoscope size={18} color={Colors.teal800} />}
            variant="outline"
            onPress={() => router.replace("/vet-report")}
          />
          <Pressable
            onPress={onNotify}
            style={({ pressed }) => [styles.notify, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Notify me when telehealth is live"
          >
            <Bell size={16} color={Colors.teal700} />
            <Text style={styles.notifyText}>
              {notified ? "Thanks — we'll let you know when it's live" : "Notify me when telehealth is live"}
            </Text>
          </Pressable>
        </Card>

        {/* Preferred vet (saved locally) */}
        <Card style={{ gap: 12, marginTop: Space.md }}>
          <Text style={styles.cardTitle}>Your preferred vet</Text>
          {vet ? (
            <>
              <View style={styles.savedVet}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedVetName}>{vet.name || "Saved contact"}</Text>
                  {vet.phone ? <Text style={styles.savedVetPhone}>{vet.phone}</Text> : null}
                </View>
                {vet.phone ? (
                  <Pressable onPress={callVet} style={styles.callBtn} accessibilityRole="button" accessibilityLabel={`Call ${vet.name || "your vet"}`}>
                    <PhoneCall size={16} color="#fff" />
                    <Text style={styles.callText}>Call</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={() => setVet(null)} accessibilityRole="button" accessibilityLabel="Edit preferred vet">
                <Text style={styles.editLink}>Edit contact</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Save your vet&apos;s details for one-tap calling — kept on this device.</Text>
              <TextInput
                value={vetName}
                onChangeText={setVetName}
                placeholder="Vet or clinic name"
                placeholderTextColor={Colors.inkFaint}
                style={styles.input}
              />
              <TextInput
                value={vetPhone}
                onChangeText={setVetPhone}
                placeholder="Phone number"
                placeholderTextColor={Colors.inkFaint}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <PrimaryButton
                label="Save preferred vet"
                icon={<Check size={18} color="#fff" />}
                variant="primary"
                onPress={saveVet}
              />
            </>
          )}
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
  holisticCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginBottom: Space.md,
  },
  holisticText: { ...Fonts.small, color: Colors.teal800, flex: 1, lineHeight: 19 },
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
  hint: { ...Fonts.small, color: Colors.inkFaint, lineHeight: 18 },
  input: {
    backgroundColor: Colors.cream,
    borderRadius: Radius.md,
    padding: Space.md,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  savedVet: { flexDirection: "row", alignItems: "center", gap: 12 },
  savedVetName: { ...Fonts.h3, fontSize: 15 },
  savedVetPhone: { ...Fonts.small, color: Colors.inkSoft, marginTop: 2 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.teal700,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  callText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  editLink: { ...Fonts.small, color: Colors.teal700, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
  notify: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  notifyText: { ...Fonts.small, color: Colors.teal700 },
  disclaimer: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.lg, lineHeight: 18 },
});
