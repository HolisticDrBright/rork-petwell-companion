import { Stack, useRouter } from "expo-router";
import { ChevronRight, Leaf } from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui";
import { EvidenceBadge, InfoNote, ScreenHeader } from "@/components/integrative";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { CONDITION_TEMPLATES, PROTOCOL_ORDER } from "@/lib/integrative/conditions";
import { getSystem } from "@/lib/integrative/catalog";
import { usePets } from "@/providers/PetProvider";

export default function ProtocolsScreen() {
  const router = useRouter();
  const { selectedPet } = usePets();
  const ordered = useMemo(
    () =>
      PROTOCOL_ORDER.map((id) => CONDITION_TEMPLATES.find((c) => c.id === id)).filter(
        (c): c is (typeof CONDITION_TEMPLATES)[number] => !!c,
      ),
    [],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Natural support library" subtitle="Food-first, vet-safe protocols" />
      <ScrollView contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <InfoNote>
          Each protocol is supportive care — never a treatment for disease. Content is curated from veterinary and
          traditional sources and is not individually vet-reviewed for your pet — confirm with your vet. Options are
          filtered for {selectedPet.name}&apos;s species and safety on the detail page.
        </InfoNote>
        <View style={{ height: Space.md }} />
        {ordered.map((c) => {
          const system = getSystem(c.system);
          return (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: "/protocol-detail", params: { id: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={c.title}
              style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] }]}
            >
              <Card style={styles.row}>
                <View style={styles.iconWrap}>
                  <Leaf size={18} color={Colors.teal700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={Fonts.h3}>{c.title}</Text>
                  <Text style={styles.sub}>{system.label}</Text>
                  {c.whoFor ? (
                    <Text style={styles.who} numberOfLines={2}>
                      {c.whoFor}
                    </Text>
                  ) : null}
                  {c.evidence ? (
                    <View style={{ marginTop: 8 }}>
                      <EvidenceBadge grade={c.evidence} long />
                    </View>
                  ) : null}
                </View>
                <ChevronRight size={20} color={Colors.inkFaint} />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Space.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center" },
  sub: { ...Fonts.small, color: Colors.teal700, marginTop: 1 },
  who: { ...Fonts.small, color: Colors.inkSoft, marginTop: 4, lineHeight: 18 },
  pillRow: { borderRadius: Radius.pill },
});
