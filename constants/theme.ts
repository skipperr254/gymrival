/**
 * Single source of truth for all design tokens.
 * Use these in StyleSheet contexts where NativeWind classes cannot be applied.
 * Never hardcode hex values in components — always import from here.
 */

export const Colors = {
  // Backgrounds
  base: "#141414",
  surface: "#1e1e1e",
  elevated: "#2a2a2a",

  // Accent
  accent: "#e63030",
  accentDark: "#b01010",

  // Text
  primary: "#ffffff",
  secondary: "#b0b0b0",
  muted: "#555555",
  hint: "#404040",

  // Borders
  borderDefault: "#2a2a2a",
  borderSubtle: "#1e1e1e",

  // Semantic
  success: "#00cc44",
  warning: "#ffaa00",
  danger: "#e63030",
} as const;

export const Fonts = {
  display: "BebasNeue_400Regular",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
} as const;

export const Radius = {
  card: 16,
  button: 16,
  pill: 9999,
  input: 12,
} as const;

export const Spacing = {
  screenPadding: 16,
  cardPadding: 16,
  cardGap: 12,
  sectionGap: 24,
  tabBarHeight: 80,
} as const;

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
} as const;
