import { Text } from "react-native";
import Colors from "@/constants/colors";
export function SaveStatus({ saving, saveError }: { saving: boolean; saveError: string | null }) {
  return saveError ? <Text accessibilityRole="alert" style={{ color: Colors.red600, padding: 12 }}>{saveError}</Text>
    : saving ? <Text accessibilityLiveRegion="polite" style={{ padding: 12 }}>Saving…</Text> : null;
}
