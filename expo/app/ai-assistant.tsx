import { Stack, useRouter } from "expo-router";
import { AlertTriangle, FileText, Send, Sparkles } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AiDisclaimer } from "@/components/ai/AiBits";
import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { aiService } from "@/services/aiService";
import { usePets } from "@/providers/PetProvider";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  banner?: string | null;
  contextUsed?: string[];
  suggestedVetReport?: boolean;
}

const GREETING =
  "Hi! I'm Petwell's assistant. I can help you think through what to track at home and what to ask your vet. I can't diagnose or prescribe — for anything urgent, contact your veterinarian. What's on your mind?";

export default function AiAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedPet } = usePets();
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [disabled, setDisabled] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(async () => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    // Instant local safety pre-check so the banner shows immediately.
    const pre = aiService.assessInput(message);
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const res = await aiService.chat({ petId: selectedPet?.id ?? null, threadId, message });
    setBusy(false);
    if (res.disabled) {
      setDisabled(res.disabledReason ?? "AI features are off.");
      setMessages((m) => [...m, { role: "assistant", text: res.disabledReason ?? "AI features are off. Turn them on in Settings → AI." }]);
      return;
    }
    if (!res.ok || !res.data) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.error ?? "Sorry — I couldn't respond just now. Please try again.", banner: pre.banner },
      ]);
      return;
    }
    if (res.data.threadId) setThreadId(res.data.threadId);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text: res.data!.reply,
        banner: res.safety?.banner ?? pre.banner,
        contextUsed: res.data!.contextUsed,
        suggestedVetReport: res.data!.suggestedVetReport,
      },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [input, busy, selectedPet?.id, threadId]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Pet assistant" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: Space.md, paddingBottom: 16 }}>
          <View style={styles.intro}>
            <Sparkles size={16} color={Colors.teal700} />
            <Text style={styles.introText}>
              {selectedPet ? `Chatting about ${selectedPet.name}. ` : ""}Informational only — not veterinary advice.
            </Text>
          </View>

          {messages.map((m, i) => (
            <View key={i} style={[styles.bubbleWrap, m.role === "user" ? styles.rightWrap : styles.leftWrap]}>
              {m.banner ? (
                <View style={styles.banner} accessibilityRole="alert">
                  <AlertTriangle size={16} color={Colors.coral600} />
                  <Text style={styles.bannerText}>{m.banner}</Text>
                </View>
              ) : null}
              <View style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>{m.text}</Text>
              </View>
              {m.contextUsed && m.contextUsed.length > 0 ? (
                <View style={styles.chipRow}>
                  {m.contextUsed.map((c) => (
                    <View key={c} style={styles.chip}>
                      <Text style={styles.chipText}>Used: {c}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {m.suggestedVetReport ? (
                <Pressable style={styles.reportChip} onPress={() => router.push("/vet-report")} accessibilityRole="button">
                  <FileText size={14} color={Colors.teal800} />
                  <Text style={styles.reportChipText}>Create a vet report</Text>
                </Pressable>
              ) : null}
            </View>
          ))}

          {busy ? <ActivityIndicator color={Colors.teal700} style={{ marginTop: 8 }} /> : null}
          <View style={{ marginTop: Space.md }}>
            <AiDisclaimer />
          </View>
        </ScrollView>

        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={disabled ? "AI is off — enable it in Settings → AI" : "Ask about your pet…"}
            placeholderTextColor={Colors.inkFaint}
            editable={!disabled}
            multiline
            style={styles.input}
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={busy || !input.trim() || !!disabled}
            style={[styles.sendBtn, (busy || !input.trim() || !!disabled) && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  intro: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Space.md },
  introText: { ...Fonts.tiny, color: Colors.inkSoft, flex: 1, lineHeight: 15 },
  bubbleWrap: { marginBottom: Space.sm, maxWidth: "92%" },
  leftWrap: { alignSelf: "flex-start" },
  rightWrap: { alignSelf: "flex-end" },
  bubble: { borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  aiBubble: { backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.hairline },
  userBubble: { backgroundColor: Colors.teal700 },
  bubbleText: { ...Fonts.small, color: Colors.ink, lineHeight: 20 },
  banner: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: Colors.coral100, borderRadius: Radius.md, padding: Space.sm, marginBottom: 6 },
  bannerText: { ...Fonts.small, color: Colors.coral600, flex: 1, lineHeight: 18, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { backgroundColor: Colors.teal50, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { ...Fonts.tiny, color: Colors.teal700 },
  reportChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.teal50, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginTop: 8, alignSelf: "flex-start" },
  reportChipText: { ...Fonts.small, color: Colors.teal800, fontWeight: "800" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: Space.md, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.hairline, backgroundColor: Colors.cream },
  input: { flex: 1, ...Fonts.small, color: Colors.ink, maxHeight: 120, borderWidth: 1, borderColor: Colors.hairline, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.teal700, alignItems: "center", justifyContent: "center" },
});
