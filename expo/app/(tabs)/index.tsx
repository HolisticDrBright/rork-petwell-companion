import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Activity,
  Bell,
  Bone,
  Brush,
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  ChevronRight,
  Cookie,
  Droplets,
  Eye,
  FileText,
  Heart,
  HeartPulse,
  Home as HomeIcon,
  Leaf,
  MessageCircleQuestion,
  Pill,
  Plus,
  ShoppingBag,
  Sparkles,
  Syringe,
  Utensils,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniTrend } from "@/components/Charts";
import { NoPetSelected } from "@/components/NoPetSelected";
import { PetSwitcher } from "@/components/PetSwitcher";
import { WeeklyDigestCard } from "@/components/WeeklyDigestCard";
import { scheduleWeeklyDigest } from "@/services/notificationsService";
import { HealthScoreBadge, PatternsPreview } from "@/components/longevitySurfaces";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import Colors, { Fonts, Radius, Space, cardShadow } from "@/constants/colors";
import { computeHealthScore } from "@/lib/health/score";
import { detectPatterns } from "@/lib/integrative/patterns";
import { usePets } from "@/providers/PetProvider";
import type { CareItem, UpcomingItem } from "@/types/pet";

const CARE_ICONS = {
  bowl: Bone,
  pill: Pill,
  activity: Activity,
  tooth: Brush,
  heart: Heart,
  droplet: Droplets,
} as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

type HubEntry = { label: string; sub: string; route: string; Icon: React.ComponentType<{ size?: number; color?: string }> };
const HUB_ITEMS: HubEntry[] = [
  { label: "Health Score", sub: "8 system check-in", route: "/health-score", Icon: HeartPulse },
  { label: "Patterns", sub: "Watch from logs", route: "/patterns", Icon: Eye },
  { label: "Support plans", sub: "Food-first protocols", route: "/protocols", Icon: Leaf },
  { label: "Meal planner", sub: "Condition meals", route: "/meal-planner", Icon: Utensils },
  { label: "Treat audit", sub: "Check any treat", route: "/treat-audit", Icon: Cookie },
  { label: "Home check", sub: "Environment", route: "/environment", Icon: HomeIcon },
  { label: "Programs", sub: "7/14/30-day", route: "/programs", Icon: CalendarCheck },
  { label: "Trusted picks", sub: "No pay-to-rank", route: "/marketplace", Icon: ShoppingBag },
];

const CareRow = memo(function CareRow({
  item,
  onToggle,
}: {
  item: CareItem;
  onToggle: () => void;
}) {
  const Icon = CARE_ICONS[item.icon];
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.done }}
      accessibilityLabel={item.label}
      style={({ pressed }) => [styles.careRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.careIcon, item.done && styles.careIconDone]}>
        <Icon size={18} color={item.done ? "#fff" : Colors.teal700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.careLabel, item.done && styles.careLabelDone]}>{item.label}</Text>
        {item.detail ? <Text style={Fonts.small}>{item.detail}</Text> : null}
      </View>
      <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
        {item.done ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
});

const UPCOMING_ICON = {
  vaccine: Syringe,
  appointment: Calendar,
  refill: Pill,
} as const;

const UpcomingRow = memo(function UpcomingRow({ item }: { item: UpcomingItem }) {
  const Icon = UPCOMING_ICON[item.type];
  return (
    <View style={styles.upRow}>
      <View style={styles.upIcon}>
        <Icon size={17} color={Colors.teal700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={Fonts.h3}>{item.label}</Text>
        <Text style={Fonts.small}>{item.detail}</Text>
      </View>
      <Text style={styles.upDate}>{item.date}</Text>
    </View>
  );
});

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedPet, careItems, toggleCareItem, smartInsight, trends, timeline, upcoming, onboarded, isLoading, todayIso } =
    usePets();
  const [fabOpen, setFabOpen] = useState<boolean>(false);

  const patterns = useMemo(
    () => (selectedPet ? detectPatterns(selectedPet, timeline) : []),
    [selectedPet, timeline],
  );

  useEffect(() => {
    if (!isLoading && !onboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, onboarded, router]);

  // Keep the Sunday weekly-digest check-in scheduled (no-op without permission).
  useEffect(() => {
    if (selectedPet) scheduleWeeklyDigest(selectedPet.name).catch(() => {});
  }, [selectedPet]);

  const remaining = useMemo(() => careItems.filter((c) => !c.done).length, [careItems]);

  const onToggle = useCallback(
    (id: string) => {
      if (!selectedPet) return;
      if (Platform.OS !== "web") Haptics.selectionAsync();
      toggleCareItem(selectedPet.id, id);
    },
    [selectedPet, toggleCareItem]
  );

  const fabAction = useCallback(
    (route: string) => {
      setFabOpen(false);
      router.push(route as never);
    },
    [router]
  );

  if (!selectedPet) return <NoPetSelected />;
  const healthScore = computeHealthScore(selectedPet, timeline, trends);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <PetSwitcher onAddPet={() => router.push("/add-pet")} />
          <Pressable
            onPress={() => router.push("/reminders")}
            accessibilityRole="button"
            accessibilityLabel="Reminders"
            style={styles.bellBtn}
            hitSlop={8}
          >
            <Bell size={22} color={Colors.teal800} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <View style={styles.greetWrap}>
          <Text style={styles.greet}>{greeting()}.</Text>
          <Text style={styles.greetSub}>
            {selectedPet.name} has{" "}
            <Text style={{ color: Colors.coral600 }}>
              {remaining} care item{remaining === 1 ? "" : "s"}
            </Text>{" "}
            today.
          </Text>
        </View>

        {/* Health status card */}
        <Card style={styles.statusCard}>
          <Pressable
            onPress={() => router.push("/health-score")}
            accessibilityRole="button"
            accessibilityLabel="Open Petwell Health Score"
            style={({ pressed }) => [styles.statusTop, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.heartWrap}>
              <Heart size={20} color={Colors.green600} fill={Colors.green100} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={Fonts.tiny}>HEALTH STATUS · TAP FOR SCORE</Text>
              <Text style={styles.statusBig}>{selectedPet.statusNote}</Text>
            </View>
            <HealthScoreBadge overall={healthScore.overall} band={healthScore.band} />
            <ChevronRight size={20} color={Colors.inkFaint} />
          </Pressable>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: Colors.green600 }]} />
            <Text style={styles.statusText}>
              <Text style={styles.statusKey}>Recent change · </Text>
              {selectedPet.recentChange}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: Colors.amber500 }]} />
            <Text style={styles.statusText}>
              <Text style={styles.statusKey}>Risk watch · </Text>
              {selectedPet.riskWatch}
            </Text>
          </View>
        </Card>

        {/* Patterns to watch (from real logs) */}
        {patterns.length > 0 ? (
          <View style={styles.section}>
            <PatternsPreview
              patterns={patterns}
              onSeeAll={() => router.push("/patterns")}
              onOpen={() => router.push("/patterns")}
            />
          </View>
        ) : null}

        {/* Daily care checklist */}
        <View style={styles.section}>
          <SectionTitle title="Today's care" />
          <Card style={{ gap: 2 }}>
            {careItems.length === 0 ? (
              <EmptyState
                icon={<Heart size={22} color={Colors.teal700} />}
                title="No care items yet"
                subtitle={`Daily care reminders for ${selectedPet.name} will show up here.`}
              />
            ) : remaining === 0 ? (
              <View style={styles.allDone}>
                <View style={styles.allDoneIcon}>
                  <Check size={16} color="#fff" strokeWidth={3} />
                </View>
                <Text style={styles.allDoneText}>All caught up — nice work today! 🎉</Text>
              </View>
            ) : null}
            {careItems.map((item, i) => (
              <View key={item.id}>
                {i > 0 ? <View style={styles.rowDivider} /> : null}
                <CareRow item={item} onToggle={() => onToggle(item.id)} />
              </View>
            ))}
          </Card>
        </View>

        {/* Weekly digest + streak (honest counts of what was logged) */}
        <View style={styles.section}>
          <WeeklyDigestCard timeline={timeline} todayIso={todayIso} petName={selectedPet.name} />
        </View>

        {/* Smart insight */}
        <View style={styles.section}>
          <Card style={styles.insightCard}>
            <View style={styles.insightHead}>
              <View style={styles.sparkWrap}>
                <Sparkles size={16} color={Colors.teal700} />
              </View>
              <Text style={styles.insightTitle}>Smart insight</Text>
            </View>
            <Text style={styles.insightBody}>{smartInsight}</Text>
          </Card>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <SectionTitle title="Quick actions" />
          <View style={styles.quickGrid}>
            <QuickAction
              label="Ask a symptom"
              icon={<MessageCircleQuestion size={22} color={Colors.teal700} />}
              onPress={() => router.push("/ask")}
            />
            <QuickAction
              label="Scan a photo"
              icon={<Camera size={22} color={Colors.teal700} />}
              onPress={() => router.push("/scan")}
            />
            <QuickAction
              label="Log food"
              icon={<Bone size={22} color={Colors.teal700} />}
              onPress={() => router.push({ pathname: "/log", params: { type: "food" } })}
            />
            <QuickAction
              label="Vet report"
              icon={<FileText size={22} color={Colors.teal700} />}
              onPress={() => router.push("/vet-report")}
            />
          </View>
        </View>

        {/* Integrative / longevity hub */}
        <View style={styles.section}>
          <SectionTitle title="Integrative care" />
          <View style={styles.hubGrid}>
            {HUB_ITEMS.map((h) => (
              <HubItem key={h.route} item={h} onPress={() => router.push(h.route as never)} />
            ))}
          </View>
        </View>

        {/* Mini trend strip */}
        <View style={styles.section}>
          <SectionTitle title="Trends" action="See timeline" onAction={() => router.push("/timeline")} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: Space.md }}
            style={{ marginHorizontal: -Space.md }}
          >
            <MiniTrend label="appetite" values={trends.appetite} color={Colors.teal600} />
            <MiniTrend label="stool" values={trends.stool} color={Colors.green600} />
            <MiniTrend label="itching" values={trends.itching} color={Colors.amber600} />
            <MiniTrend label="activity" values={trends.activity} color={Colors.coral500} />
            <MiniTrend label="weight" values={trends.weight} unit=" lb" color={Colors.teal800} />
          </ScrollView>
        </View>

        {/* Upcoming */}
        <View style={styles.section}>
          <SectionTitle title="Upcoming" action="Records" onAction={() => router.push("/records")} />
          <Card style={{ gap: 0 }}>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<Calendar size={22} color={Colors.teal700} />}
                title="Nothing upcoming"
                subtitle="Vaccines, refills and appointments will appear here as you add records."
              />
            ) : (
              upcoming.map((item, i) => (
                <View key={item.id}>
                  {i > 0 ? <View style={styles.rowDivider} /> : null}
                  <UpcomingRow item={item} />
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>

      {/* Floating quick-action button */}
      {fabOpen ? (
        <Pressable style={styles.fabBackdrop} onPress={() => setFabOpen(false)}>
          <View style={[styles.fabMenu, { bottom: insets.bottom + 150 }]}>
            <FabItem label="Log" icon={<Bone size={18} color={Colors.teal700} />} onPress={() => fabAction("/log")} />
            <FabItem label="Scan" icon={<Camera size={18} color={Colors.teal700} />} onPress={() => fabAction("/scan")} />
            <FabItem label="Ask" icon={<MessageCircleQuestion size={18} color={Colors.teal700} />} onPress={() => fabAction("/ask")} />
          </View>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setFabOpen((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? "Close quick actions" : "Quick actions: log, scan, or ask"}
        accessibilityState={{ expanded: fabOpen }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 90 },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        {fabOpen ? <X size={26} color="#fff" /> : <Plus size={26} color="#fff" />}
        {!fabOpen ? <Text style={styles.fabLabel}>Log / Scan / Ask</Text> : null}
      </Pressable>
    </View>
  );
}

const QuickAction = memo(function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
});

const HubItem = memo(function HubItem({ item, onPress }: { item: HubEntry; onPress: () => void }) {
  const { Icon } = item;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      style={({ pressed }) => [styles.hubItem, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
    >
      <View style={styles.hubIcon}>
        <Icon size={20} color={Colors.teal700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.hubLabel}>{item.label}</Text>
        <Text style={styles.hubSub}>{item.sub}</Text>
      </View>
    </Pressable>
  );
});

const FabItem = memo(function FabItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fabItem, pressed && { opacity: 0.85 }]}>
      <Text style={styles.fabItemLabel}>{label}</Text>
      <View style={styles.fabItemIcon}>{icon}</View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    paddingHorizontal: Space.md,
    marginBottom: Space.md,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  bellDot: {
    position: "absolute",
    top: 12,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.coral500,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  greetWrap: { paddingHorizontal: Space.md, marginBottom: Space.md },
  greet: { ...Fonts.hero },
  greetSub: { ...Fonts.body, fontSize: 17, color: Colors.inkSoft, marginTop: 2 },
  section: { marginTop: Space.lg, paddingHorizontal: Space.md },
  statusCard: { marginHorizontal: Space.md, gap: Space.sm },
  statusTop: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  heartWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.green100,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBig: { ...Fonts.title, color: Colors.green600 },
  statusDivider: { height: 1, backgroundColor: Colors.hairline, marginVertical: 2 },
  statusItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  statusText: { ...Fonts.body, flex: 1, lineHeight: 21, color: Colors.inkSoft },
  statusKey: { fontWeight: "800", color: Colors.ink },
  careRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 11 },
  careIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  careIconDone: { backgroundColor: Colors.teal600 },
  careLabel: { ...Fonts.h3 },
  careLabelDone: { textDecorationLine: "line-through", color: Colors.inkFaint },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: Colors.teal600, borderColor: Colors.teal600 },
  rowDivider: { height: 1, backgroundColor: Colors.hairline },
  allDone: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 2 },
  allDoneIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.green600,
    alignItems: "center",
    justifyContent: "center",
  },
  allDoneText: { ...Fonts.h3, fontSize: 14.5, color: Colors.green600 },
  insightCard: { backgroundColor: Colors.teal900, gap: Space.sm },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sparkWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.teal100,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: { fontSize: 14, fontWeight: "800", color: Colors.teal100, letterSpacing: 0.3 },
  insightBody: { fontSize: 15.5, lineHeight: 23, color: "#fff", fontWeight: "500" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  quickItem: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...cardShadow,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { ...Fonts.h3, flex: 1, fontSize: 14.5 },
  hubGrid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  hubItem: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...cardShadow,
  },
  hubIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.teal50,
    alignItems: "center",
    justifyContent: "center",
  },
  hubLabel: { ...Fonts.h3, fontSize: 14 },
  hubSub: { ...Fonts.tiny, color: Colors.inkFaint, marginTop: 1 },
  upRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 12 },
  upIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cream2,
    alignItems: "center",
    justifyContent: "center",
  },
  upDate: { ...Fonts.small, color: Colors.teal700, fontWeight: "800" },
  fab: {
    position: "absolute",
    right: Space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.coral500,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 28,
    shadowColor: Colors.coral600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
  fabBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(20,30,30,0.25)" },
  fabMenu: { position: "absolute", right: Space.md, gap: 10, alignItems: "flex-end" },
  fabItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  fabItemLabel: {
    backgroundColor: Colors.ink,
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  fabItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
});
