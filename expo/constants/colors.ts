/**
 * Petwell design tokens.
 * Warm, calming, clinically careful palette.
 * Deep teal for trust, coral for action, amber for caution, red for urgent.
 */

const palette = {
  // Brand teal/forest
  teal900: "#0B3D39",
  teal800: "#0E5C57",
  teal700: "#137A72",
  teal600: "#1A998E",
  teal500: "#2DB3A6",
  teal100: "#D6EFEB",
  teal50: "#EAF6F4",

  // Coral / salmon action
  coral600: "#E8654E",
  coral500: "#F4795F",
  coral100: "#FCE3DC",

  // Amber caution
  amber600: "#D99117",
  amber500: "#F0A93B",
  amber100: "#FBEACB",

  // Red urgent
  red600: "#D14343",
  red500: "#E25555",
  red100: "#F8DADA",

  // Greens (positive)
  green600: "#2E9E6B",
  green100: "#D6F0E2",

  // Warm neutrals
  cream: "#FBF7F1",
  cream2: "#F5EFE6",
  surface: "#FFFFFF",
  ink: "#1F2A2A",
  inkSoft: "#54625F",
  inkFaint: "#8A9794",
  hairline: "#ECE5DA",
  shadow: "#1F2A2A",
};

export const Urgency = {
  green: { key: "green", label: "Monitor at home", color: palette.green600, bg: palette.green100 },
  amber: { key: "amber", label: "Book vet soon", color: palette.amber600, bg: palette.amber100 },
  orange: { key: "orange", label: "Same-day vet", color: palette.coral600, bg: palette.coral100 },
  red: { key: "red", label: "Emergency now", color: palette.red600, bg: palette.red100 },
} as const;

export type UrgencyKey = keyof typeof Urgency;

const Colors = {
  ...palette,
  light: {
    text: palette.ink,
    background: palette.cream,
    tint: palette.teal800,
    tabIconDefault: palette.inkFaint,
    tabIconSelected: palette.teal800,
  },
};

export default Colors;

export const Fonts = {
  // System fonts, weight-driven hierarchy
  hero: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.6, color: palette.ink },
  title: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.4, color: palette.ink },
  h2: { fontSize: 19, fontWeight: "700" as const, letterSpacing: -0.2, color: palette.ink },
  h3: { fontSize: 16, fontWeight: "700" as const, color: palette.ink },
  body: { fontSize: 15, fontWeight: "500" as const, color: palette.ink },
  bodySoft: { fontSize: 15, fontWeight: "500" as const, color: palette.inkSoft },
  small: { fontSize: 13, fontWeight: "600" as const, color: palette.inkSoft },
  tiny: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.4, color: palette.inkFaint },
};

export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const Space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

export const cardShadow = {
  shadowColor: palette.shadow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 3,
};

export const softShadow = {
  shadowColor: palette.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
};
