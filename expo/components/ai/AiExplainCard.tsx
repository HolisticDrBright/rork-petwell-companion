/**
 * Drop-in "Explain this with AI" card. Sends an already-computed deterministic
 * result to ai-explain and shows a plain-language explanation. The server adds no
 * new conclusions and preserves urgency/disclaimers/evidence status; this card is
 * inert (shows a friendly note) when AI is off.
 */
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";
import { aiService } from "@/services/aiService";
import { AiDisclaimer, AiDisabledNote, AiSafetyBanner, AiSparkleButton } from "./AiBits";

type ExplainFeature = "food_score" | "triage_result" | "toxin_result" | "health_score" | "integrative_plan";

export function AiExplainCard({
  feature,
  result,
  label = "Explain this with AI",
}: {
  feature: ExplainFeature;
  result: unknown;
  label?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setNote(null);
    const res = await aiService.explain({ feature, result });
    setBusy(false);
    if (res.disabled) return setNote(res.disabledReason ?? "AI features are off.");
    if (!res.ok || !res.data) return setNote(res.error ?? "Couldn't generate an explanation. Please try again.");
    setText(res.data.explanation);
    setBanner(res.safety?.banner ?? null);
  }, [feature, result]);

  return (
    <View style={styles.wrap}>
      <AiSparkleButton label={label} onPress={run} loading={busy} />
      {note ? <AiDisabledNote reason={note} /> : null}
      <AiSafetyBanner banner={banner} />
      {text ? (
        <View style={styles.result}>
          <Text style={styles.text}>{text}</Text>
          <AiDisclaimer />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  result: { backgroundColor: Colors.cream2, borderRadius: Radius.md, padding: Space.sm, gap: 4 },
  text: { ...Fonts.small, color: Colors.ink, lineHeight: 19 },
});
