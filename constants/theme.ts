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

  // Neutral ramp — the greys between the semantic tokens above.
  // Mirrors the --color-ink-* tokens in global.css.
  ink950: "#111111",
  ink900: "#1a1a1a",
  ink850: "#242424",
  ink800: "#333333",
  ink750: "#3a3a3a",
  ink700: "#484848",
  ink650: "#505050",
  ink600: "#606060",
  ink550: "#707070",
  ink500: "#808080",
  ink450: "#888888",
  ink400: "#909090",
  ink200: "#cccccc",
  black: "#000000",

  // Role colors (mirrors global.css)
  accentLight: "#ff6b6b",
  accentTint: "#241a1a",
  dangerBorder: "#3a1a1a",
  proBg: "#1a0000",
  successDark: "#009933",
  successSoft: "#4caf50",
  successTint: "#0a1f0a",
  successTintBorder: "#1a3a1a",
  successTintStrong: "#0a3a1a",
  gold: "#d4a017",
  orange: "#ff8c00",
  amber: "#e6a030",
  mint: "#00cc88",
} as const;

/**
 * A token at reduced opacity, for JS style props: withAlpha(Colors.accent, 0.1).
 * In className, use Tailwind's modifier instead: bg-accent/10.
 */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** LinearGradient stops. */
export const Gradients = {
  accent: [Colors.accent, Colors.accentLight],
  success: [Colors.success, Colors.successDark],
  proCard: [Colors.proBg, "#2a0a0a"],
  paywallHeader: ["#2a1414", Colors.base],
  feedStat: [Colors.base, "#0d0808"],
} as const;

/** Macro colors — shared by every nutrition surface. */
export const MacroColors = {
  protein: Colors.friend,
  carbs: Colors.warning,
  fat: Colors.success,
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
export const MedalColors = [Colors.gold, Colors.ink400, "#a0522d"] as const;

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
