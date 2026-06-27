import { Stack, useRouter } from "expo-router";
import {
  Bell,
  Bluetooth,
  ChevronRight,
  CreditCard,
  Crown,
  Database,
  Download,
  FileText,
  FlaskConical,
  ImageOff,
  Lock,
  Mail,
  PawPrint,
  RefreshCw,
  ScrollText,
  Shield,
  Sparkles,
  Trash2,
  UserCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Card } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { isCurrentUserAdmin } from "@/lib/backend";
import { AI_DATA_NOTICE, DEFAULT_AI_PREFS, getAiPreferences, setAiPreferences, type AiPreferences } from "@/lib/ai/config";
import { exportJson } from "@/lib/report/export";
import { usePets } from "@/providers/PetProvider";
import { useSubscription } from "@/providers/SubscriptionProvider";
import { DEFAULT_PRIVACY, privacyService, type PrivacyKey, type PrivacyPrefs } from "@/services";
import { aiService } from "@/services/aiService";

interface Toggle {
  key: PrivacyKey;
  label: string;
  detail: string;
}

const PERMISSIONS: Toggle[] = [
  { key: "store_photos", label: "Store scan photos in the cloud", detail: "Turn off to keep photos on this device only." },
  { key: "personalized_insights", label: "Use my logs for personalized insights", detail: "Powers trends and correlations for your pets." },
  { key: "training_opt_out", label: "Opt out of photo & model training", detail: "We never use your pet's photos or data to train models." },
  { key: "share_research", label: "Share anonymized data for research", detail: "Off by default. Helps improve pet-health insights." },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { selectedPet, timeline, mode, authEmail, isAuthenticated, canUseAuth, loadDemoProfile } = usePets();
  const { isPro, isSupported, manageSubscription, restore } = useSubscription();

  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<"images" | "account" | "aiHistory" | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [aiPrefs, setAiPrefs] = useState<AiPreferences>(DEFAULT_AI_PREFS);

  useEffect(() => {
    let active = true;
    isCurrentUserAdmin()
      .then((v) => {
        if (active) setIsAdmin(v);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const onRestore = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const out = await restore();
      if (out.ok && out.isPro) setStatus("Purchases restored — Petwell Pro is active.");
      else if (out.ok) setStatus("No previous purchases found to restore.");
      else setStatus(out.error ?? "Couldn't restore purchases.");
    } finally {
      setBusy(false);
    }
  }, [restore]);

  useEffect(() => {
    let active = true;
    privacyService
      .getPrefs()
      .then((p) => {
        if (active) setPrefs(p);
      })
      .catch(() => {});
    getAiPreferences()
      .then((p) => {
        if (active) setAiPrefs(p);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleAi = useCallback(
    (key: keyof AiPreferences) => {
      setAiPrefs((prev) => {
        // Turning the master switch off also disables document processing.
        const next: AiPreferences =
          key === "enabled" && prev.enabled
            ? { enabled: false, allowDocumentProcessing: false }
            : { ...prev, [key]: !prev[key] };
        setAiPreferences(next).catch(() => {});
        return next;
      });
    },
    [],
  );

  const onTryDemo = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    const ok = await loadDemoProfile();
    setBusy(false);
    setStatus(ok ? "Demo profile loaded — sample pets added (labeled DEMO)." : "Couldn't load a demo profile right now.");
  }, [loadDemoProfile]);

  const onDeleteAiHistory = useCallback(async () => {
    setBusy(true);
    const r = await aiService.deleteAllAiHistory();
    setBusy(false);
    setConfirm(null);
    setStatus(r.ok ? "AI history deleted." : "Couldn't delete AI history — try again.");
  }, []);

  const togglePref = useCallback(
    (key: PrivacyKey) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        privacyService.setPref(key, next[key]).catch((e) => console.warn("[petwell] pref save failed:", e));
        return next;
      });
    },
    []
  );

  const onExportAll = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const payload =
        mode === "remote"
          ? await privacyService.exportAll()
          : { app: "Petwell", exportedAt: new Date().toISOString(), mode: "local", pet: selectedPet, timeline };
      const method = await exportJson(payload, "petwell-data-export.json");
      setStatus(method === "download" ? "Your data was downloaded as JSON." : "Your data export was shared.");
    } catch {
      setStatus("Couldn't export right now — please try again.");
    } finally {
      setBusy(false);
    }
  }, [mode, selectedPet, timeline]);

  const onDeleteImages = useCallback(async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const n = await privacyService.deleteScanImages();
      setStatus(n > 0 ? `Deleted ${n} stored scan image${n === 1 ? "" : "s"}.` : "No stored scan images to delete.");
    } catch {
      setStatus("Couldn't delete images — please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onDeleteAccount = useCallback(async () => {
    setConfirm(null);
    setBusy(true);
    try {
      await privacyService.deleteAccountData();
      router.replace("/onboarding");
    } catch {
      setStatus("Couldn't delete account data — please try again.");
      setBusy(false);
    }
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Settings & privacy" }} />

      {/* Premium banner — export does NOT require this */}
      <Pressable onPress={() => router.push("/premium")} style={({ pressed }) => [styles.premiumBanner, pressed && { opacity: 0.92 }]}>
        <View style={styles.crownWrap}>
          <Crown size={22} color={Colors.amber500} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.premiumTitle}>{isPro ? "Petwell Pro active" : "Petwell Pro"}</Text>
          <Text style={styles.premiumSub}>
            {isPro ? "Thanks for supporting Petwell" : "Unlimited scans, correlations & more"}
          </Text>
        </View>
        <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <View style={styles.promise}>
        <Shield size={18} color={Colors.teal700} />
        <Text style={styles.promiseText}>
          Your pet&apos;s data belongs to you. We never sell pet photos or health data, and export is
          always free — no subscription required.
        </Text>
      </View>

      {/* Account */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Account</Text>
        <Card style={{ gap: 0 }}>
          <Pressable
            onPress={() => router.push("/account")}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={isAuthenticated ? "Account settings" : "Create account or sign in"}
          >
            <UserCircle size={19} color={Colors.teal700} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>
                {isAuthenticated ? "Account" : canUseAuth ? "Create account or sign in" : "Account (offline)"}
              </Text>
              <Text style={styles.rowDetail}>
                {isAuthenticated
                  ? `Signed in as ${authEmail}`
                  : canUseAuth
                    ? "Back up and sync your pets across devices"
                    : "Running in local mode on this device"}
              </Text>
            </View>
            <ChevronRight size={17} color={Colors.inkFaint} />
          </Pressable>
        </Card>
      </View>

      {/* Subscription — RevenueCat (hidden on web where purchases aren't supported) */}
      {isSupported ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Subscription</Text>
          <Card style={{ gap: 0 }}>
            <ActionRow
              icon={CreditCard}
              label={isPro ? "Manage subscription" : "See Petwell Pro plans"}
              onPress={isPro ? () => { void manageSubscription(); } : () => router.push("/premium")}
            />
            <View style={styles.divider} />
            <ActionRow icon={RefreshCw} label="Restore purchases" onPress={() => { void onRestore(); }} />
          </Card>
        </View>
      ) : null}

      {/* Data permissions */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Data permissions</Text>
        <Card style={{ gap: 0 }}>
          {PERMISSIONS.map((t, i) => (
            <View key={t.key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowDetail}>{t.detail}</Text>
                </View>
                <Switch
                  value={prefs[t.key]}
                  onValueChange={() => togglePref(t.key)}
                  trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </Card>
      </View>

      {/* AI features */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>AI</Text>
        <Card style={{ gap: 0 }}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Enable AI features</Text>
              <Text style={styles.rowDetail}>Assistant chat, explanations, label reading, and record summaries. Off by default.</Text>
            </View>
            <Switch
              value={aiPrefs.enabled}
              onValueChange={() => toggleAi("enabled")}
              trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Allow AI to process my documents</Text>
              <Text style={styles.rowDetail}>Needed to summarize uploaded records and read food labels with AI.</Text>
            </View>
            <Switch
              value={aiPrefs.allowDocumentProcessing}
              onValueChange={() => toggleAi("allowDocumentProcessing")}
              disabled={!aiPrefs.enabled}
              trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          {confirm === "aiHistory" ? (
            <ConfirmRow text="Delete all AI chats & history?" onConfirm={onDeleteAiHistory} onCancel={() => setConfirm(null)} />
          ) : (
            <ActionRow icon={Trash2} label="Delete AI history" onPress={() => setConfirm("aiHistory")} danger />
          )}
          <Text style={styles.aiNotice}>{AI_DATA_NOTICE}</Text>
        </Card>
      </View>

      {/* Your data */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Your data</Text>
        <Card style={{ gap: 0 }}>
          <ActionRow icon={Download} label="Export all my data" onPress={onExportAll} />
          <View style={styles.divider} />
          <ActionRow icon={FileText} label="Build a vet-ready report" onPress={() => router.push("/vet-report")} />
          <View style={styles.divider} />
          {confirm === "images" ? (
            <ConfirmRow
              text="Delete all stored scan images?"
              onConfirm={onDeleteImages}
              onCancel={() => setConfirm(null)}
            />
          ) : (
            <ActionRow icon={ImageOff} label="Delete stored scan images" onPress={() => setConfirm("images")} danger />
          )}
          <View style={styles.divider} />
          <ActionRow icon={Lock} label="Privacy policy" onPress={() => router.push("/privacy-policy")} />
          <View style={styles.divider} />
          <ActionRow icon={ScrollText} label="Terms of use" onPress={() => router.push("/terms")} />
          <View style={styles.divider} />
          <ActionRow icon={FlaskConical} label="How we score food" onPress={() => router.push("/food-trust")} />
        </Card>
      </View>

      {/* Pets & care */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Pets & care</Text>
        <Card style={{ gap: 0 }}>
          <ActionRow icon={PawPrint} label="Manage pets" onPress={() => router.push("/add-pet")} />
          {canUseAuth ? (
            <>
              <View style={styles.divider} />
              <ActionRow icon={Sparkles} label="Try a demo profile (sample pets)" onPress={onTryDemo} />
            </>
          ) : null}
          <View style={styles.divider} />
          <ActionRow icon={Bell} label="Reminders" onPress={() => router.push("/reminders")} />
          <View style={styles.divider} />
          <ActionRow icon={Bluetooth} label="Connected devices" onPress={() => router.push("/devices")} />
        </Card>
      </View>

      {/* Support */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Support</Text>
        <Card style={{ gap: 0 }}>
          <ActionRow
            icon={Mail}
            label="Contact us"
            onPress={() => Linking.openURL("mailto:support@petwell.app?subject=Petwell%20support").catch(() => {})}
          />
          <View style={styles.divider} />
          <ActionRow icon={Sparkles} label="Talk to a vet" onPress={() => router.push("/telehealth")} />
        </Card>
      </View>

      {/* Admin — only rendered for users with profiles.is_admin (RLS-enforced) */}
      {isAdmin ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Admin</Text>
          <Card style={{ gap: 0 }}>
            <ActionRow icon={Database} label="Data quality & review queue" onPress={() => router.push("/admin")} />
          </Card>
        </View>
      ) : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={Colors.teal700} />
        </View>
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {/* Delete account */}
      {confirm === "account" ? (
        <View style={styles.deleteConfirm}>
          <Text style={styles.deleteConfirmText}>
            This permanently deletes your pets, logs, scans, and reports. This can&apos;t be undone.
          </Text>
          <View style={styles.confirmBtns}>
            <Pressable style={[styles.confirmBtn, styles.confirmCancel]} onPress={() => setConfirm(null)}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.confirmBtn, styles.confirmDelete]} onPress={onDeleteAccount}>
              <Text style={styles.confirmDeleteText}>Delete everything</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.deleteRow} onPress={() => setConfirm("account")}>
          <Trash2 size={18} color={Colors.red600} />
          <Text style={styles.deleteText}>Delete account & data</Text>
        </Pressable>
      )}

      <Text style={styles.version}>Petwell · v1.0.0</Text>
    </ScrollView>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Icon size={19} color={danger ? Colors.red600 : Colors.teal700} />
      <Text style={[styles.rowLabel, danger && { color: Colors.red600 }]}>{label}</Text>
      <ChevronRight size={17} color={Colors.inkFaint} />
    </Pressable>
  );
}

function ConfirmRow({ text, onConfirm, onCancel }: { text: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <View style={styles.inlineConfirm}>
      <Text style={styles.inlineConfirmText}>{text}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={onCancel} hitSlop={8}>
          <Text style={styles.inlineCancel}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onConfirm} hitSlop={8}>
          <Text style={styles.inlineDelete}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.teal800,
    borderRadius: Radius.lg,
    padding: Space.md,
  },
  crownWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  premiumTitle: { ...Fonts.h2, color: "#fff", fontSize: 17 },
  premiumSub: { ...Fonts.small, color: Colors.teal100, marginTop: 1 },
  promise: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.teal50,
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.md,
  },
  promiseText: { ...Fonts.small, color: Colors.teal900, flex: 1, lineHeight: 18 },
  group: { marginTop: Space.lg },
  groupTitle: { ...Fonts.tiny, marginBottom: 8, marginLeft: 4, letterSpacing: 0.8 },
  divider: { height: 1, backgroundColor: Colors.hairline, marginLeft: 46 },
  row: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: Space.sm, paddingVertical: 12 },
  rowLabel: { ...Fonts.h3, flex: 1, fontSize: 15 },
  rowDetail: { ...Fonts.small, color: Colors.inkFaint, marginTop: 2, lineHeight: 17 },
  aiNotice: { ...Fonts.tiny, color: Colors.inkFaint, lineHeight: 15, paddingHorizontal: Space.md, paddingBottom: Space.sm, paddingTop: 4 },
  policyBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Space.md, marginTop: 8 },
  policyText: { ...Fonts.small, color: Colors.inkSoft, lineHeight: 19 },
  inlineConfirm: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 10 },
  inlineConfirmText: { ...Fonts.small, color: Colors.ink, flex: 1, fontWeight: "600" },
  inlineCancel: { ...Fonts.small, color: Colors.inkSoft, fontWeight: "700" },
  inlineDelete: { ...Fonts.small, color: Colors.red600, fontWeight: "800" },
  busy: { alignItems: "center", marginTop: Space.lg },
  status: { ...Fonts.small, color: Colors.teal700, textAlign: "center", marginTop: Space.md, lineHeight: 18 },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: Space.xl, paddingVertical: 12 },
  deleteText: { ...Fonts.h3, color: Colors.red600, fontSize: 15 },
  deleteConfirm: {
    marginTop: Space.xl,
    backgroundColor: Colors.red100,
    borderRadius: Radius.md,
    padding: Space.md,
    gap: 12,
  },
  deleteConfirmText: { ...Fonts.small, color: Colors.red600, lineHeight: 19, fontWeight: "600" },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: "center" },
  confirmCancel: { backgroundColor: Colors.surface },
  confirmCancelText: { ...Fonts.h3, fontSize: 14, color: Colors.ink },
  confirmDelete: { backgroundColor: Colors.red600 },
  confirmDeleteText: { ...Fonts.h3, fontSize: 14, color: "#fff" },
  version: { ...Fonts.small, color: Colors.inkFaint, textAlign: "center", marginTop: Space.md },
});
