import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
  Users,
  Video,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Card, PrimaryButton } from "@/components/ui";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { clearDeletedSession, isCurrentUserAdmin } from "@/lib/backend";
import { config } from "@/lib/config";
import { shouldShowDemoData } from "@/lib/dataMode";
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
  { key: "store_photos", label: "Store scan photos in the cloud", detail: "Turn off to save scan notes without uploading photos. Photo analysis requires this setting." },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const photoSetup = setup === "scan-photo" || setup === "vet-photo";
  const queryClient = useQueryClient();
  const { deviceData, mode, authEmail, isAuthenticated, canUseAuth, loadDemoProfile, clearDeviceData } = usePets();
  const { isPro, isSupported, restore } = useSubscription();
  const storeSubscriptions = Platform.OS === "ios" ? "https://apps.apple.com/account/subscriptions" :
    Platform.OS === "android" ? "https://play.google.com/store/account/subscriptions" : null;

  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [prefsReady, setPrefsReady] = useState(false);
  const [prefsError, setPrefsError] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<"images" | "account" | "aiHistory" | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [aiPrefs, setAiPrefs] = useState<AiPreferences>(DEFAULT_AI_PREFS);
  const [aiPrefsReady, setAiPrefsReady] = useState(false);
  const [savingAiPrefs, setSavingAiPrefs] = useState(false);
  const savingAiPrefsRef = useRef(false);

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
    if (mode !== "remote") return;
    let active = true;
    setPrefsReady(false);
    setPrefsError(false);
    privacyService
      .getPrefs()
      .then((p) => {
        if (active) {
          setPrefs(p);
          setPrefsReady(true);
        }
      })
      .catch(() => { if (active) setPrefsError(true); });
    return () => {
      active = false;
    };
  }, [mode]);

  useEffect(() => {
    let active = true;
    getAiPreferences()
      .then((p) => {
        if (active) {
          setAiPrefs(p);
          setAiPrefsReady(true);
        }
      })
    return () => {
      active = false;
    };
  }, []);

  const toggleAi = useCallback(
    async (key: keyof AiPreferences, value: boolean) => {
      if (!aiPrefsReady || savingAiPrefsRef.current) return;
      savingAiPrefsRef.current = true;
      setSavingAiPrefs(true);
      setStatus(null);
      const next = key === "enabled" && !value
        ? DEFAULT_AI_PREFS
        : { ...aiPrefs, [key]: value };
      try {
        await setAiPreferences(next);
        setAiPrefs(next);
      } catch {
        setStatus("Couldn’t save this AI setting. Please try again.");
      } finally {
        savingAiPrefsRef.current = false;
        setSavingAiPrefs(false);
      }
    },
    [aiPrefs, aiPrefsReady],
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
    async (key: PrivacyKey, value: boolean) => {
      if (busy || mode !== "remote") return;
      setBusy(true);
      setStatus(null);
      try {
        await privacyService.setPref(key, value);
        setPrefs((prev) => ({ ...prev, [key]: value }));
      } catch {
        setStatus("Couldn’t save this privacy setting. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, mode]
  );

  const onExportAll = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const payload =
        mode === "remote"
          ? await privacyService.exportAll()
          : { app: "Petwell", exportedAt: new Date().toISOString(), data: deviceData };
      const method = await exportJson(payload, "petwell-data-export.json");
      if (method === "none") throw new Error("Export failed.");
      setStatus(method === "download" ? "Your data was downloaded as JSON." : "Choose where to save the JSON export in the share sheet.");
    } catch {
      setStatus("Couldn't export right now — please try again.");
    } finally {
      setBusy(false);
    }
  }, [mode, deviceData]);

  const onDeleteImages = useCallback(async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const n = await privacyService.deleteScanImages();
      void queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setStatus(n > 0 ? `Deleted ${n} stored scan image${n === 1 ? "" : "s"}.` : "No stored scan images to delete.");
    } catch {
      setStatus("Couldn't delete images — please try again.");
    } finally {
      setBusy(false);
    }
  }, [queryClient]);

  const onDeleteAccount = useCallback(async () => {
    setConfirm(null);
    setBusy(true);
    try {
      if (mode === "remote" && !accountDeleted) {
        await privacyService.deleteAccountData();
        setAccountDeleted(true);
      }
      await clearDeletedSession();
      await clearDeviceData();
      router.replace("/onboarding");
    } catch {
      setStatus("Deletion did not finish. Please retry to complete account and device cleanup.");
      setBusy(false);
    }
  }, [router, mode, accountDeleted, clearDeviceData]);

  const dataPermissions = (
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
                accessibilityLabel={t.label}
                value={prefs[t.key]}
                onValueChange={(value) => togglePref(t.key, value)}
                disabled={busy || mode !== "remote" || !prefsReady}
                trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ))}
        {prefsError ? <Text accessibilityRole="alert" style={styles.aiNotice}>Couldn’t load cloud photo settings. Reopen Settings to try again.</Text> : null}
      </Card>
    </View>
  );

  const aiPermissions = (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>AI</Text>
      <Card style={{ gap: 0 }}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Enable AI features</Text>
            <Text style={styles.rowDetail}>Assistant chat, explanations, label reading, and record summaries. Off by default.</Text>
          </View>
          <Switch
            accessibilityLabel="Enable AI features"
            value={aiPrefs.enabled}
            onValueChange={(value) => toggleAi("enabled", value)}
            disabled={!aiPrefsReady || savingAiPrefs}
            trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Allow AI to process my documents</Text>
            <Text style={styles.rowDetail}>Required to read pet photos, food-label photos, and vet documents with AI.</Text>
          </View>
          <Switch
            accessibilityLabel="Allow AI to process my documents"
            value={aiPrefs.allowDocumentProcessing}
            onValueChange={(value) => toggleAi("allowDocumentProcessing", value)}
            disabled={!aiPrefs.enabled || !aiPrefsReady || savingAiPrefs}
            trackColor={{ true: Colors.teal600, false: Colors.cream2 }}
            thumbColor="#fff"
          />
        </View>
        {!photoSetup ? (
          <>
            <View style={styles.divider} />
            {confirm === "aiHistory" ? (
              <ConfirmRow text="Delete all AI chats & history?" onConfirm={onDeleteAiHistory} onCancel={() => setConfirm(null)} />
            ) : (
              <ActionRow icon={Trash2} label="Delete AI history" onPress={() => setConfirm("aiHistory")} danger />
            )}
          </>
        ) : null}
        <Text style={styles.aiNotice}>{AI_DATA_NOTICE}</Text>
      </Card>
    </View>
  );

  if (photoSetup) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: Space.md, paddingBottom: 50 }}>
        <Stack.Screen options={{ title: "Photo settings" }} />
        <Card style={{ gap: Space.sm }}>
          <Text style={Fonts.h3}>Set up AI photo reading</Text>
          <Text style={Fonts.body}>
            Turn on Enable AI features, then Allow AI to process my documents.
            {setup === "scan-photo" ? " Make sure Store scan photos in the cloud is on as well." : ""}
          </Text>
          <Text style={Fonts.small}>Return to your photo when you’re ready. Petwell will send it for AI reading only after you tap the read button.</Text>
        </Card>
        {aiPermissions}
        {setup === "scan-photo" ? dataPermissions : null}
        {status ? <Text accessibilityRole="alert" style={styles.status}>{status}</Text> : null}
        <View style={styles.group}>
          <PrimaryButton label="Back to photo" disabled={savingAiPrefs || busy} onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/scan");
          }} />
        </View>
      </ScrollView>
    );
  }

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
            {isPro ? "Thanks for supporting Petwell" : "New Pro subscriptions are paused"}
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
      {storeSubscriptions || isSupported ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Subscription</Text>
          <Card style={{ gap: 0 }}>
            {storeSubscriptions ? <ActionRow
              icon={CreditCard}
              label="Manage or cancel subscription"
              onPress={() => { void Linking.openURL(storeSubscriptions).catch(() => setStatus("Open your store account to manage subscriptions.")); }}
            /> : null}
            {isSupported ? <>
              {storeSubscriptions ? <View style={styles.divider} /> : null}
              <ActionRow icon={RefreshCw} label="Restore purchases" onPress={() => { void onRestore(); }} />
            </> : null}
          </Card>
        </View>
      ) : null}

      {dataPermissions}
      {aiPermissions}

      {/* Your data */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Your data</Text>
        <Card style={{ gap: 0 }}>
          <ActionRow icon={Download} label="Export all my data" onPress={onExportAll} />
          <View style={styles.divider} />
          <ActionRow icon={Download} label="Export this pet’s records" onPress={() => router.push("/export-pet")} />
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
          {canUseAuth && config.demoModeEnabled ? (
            <>
              <View style={styles.divider} />
              <ActionRow icon={Sparkles} label="Try a demo profile (sample pets)" onPress={onTryDemo} />
            </>
          ) : null}
          <View style={styles.divider} />
          <ActionRow icon={Users} label="Care Circle (share this pet)" onPress={() => router.push("/care-circle")} />
          <View style={styles.divider} />
          <ActionRow icon={PawPrint} label="Shared with me / join with a code" onPress={() => router.push("/join-circle")} />
          <View style={styles.divider} />
          <ActionRow icon={Video} label="Vet telehealth (coming soon)" onPress={() => router.push("/telehealth")} />
          <View style={styles.divider} />
          <ActionRow icon={Bell} label="Reminders" onPress={() => router.push("/reminders")} />
          {/* Wearable syncing isn't built yet — the devices screen is a mock
              preview, so it stays out of production builds rather than leading
              someone to toggles that connect to nothing. */}
          {shouldShowDemoData ? (
            <>
              <View style={styles.divider} />
              <ActionRow icon={Bluetooth} label="Connected devices (preview)" onPress={() => router.push("/devices")} />
            </>
          ) : null}
        </Card>
      </View>

      {/* Support */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Support</Text>
        <Card style={{ gap: 0 }}>
          <ActionRow
            icon={Mail}
            label="Contact us"
            onPress={() => Linking.openURL(`mailto:${config.supportEmail}?subject=Petwell%20support`).catch(() => {})}
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
            {mode === 'remote' ? 'This permanently deletes your account, pets, logs, scans, reports, and stored files.' : 'This permanently deletes Petwell data on this device.'} This cannot be undone. Store subscriptions must be canceled separately in Manage subscription.
          </Text>
          <View style={styles.confirmBtns}>
            <Pressable style={[styles.confirmBtn, styles.confirmCancel]} onPress={() => setConfirm(null)}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.confirmBtn, styles.confirmDelete]} onPress={onDeleteAccount} disabled={busy}>
              <Text style={styles.confirmDeleteText}>Delete everything</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.deleteRow} onPress={() => setConfirm("account")}>
          <Trash2 size={18} color={Colors.red600} />
          <Text style={styles.deleteText}>{mode === "remote" ? "Delete account & data" : "Delete device data"}</Text>
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
