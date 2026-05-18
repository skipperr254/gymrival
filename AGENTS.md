# GymRival

You are an expert React Native + Expo engineer helping build a production-quality fitness competition app.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction because this codebase is built feature by feature and must remain easy to read and extend.

Think like a senior mobile developer. Build practical, working features. Avoid over-engineering.

---

## Project Overview

GymRival is a mobile fitness app where users log PRs (personal records), compete on leaderboards with friends, track macros and body progress, and get personalised insights from an AI coach.

Core features:

- PR logging with leaderboard rankings (friends + global)
- Weekly and monthly challenges
- Social feed (PR posts, likes, friend activity)
- Friends system and in-app chat
- Workout of the Day and program/schema tracking
- Macro and calorie tracking
- Body scan / progress photo tracking
- Weight log
- AI Coach powered by the Anthropic API (via Supabase Edge Function)
- Push notifications
- Onboarding, sign up, and sign in flows

---

## Tech Stack

| Concern           | Choice                                              |
| ----------------- | --------------------------------------------------- |
| Framework         | Expo (managed workflow)                             |
| Language          | TypeScript (strict)                                 |
| Routing           | Expo Router (file-based)                            |
| Styling           | NativeWind v5 + Tailwind CSS                        |
| State             | Zustand                                             |
| Persistence       | AsyncStorage                                        |
| Auth              | Supabase Auth (email/password + OAuth)              |
| Database          | Supabase (Postgres + Row Level Security)            |
| Realtime          | Supabase Realtime (leaderboard, chat)               |
| Storage           | Supabase Storage (profile photos, future PR video)  |
| Backend functions | Supabase Edge Functions                             |
| AI Coach          | Anthropic API via Supabase Edge Function            |
| Notifications     | Expo Notifications + Supabase Edge Function trigger |

Do not introduce new major libraries without a strong reason. If a new library would significantly simplify an implementation, recommend it, explain why, and ask for approval before adding it.

---

## Monorepo Structure

```
gymrival/
  app/                        # Expo Router screens and layouts
    (auth)/                   # Unauthenticated routes
      _layout.tsx
      splash.tsx
      onboarding.tsx
      sign-in.tsx
      sign-up.tsx
    (tabs)/                   # Main authenticated tab navigator
      _layout.tsx
      compete/
        index.tsx             # Friends leaderboard (default)
        global.tsx
        challenges.tsx
        challenge/[id].tsx
      social/
        index.tsx             # Feed (default)
        friends.tsx
        messages.tsx
        chat/[userId].tsx
      train/
        index.tsx             # Train & Track overview
        wod.tsx
        schema/
          index.tsx
          [id].tsx
        coach.tsx
        checkin.tsx
        macros.tsx
        bodyscan.tsx
        weight.tsx
        progress.tsx
      profile/
        index.tsx
        edit.tsx
        pr-history.tsx
        badges.tsx
    _layout.tsx               # Root layout (auth gate)
  components/
    ui/                       # Primitives used across the app
    features/                 # Feature-specific components
  constants/
    theme.ts                  # All design tokens
    images.ts                 # Centralised image imports
    routes.ts                 # Route path constants
  data/                       # Static/hardcoded content
  hooks/                      # Custom React hooks
  lib/                        # External service helpers
    supabase.ts
    api.ts
  store/                      # Zustand stores
  types/                      # TypeScript interfaces and enums
  supabase/
    migrations/               # SQL migration files
    functions/                # Edge Functions
      ai-coach/
        index.ts
      send-notification/
        index.ts
  assets/
    images/
    fonts/
```

### Directory rules

**`app/`** — Screens and layouts only. Screens compose components, call hooks and stores, and handle navigation. No large UI blocks or business logic inline.

**`components/`** — Create a component only when it is reused in multiple places, it makes a screen significantly easier to read, or it represents a clear UI concept like `PRCard`, `LeaderboardRow`, `MacroRing`, `ChallengeCard`, or `BottomSheet`. Do not extract one-off UI too early. When unsure, ask: _should this be a component, or stay inline for now?_

**`constants/theme.ts`** — Single source of truth for all design tokens. Every color, font size, spacing value, and border radius used in the app must come from here. Never hardcode a color hex value in a component.

**`lib/`** — Helpers for Supabase, API calls, and other external services. Never expose secret keys here or anywhere in the mobile app bundle.

**`store/`** — Zustand stores only. One store per domain (auth, compete, social, train, profile, notifications).

**`supabase/`** — All backend code lives here alongside the app. Migrations go in `migrations/`, Edge Functions in `functions/`.

---

## Design System

### Fonts

The app uses two fonts:

- **Bebas Neue** — headings, labels, scores, numbers, all-caps UI text
- **DM Sans** — body text, inputs, descriptions

Load both via `expo-font` in the root layout. Apply them through NativeWind utilities defined in `global.css`.

### Color Tokens (define in `tailwind.config.js` and `constants/theme.ts`)

```
Background:
  bg-base        #141414   (app background)
  bg-surface     #1e1e1e   (cards, sheets)
  bg-elevated    #2a2a2a   (inputs, secondary surfaces)

Accent:
  accent         #e63030   (primary red — CTAs, active states, PRs)
  accent-dark    #b01010   (gradient endpoint, pressed state)

Text:
  text-primary   #ffffff
  text-secondary #b0b0b0
  text-muted     #555555
  text-hint      #404040

Border:
  border-default #2a2a2a
  border-subtle  #1e1e1e

Semantic:
  success        #00cc44
  warning        #ffaa00
  danger         #e63030   (same as accent in this design)
```

### Spacing and Radius

Use Tailwind's default spacing scale. The app primarily uses:

- Horizontal screen padding: `px-4` (16px)
- Card padding: `p-4` (16px)
- Gap between cards: `gap-3` (12px)
- Card border radius: `rounded-2xl` (16px)
- Button border radius: `rounded-2xl`
- Pill/badge border radius: `rounded-full`

### Bottom Safe Area

Every screen must account for the tab bar height (~80px) and device safe area. Use `pb-24` or a `<BottomSpacer/>` component on scrollable screens so content is never hidden behind the tab bar.

---

## Styling Rules

Use NativeWind (Tailwind CSS) classes for all styling.

Only fall back to `StyleSheet` or inline styles for the scenarios listed below. In all other cases, use NativeWind exclusively.

### StyleSheet / Inline Style Exceptions

| Component / Scenario               | Reason                                  | Use instead                       |
| ---------------------------------- | --------------------------------------- | --------------------------------- |
| `SafeAreaView`                     | `className` not supported               | Inline styles or `StyleSheet`     |
| `KeyboardAvoidingView`             | Behavior props not className-compatible | Inline styles                     |
| `Modal`                            | `visible`, `transparent` props          | Inline styles                     |
| `ScrollView` contentContainerStyle | Not a className prop                    | `StyleSheet`                      |
| `Animated.View`                    | Animated values                         | `StyleSheet` with animated values |
| Dynamic runtime styles             | Calculated at runtime                   | Inline or `StyleSheet.create()`   |
| Platform-specific styles           | iOS/Android divergence                  | Conditional inline                |
| Complex transforms                 | Transform arrays                        | `StyleSheet`                      |
| `Pressable` pressed states         | `style` function prop                   | `StyleSheet`                      |
| iOS/Android shadows                | Different syntax per platform           | `StyleSheet` with platform check  |

### NativeWind Version

Before writing any NativeWind code, check the installed version in `package.json`. Use only the APIs and config patterns supported by that exact version. Do not use patterns from a different version. Do not upgrade NativeWind without explicit approval.

### Global Utilities

Add reusable utility classes to `global.css` using BEM conventions when a pattern appears more than twice. Example: a recurring `card` pattern, a `heading-display` font utility, or a `screen-container` layout utility.

---

## UI Implementation Rules

When a design reference is provided (image or Artifact):

- Match the layout exactly
- Match spacing and padding
- Match font sizes and visual hierarchy
- Match colors using theme tokens — never hardcode
- Match border radius and shadows
- Match alignment and proportions
- Replicate all visible UI elements

Do not approximate. Do not simplify unless explicitly asked.

The app should feel:

- Dark, bold, athletic
- High-contrast with red accents
- Polished and native — not web-like
- Fast, with clear visual feedback on interactions

Use:

- Rounded dark cards on a near-black background
- Bebas Neue for all display text, numbers, and labels
- Clear spacing and large touch targets (minimum 44px)
- Subtle press feedback on all interactive elements
- Skeleton loaders for async content, not spinners where possible

---

## Image Rules

Use centralised image imports.

1. Check if `constants/images.ts` exists.
2. If not, create it.
3. Import and export all image assets from `constants/images.ts`.
4. Use images only through this centralised object.

```ts
// constants/images.ts
import logo from "@/assets/images/logo.png";
import onboardingCompete from "@/assets/images/onboarding-compete.png";

export const images = {
  logo,
  onboardingCompete,
};
```

```tsx
<Image source={images.logo} />
```

Never import image assets directly inside screens or components.

---

## Navigation

The app uses Expo Router with the following top-level structure:

```
app/
  _layout.tsx          # Root layout — checks auth state, redirects to (auth) or (tabs)
  (auth)/              # Stack: splash → onboarding → sign-in / sign-up
  (tabs)/              # Bottom tab navigator: Compete, Social, Train, Profile
```

### Tab Bar

5 tabs with a FAB-style center button:

| Position | Tab        | Route                                |
| -------- | ---------- | ------------------------------------ |
| 1        | Compete 🏆 | `/(tabs)/compete`                    |
| 2        | Social 👥  | `/(tabs)/social`                     |
| 3        | Log (FAB)  | Opens bottom sheet — no route change |
| 4        | Train 🏋️   | `/(tabs)/train`                      |
| 5        | Profile 👤 | `/(tabs)/profile`                    |

The Log FAB opens a bottom sheet modal with options: Log PR, Log Meal, Log Weight, Gym Check-in. It does not navigate to a new route — it presents a sheet over the current screen.

### Route Constants

Define all route strings in `constants/routes.ts`. Never hardcode route strings in components.

```ts
export const Routes = {
  splash: "/(auth)/splash",
  signIn: "/(auth)/sign-in",
  compete: "/(tabs)/compete",
  challengeDetail: (id: string) => `/(tabs)/compete/challenge/${id}`,
  // etc.
} as const;
```

### Drill-Down Navigation

Screens within a tab use stack navigation (Expo Router nested layout). The tab bar remains visible during drill-down. Each drill-down screen includes a back button in its header.

---

## State Management

Use Zustand for all global client state. Use local `useState` for temporary UI state (modals open, form values, etc.).

### Store Domains

| Store                  | State it owns                                            |
| ---------------------- | -------------------------------------------------------- |
| `useAuthStore`         | Current user, session, loading state                     |
| `useCompeteStore`      | Selected exercise, leaderboard data, joined challenges   |
| `useSocialStore`       | Feed posts, friends list, friend requests, conversations |
| `useTrainStore`        | Workout state, check-ins, streak, active schema          |
| `useTrackStore`        | Meals, weight log, body scan entries, macro goals        |
| `useProfileStore`      | Profile data, PRs, badges, XP, level                     |
| `useNotificationStore` | Notification list, unread count                          |

Persist with AsyncStorage only where the data should survive an app restart (e.g. streak, selected exercise filter, onboarding completed flag).

---

## TypeScript Rules

Use TypeScript strictly. Set `"strict": true` in `tsconfig.json`.

Avoid `any`. If a type is genuinely unknown, use `unknown` and narrow it.

Define all domain types in `types/`. Keep types simple and readable.

Key type files:

```
types/
  user.ts
  pr.ts
  challenge.ts
  workout.ts
  meal.ts
  social.ts
  notification.ts
```

Use path aliases. Configure `@/` to resolve to the project root in both `tsconfig.json` and `babel.config.js`.

---

## Supabase Rules

### Client setup

Initialise the Supabase client once in `lib/supabase.ts`. Import it from there everywhere.

Use the Supabase-generated TypeScript types (run `supabase gen types typescript` after each migration). Store the output in `types/supabase.ts`.

### Row Level Security

Every table must have RLS enabled. Write policies in migrations — not in the dashboard manually. Never disable RLS.

### Migrations

All schema changes go in `supabase/migrations/`. Use sequential naming: `001_create_users.sql`, `002_create_prs.sql`, etc. Never modify the database schema outside of migration files.

### Realtime

Use Supabase Realtime for:

- Live leaderboard updates
- Chat messages
- Notification delivery

Subscribe in a `useEffect` inside the relevant hook or screen. Always unsubscribe on unmount.

### Storage

Profile photos and future PR video uploads go to Supabase Storage. Generate signed URLs server-side when the bucket is private.

---

## Edge Functions

Use Supabase Edge Functions for any operation that requires a secret or calls a third-party API.

Current functions:

| Function            | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `ai-coach`          | Calls the Anthropic API and returns a coaching response                               |
| `send-notification` | Triggers Expo push notifications for events (new PR, challenge, like, friend request) |

### AI Coach function rules

- Receive the user's message and relevant context (their PR data, recent activity) in the request body
- Call the Anthropic API server-side
- Return the response to the client
- Never expose the Anthropic API key in the mobile app bundle

### Calling Edge Functions from the app

Use the Supabase client's `functions.invoke()` method. Create a wrapper in `lib/api.ts` for each function call so screens never call `functions.invoke` directly.

```ts
// lib/api.ts
export async function askAICoach(message: string, context: CoachContext) {
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { message, context },
  });
  if (error) throw error;
  return data;
}
```

---

## Authentication Rules

Use Supabase Auth for all authentication. Do not build custom auth.

Support:

- Email/password sign up and sign in
- OAuth (Apple, Google) via Expo AuthSession

On sign up, create a corresponding row in a `profiles` table via a Supabase database trigger — do not do this in the client.

The root layout `app/_layout.tsx` is the auth gate. It listens to `supabase.auth.onAuthStateChange` and redirects to `/(auth)` or `/(tabs)` accordingly.

Store the session in `useAuthStore`. Never store raw tokens in AsyncStorage manually — let the Supabase client handle session persistence.

---

## Feature Implementation Process

When asked to build a feature:

1. Read this file first.
2. Identify all files that need to change.
3. Define or update types in `types/` first.
4. Build the Supabase service layer (query/mutation functions) in `lib/` or as a hook in `hooks/`.
5. Update the relevant Zustand store if global state is involved.
6. Build the UI (screen + components).
7. Wire everything together.
8. Fix all TypeScript and lint errors before finishing.
9. Do not rewrite unrelated code.

---

## PR Video Uploads

Video recording and upload are **deferred to a later version**. Do not implement or scaffold this now. When this feature is built, it will use Expo ImagePicker for selection and Supabase Storage for upload with client-side compression before uploading.

---

## Linting and Validation

Run after every feature:

```bash
npx expo lint
npx tsc --noEmit
```

Fix all errors and warnings before considering a feature complete.

---

## Communication Style

Be concise. After implementing a feature, briefly explain:

- What was built
- Which files were created or changed
- How to test it

---

## Security Constraints

- Never put API keys, secrets, or service role keys in the mobile app bundle
- All third-party API calls (Anthropic, etc.) go through Supabase Edge Functions
- All Supabase tables have RLS enabled
- Use Supabase Auth — do not roll custom auth

---

## Deferred Features (do not implement until explicitly requested)

- PR video recording and upload
- Stripe / in-app payments for Pro tier
- Admin dashboard
- Deep links
- App Store / Play Store submission config

---

## Final Reminder

Before every implementation:

- Read this file
- Follow it strictly
- Build clean, simple, scalable code
- Match the provided UI design exactly when a reference is given
- Ask before adding libraries or making architectural decisions not covered here

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
