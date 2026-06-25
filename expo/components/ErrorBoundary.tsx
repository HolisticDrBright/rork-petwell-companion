import { Heart, RotateCcw } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors, { Fonts, Radius, Space } from "@/constants/colors";

/**
 * Global error boundary. Catches render-time crashes anywhere in the tree and
 * shows a calm, recoverable fallback instead of a white screen — and a place to
 * forward the error to crash reporting later.
 */
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Surface for logs now; wire a crash reporter (e.g. Sentry) here later.
    console.error("[petwell] uncaught UI error:", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return <Fallback onReset={this.reset} />;
  }
}

function Fallback({ onReset }: { onReset: () => void }) {
  return (
      <View style={styles.container}>
        <View style={styles.icon}>
          <Heart size={30} color={Colors.teal700} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Petwell hit an unexpected error and paused this screen. Your saved data is safe. Try again, and if it keeps
          happening, restart the app.
        </Text>
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <RotateCcw size={18} color="#fff" />
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, alignItems: "center", justifyContent: "center", padding: Space.xl, gap: 14 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.teal50, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { ...Fonts.title, fontSize: 22, textAlign: "center" },
  body: { ...Fonts.bodySoft, textAlign: "center", lineHeight: 22, maxWidth: 320 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.teal800,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: Radius.md,
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
