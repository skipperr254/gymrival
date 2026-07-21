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
  accentRing: "rgba(230, 48, 48, 0.15)",

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

  // Secondary accent — friend-vs-friend challenges (Compete tab), distinct
  // from the primary red accent used for admin/global challenges.
  friend: "#4a9eff",
} as const;

/**
 * Deterministic initials-avatar background palette (Google-style: one flat,
 * solid color per user, white monogram on top). A spread of distinct hues —
 * not the old red-only family — so users are easy to tell apart at a glance.
 * Each color is a mid-tone, saturated shade that reads well on the near-black
 * app background and keeps white text above ~3:1 contrast. getAvatarColor() in
 * components/ui/Avatar.tsx hashes the user id to a stop here, so a user's color
 * is stable for the life of their account regardless of name changes.
 */
export const AvatarPalette = [
  "#e03131", // red
  "#e8590c", // orange
  "#2b8a3e", // green
  "#099268", // teal
  "#0c8599", // cyan
  "#1971c2", // blue
  "#3b5bdb", // indigo
  "#6741d9", // violet
  "#9c36b5", // grape
  "#c2255c", // pink
] as const;

/** Gold / silver / bronze, shared by every leaderboard-style ranking row. */
export const MedalColors = ["#d4a017", "#909090", "#a0522d"] as const;

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
