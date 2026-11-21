import React, { useRef } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type ScrollViewProps,
} from "react-native";

const FIELD_GAP = 12;

export function FormScrollView({ onFocus, onScroll, ...props }: ScrollViewProps) {
  const scrollView = useRef<ScrollView>(null);
  const scrollY = useRef(0);

  return (
    <ScrollView
      ref={scrollView}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      scrollEventThrottle={16}
      {...props}
      onScroll={(event) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (Platform.OS !== "ios" || !Keyboard.isVisible()) return;

        // Native insets handle keyboard movement. Focus can also move between
        // fields while the keyboard stays in place.
        const field = TextInput.State.currentlyFocusedInput();
        field?.measureInWindow((_x, y, _width, height) => {
          if (TextInput.State.currentlyFocusedInput() !== field) return;
          const keyboardTop = Keyboard.metrics()?.screenY;
          if (keyboardTop === undefined) return;
          const overlap = y + height + FIELD_GAP - keyboardTop;
          if (overlap > 0) scrollView.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
        });
      }}
    />
  );
}
