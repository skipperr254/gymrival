# GymRival

You are an expert React Native + Expo engineer helping build a production-quality fitness competition app.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction because this codebase is built feature by feature and must remain easy to read and extend.

Think like a senior mobile developer. Build practical, working features. Avoid over-engineering.

---

## Project Overview

GymRival is a mobile fitness app where users log PRs (personal records), compete on leaderboards with friends, share activity in a social feed, and stay accountable with gym check-ins and challenges.

v1 core features:

- PR logging with leaderboard rankings (friends + global)
- PR video proof
- Weekly and monthly challenges
- Social feed (PR posts, likes, friend activity)
- Friends system and in-app chat
- Gym check-ins with weekly streak tracking
- Push notifications
- Onboarding, sign up, and sign in flows

---

## v1 Scope

This section is the single source of truth for what is and is not in the v1 client preview build. Do not implement or scaffold anything in the "Deferred" list.

### In v1

- **Auth**: onboarding, sign-in, sign-up, email verify, profile setup, forgot password, reset password — all implemented
- **Compete tab**: Rivals (friends) leaderboard, Challenges, Global leaderboard as three segmented tabs inside a single `compete/index.tsx` screen (not separate routes), plus a drill-down `compete/challenge/[id].tsx` detail screen — all implemented and working
- **Social tab**: Feed (`social/index.tsx`, default), Friends (`social/friends.tsx` — real, not a stub: friends list, requests, search all wired to `useSocialStore`), Messages inbox (`social/messages.tsx`) + Chat (`social/chat/[userId].tsx`) — all implemented, including realtime presence and message delivery via `useChatStore`
- **Train tab**: `train/index.tsx` is a segmented screen with **Schedule**, **Check-in**, and **Progress**. Gym Check-in *also* has its own dedicated route, `train/checkin.tsx` (used when the FAB's "Gym Check-in" action navigates there directly) — both surfaces render the same `CheckInView` component. All three segments implemented and in scope for v1.
- **Profile tab**: Profile, Edit, PR history, Badges, Notifications, Language (`profile/language.tsx`) — all implemented. Note: **Badges is currently static/mock data** (`BADGES` array hardcoded in `badges.tsx`), not yet wired to a real earned-badge backend — don't assume badge state is dynamic or DB-backed unless you're the one wiring it up. The Profile screen's Pro/Upgrade toggle is a **dev-only mock**: `handleTogglePro` flips `profiles.is_pro` directly with no payment flow behind it (see Stripe note below).
- **PR logging + PR video proof** — fully implemented (record/pick video, upload to `pr-videos` bucket, inline playback in feed + PR history)
- **Push notifications** — fully implemented: token registration, realtime in-app notification list (`useNotificationStore`, paginated), and tap-to-route handling in `app/_layout.tsx` (a push tap routes to the relevant screen, e.g. Messages inbox or Social tab; see the "Deep links" deferred note below for how this differs from URL-based deep linking)
- **FAB (center Log button)**: exactly **two** actions — **Log a PR** and **Gym Check-in**. Nothing else. Do not add Log Meal, Log Weight, or any other action.

### Deferred — not in v1, do not scaffold

- AI Coach (the `ai-coach` edge function does not exist; do not create it or any UI for it)
- Macros / calorie tracking
- Body scan / progress photos
- Weight log
- Workout of the Day (WOD)
- The old "schema" / program concept (superseded by the Schedule feature)
- Stripe / in-app payments for Pro tier — `profiles.is_pro` exists and the Profile screen has a working toggle button, but it's a dev/demo mock (`setProStatus` just flips the column); no Stripe integration, paywall, or purchase flow exists. Do not treat the toggle's presence as evidence payments are implemented.
- Admin dashboard
- Deep links — no external URL scheme routing (e.g. `gymrival://pr/123` opened from outside the app) or share-link handling exists. Don't confuse this with the push-notification tap-to-route logic in `app/_layout.tsx`, which is a separate, narrower thing that's already built (routes an opened push to a screen, not an arbitrary URL to a screen).
- App Store / Play Store submission config (`eas.json` has `development`/`preview`/`production` build profiles but only a stub `submit.production`)

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
| Auth              | Supabase Auth (email/password only — no OAuth yet)  |
| Database          | Supabase (Postgres + Row Level Security)            |
| Realtime          | Supabase Realtime (leaderboard, chat)               |
| Storage           | Supabase Storage (profile photos, PR video)         |
| Backend functions | Supabase Edge Functions                             |
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
      verify.tsx
      setup.tsx
      forgot-password.tsx
      reset-password.tsx
    (tabs)/                   # Main authenticated tab navigator
      _layout.tsx              # Tab bar + FAB LogSheet + LogPRSheet
      compete/
        index.tsx             # Rivals / Challenges / Global — one screen, segmented tabs (not separate routes)
        challenge/[id].tsx    # Challenge detail drill-down
      social/
        index.tsx             # Feed (default)
        friends.tsx           # Friends list, requests, search — fully real
        messages.tsx          # Conversation inbox
        chat/[userId].tsx     # 1:1 chat thread
      train/
        index.tsx             # Segmented screen: Schedule | Check-in | Progress
        checkin.tsx           # Dedicated Check-in route (opened by the FAB)
      profile/
        index.tsx
        edit.tsx
        pr-history.tsx
        badges.tsx            # NOTE: static/mock badge data, not DB-backed yet
        notifications.tsx
        language.tsx
    _layout.tsx               # Root layout (auth gate, push registration + tap routing, i18n init)
  components/
    ui/                       # Primitives used across the app (Button, Card, Avatar, LogSheet, CustomTabBar, ...)
    features/                 # Feature-specific components, grouped by tab/feature
      compete/                # RivalsContent, ChallengesContent, GlobalContent, ChallengeCard, ...
      logpr/                  # LogPRSheet + its Step1/Step2/Step3
      profile/                # Row helpers used by profile screens
      progress/                # ProgressView, ProgressStats, charts, heatmap (Train > Progress segment)
      social/
        feed/                 # FeedPostCard, FeedVideo, FeedSkeleton, ...
        friends/               # FriendsList, FriendsSearch, FriendRequests
        chat/                  # MessageList, ChatAvatar
      train/                  # ScheduleList, WorkoutDetail, CreateWorkoutSheet
      CheckInView.tsx         # Shared by train/index.tsx (Check-in segment) and train/checkin.tsx
      VideoUploadZone.tsx     # PR video proof capture/upload UI
  constants/
    theme.ts                  # All design tokens
    images.ts                 # Centralised image imports
    routes.ts                 # Route path constants
  hooks/                      # Custom React hooks (e.g. useProgress)
  lib/                        # External service helpers
    supabase.ts
    api/                      # Supabase service layer, split by domain (profile, pr, feed, chat, friends,
                               #   leaderboard, challenges, notifications, exercises), re-exported via api/index.ts
    i18n/                      # i18next setup, language list, date/number formatters, language detector
    media/                     # Video asset picking (pickVideoAsset.ts) for PR video proof
    checkin.ts, train.ts, progress.ts, secureStorage.ts
  store/                      # Zustand stores
  types/                      # TypeScript interfaces and enums
  supabase/
    migrations/               # SQL migration files (36+ and growing — RLS hardening, realtime, XP triggers, etc.)
    functions/                # Edge Functions
      send-notification/
        index.ts
  __tests__/                  # Jest unit tests (still thin — see "Tech-debt paydown status" below)
  assets/
    images/
    fonts/
```

### Directory rules

**`app/`** — Screens and layouts only. Screens compose components, call hooks and stores, and handle navigation. No large UI blocks or business logic inline.

**`components/`** — Create a component only when it is reused in multiple places, it makes a screen significantly easier to read, or it represents a clear UI concept like `PRCard`, `LeaderboardRow`, `ChallengeCard`, or `BottomSheet`. Do not extract one-off UI too early. When unsure, ask: _should this be a component, or stay inline for now?_ In practice, `components/features/` is organized into one subfolder per tab/feature (`compete/`, `social/feed/`, `social/friends/`, `social/chat/`, `train/`, `logpr/`, `progress/`, `profile/`) — follow that grouping for new components rather than dropping files flat into `features/`.

**`constants/theme.ts`** — Single source of truth for all design tokens. Every color, font size, spacing value, and border radius used in the app must come from here. Never hardcode a color hex value in a component.

**`lib/`** — Helpers for Supabase, API calls, and other external services. Never expose secret keys here or anywhere in the mobile app bundle. The Supabase service layer lives in `lib/api/`, split into one file per domain and re-exported from `lib/api/index.ts` — add new query/mutation functions to the relevant domain file (or create a new one) rather than growing a single flat `api.ts`.

**`store/`** — Zustand stores only. One store per domain (auth, compete, social, chat, train, profile, notifications). Chat is its own store (`useChatStore`) separate from `useSocialStore`, even though both back the Social tab.

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

### Existing StyleSheet tech debt

The codebase currently has a large `StyleSheet.create` footprint that predates the NativeWind-first rule. That existing code is known tech debt earmarked for a dedicated migration pass — **do not fix it now**. For all **new** code, follow the NativeWind-first rule and the exceptions table above. Do not add new `StyleSheet` blocks where NativeWind would work.

---

## Code Quality Rules

### Screen files must compose, not contain

Screen files in `app/` are composition roots. They call hooks and stores, handle navigation, and render extracted components. They must not contain:

- Large inline UI blocks
- Multiple modal or bottom-sheet definitions
- Several sub-features implemented inline in one file

### File size guideline

If a screen or component file exceeds **~400 lines**, that is a signal to extract sub-components into `components/features/` (feature-specific) or `components/ui/` (reusable primitives). New files should not be written past this limit without a stated reason.

### Tech-debt paydown status

The screen files that used to badly violate the guideline above (`compete/index.tsx`, `social/index.tsx`, `LogPRSheet.tsx`, `train/index.tsx`) have already been through a dedicated refactor pass — they're now composition roots backed by extracted components (see the `components/features/` subfolders above) and all sit at or under ~415 lines. The largest files in the app today are `compete/challenge/[id].tsx` (~415 lines) and `profile/index.tsx` (~400 lines) — treat ~400 lines as a real ceiling to watch for, not a formality. A parallel NativeWind migration (StyleSheet → className for all new/touched code) is also done; a handful of files still use `StyleSheet.create` for the documented exceptions (SafeAreaView, Modal, Animated, etc. — see the exceptions table above), which is expected, not debt.

Remaining known gap: test coverage. `__tests__/` exists (Jest) but only covers `challenge.test.ts` and `format.test.ts` — most of the app has no automated tests yet.

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
  (auth)/              # Stack: splash → onboarding → sign-in / sign-up / verify / setup
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

The Log FAB opens a bottom sheet with exactly **two** actions: **Log a PR** and **Gym Check-in**. It does not navigate to a new route — it presents a sheet over the current screen. Do not add any other actions (Log Meal, Log Weight, etc.).

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
| `useSocialStore`       | Feed posts, friends list, friend requests, feed realtime |
| `useChatStore`         | Conversations, messages, presence heartbeat, chat realtime |
| `useTrainStore`        | Workout state, check-ins, streak, active schedule        |
| `useProfileStore`      | Profile data, best PRs, PR history (XP/level/streak live on `profile`, not tracked separately) |
| `useNotificationStore` | Notification list (paginated), unread count, realtime subscription |

Persist with AsyncStorage only where the data should survive an app restart (e.g. streak, selected exercise filter, onboarding completed flag).

---

## TypeScript Rules

Use TypeScript strictly. Set `"strict": true` in `tsconfig.json`.

Avoid `any`. If a type is genuinely unknown, use `unknown` and narrow it.

Define all domain types in `types/`. Keep types simple and readable.

Key type files:

```
types/
  user.ts          # Profile (includes xp, level, streak, is_pro)
  pr.ts
  challenge.ts
  compete.ts        # Leaderboard-specific types (Compete tab)
  social.ts
  train.ts          # (not workout.ts — Schedule/Check-in/Progress live here)
  progress.ts
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

Profile photos and PR video uploads go to Supabase Storage. Generate signed URLs server-side when the bucket is private.

---

## Edge Functions

Use Supabase Edge Functions for any operation that requires a secret or calls a third-party API.

Current functions:

| Function            | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `send-notification` | Triggers Expo push notifications for events (new PR, challenge, like, friend request) |

### Calling Edge Functions from the app

For a function the client needs to call directly, use the Supabase client's `functions.invoke()` method, wrapped in the relevant `lib/api/<domain>.ts` file so screens never call `functions.invoke` directly:

```ts
// lib/api/<domain>.ts
export async function someEdgeFunctionCall(payload: SomePayload) {
  const { data, error } = await supabase.functions.invoke("some-function", {
    body: payload,
  });
  if (error) throw error;
  return data;
}
```

`send-notification` specifically is **not** called this way — there is no client-side wrapper for it. It's invoked server-side by an `AFTER INSERT` trigger on the `notifications` table (via `pg_net`, see migration `028_push_notification_webhook.sql`), so the push composes using the *recipient's* stored language rather than whatever language the client that caused the notification happens to be running in. Do not add a client-side `sendNotification()`/`sendPushNotification()` wrapper — see the Internationalization section below for the full rationale.

---

## Authentication Rules

Use Supabase Auth for all authentication. Do not build custom auth.

Support:

- Email/password sign up and sign in

OAuth (Apple, Google) is **not implemented** — there's no `expo-auth-session` dependency and no OAuth code path in `useAuthStore` or the sign-in/sign-up screens, despite earlier plans to add it. Treat it as a future addition, not existing functionality; don't assume OAuth buttons or handlers exist anywhere in the auth flow.

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

## PR Video Proof

PR video proof is **in v1**. Users record or upload a short video clip when logging a PR. The flow uses Expo ImagePicker for selection, uploads to the `pr-videos` Supabase Storage bucket, and displays the video inline in the feed and PR history.

Do not conflate this with a full "replay / highlight" feature — the v1 scope is proof-of-PR video only.

---

## Internationalization (i18n) Rules

The app is fully internationalized via `i18next` + `react-i18next` + `expo-localization`. Every screen across all four tabs, the Auth flow, and the Log-a-PR flow is translated. Supported languages: **English, Dutch, Spanish, German, Portuguese, French, Arabic** — all seven have complete, real translations (no stubs remaining) across every namespace. Arabic content is translated but the layout is not yet mirrored for RTL — see "Arabic / RTL" below.

### The rule: never hardcode user-facing copy

Every string a user sees — `<Text>` content, `placeholder`, `Alert` titles/messages, error copy you compose yourself — must go through `t()`. This applies as you write new JSX, not as a cleanup pass afterward. An ESLint warning (`i18next/no-literal-string`, see `eslint.config.js`) flags new hardcoded JSX text and attributes to catch slips.

Exception: brand wordmarks ("GYM"/"RIVAL"/"GYMRIVAL") are never translated.

### Namespaces

Translation files live in `locales/<code>/<namespace>.json` (`code` = `en`, `nl`, `es`, `de`, `pt`, `fr`, `ar`). One namespace file per feature area, mirroring the `app/(tabs)/<tab>` structure: `auth.json` (the whole `(auth)` stack), `common.json` (tab bar, shared settings/chart strings), `profile.json`, `train.json`, `progress.json`, `social.json` (feed/friends/messages/chat), `compete.json` (rivals/challenges/global), `logpr.json` (the Log-a-PR sheet + video upload), `notifications.json`, `exercises.json`. When you build a new feature, add its own namespace file (in all seven language folders) rather than dumping keys into an existing namespace.

Use `useTranslation('namespaceName')` in a screen/component and call `t('key.path')`, or use a fully-qualified `t('namespace:key.path')` when you need a namespace other than the hook's default (e.g. resolving exercise names via `t('exercises:' + key)`). For module-level constants that back JSX (tab configs, option lists) that can't call hooks, store the i18n **key path** on the object and resolve it with `t()` at render time inside the component — see `TABS`/`METRIC_OPTIONS`/`GLOBAL_STAT_BOXES` in `compete/index.tsx` for the pattern. For plain helper functions that aren't components (e.g. `metricLabel()`/`endsInLabel()` in `types/challenge.ts`), import the default `i18n` instance from `@/lib/i18n` and call `i18n.t(...)` directly instead of the `useTranslation` hook.

### Adding a new language

Registering a language is a content-only change with zero code changes:
1. Add an entry to `LANGUAGES` in `lib/i18n/languages.ts` with `available: false` until it's translated.
2. Add `locales/<code>/*.json` for every existing namespace (start from the English files).
3. Flip `available: true` once translated — it then appears in the in-app language picker (Profile → Language).

### Dates and numbers

Never call `toLocaleDateString`, `toLocaleString`, or hardcode a locale like `'en-US'`. Use the helpers in `lib/i18n/format.ts` (`formatDate`, `formatMonthYear`, `formatNumber`, `formatCompactNumber`, `formatRelativeTime`, `formatRelativeDay`) — they read the current i18next language at call time so they stay correct after a runtime language switch.

### Database content

Two different patterns depending on what the content is:
- **Static reference data** (e.g. `exercise_types`) — the DB row's stable `key` column is the i18n key. Add the display name to `locales/*/exercises.json` keyed by that `key`; don't add translation columns to the table itself.
- **Admin-authored dynamic content** (e.g. challenge titles/descriptions) — needs a real per-locale table, like `challenge_translations` (migration `026_challenge_translations.sql`). The base column stays the original-authored-language text; a translation row overrides it for a given locale, with the base column as fallback when no translation exists. This only covers admin-created challenges — friend-vs-friend challenge titles are the creator's own free text and are never machine-translated, same as a chat message.
- **Notification history**: never freeze translated/rendered text into a `notifications.data` JSONB column — store the stable key (e.g. `exercise_key`, not `exercise_label`) and resolve the display text client-side at render time, so old notifications render correctly in whatever language the viewer is currently using (see migration `027_notification_exercise_key.sql` for why this matters).

### Language detection & persistence

`lib/i18n/languageDetector.ts` resolves the active language in this order: an explicit choice cached in AsyncStorage → the device's locale (`expo-localization`) mapped to the nearest supported language → English. Once a signed-in user explicitly picks a language in Settings, it's also written to `profiles.language` and becomes the cross-device source of truth (synced in `app/_layout.tsx`); `NULL` means "keep following the device."

### Push notifications (server-side, locale-aware)

Push notifications are triggered entirely server-side: an `AFTER INSERT` trigger on `notifications` (`tr_notifications_push`, migration `028_push_notification_webhook.sql`) calls the `send-notification` edge function via `pg_net`, which composes the push title/body using the **recipient's** `profiles.language` — not the actor's. This is deliberate: the action that causes a notification (e.g. a PR like) is taken by a different user than the one receiving the push, so client-side composition would always use the wrong person's language. There is no client-side `sendPushNotification()` wrapper for this reason — do not reintroduce one.

The edge function embeds its own copy of the notification templates and exercise names (`supabase/functions/send-notification/index.ts`) since Deno edge functions can't import the RN app's `locales/*.json` files directly — keep these two in sync by hand when `notifications.json` or `exercises.json` changes.

The webhook call requires a one-time manual setup (a shared secret in Supabase Vault + a matching edge function secret) documented at the top of migration `028`; until that's done, the trigger silently no-ops rather than failing.

### Arabic / RTL (deferred)

Arabic has complete, real translations across every namespace and is selectable in the language picker today — but the app's layout is not RTL-aware (no `I18nManager.forceRTL`, no mirrored `flex-row`/icons/text-alignment). Selecting Arabic renders correct Arabic text in a left-to-right layout. Full RTL layout support is a deliberately separate, larger follow-up piece (it touches nearly every screen's layout, not just text) — do not attempt to bolt it on piecemeal; treat it as its own project.

### Explicitly out of scope

Unit conversion (metric ⇄ imperial) is not part of this i18n work — `weight_kg`/`height_cm` stay metric-only regardless of language. This would be a separate feature (a unit-system preference threaded through PR logging, leaderboards, and profile display), not a translation concern.

---

## Linting and Validation

Run after every feature:

```bash
npx expo lint
npx tsc --noEmit
```

Fix all errors and warnings before considering a feature complete.

### JSX apostrophe rule

Never use a bare `'` inside JSX text content — the linter flags it as an unescaped entity. Use one of these instead:

```tsx
// Wrong
<Text>Don't stop</Text>
<Text>You're next</Text>

// Correct — string expression
<Text>{"Don't stop"}</Text>

// Correct — HTML entity
<Text>You&apos;re next</Text>
```

Apply this rule as you write JSX, not as a cleanup pass at the end.

---

## Communication Style

Be concise. After implementing a feature, briefly explain:

- What was built
- Which files were created or changed
- How to test it

---

## Security Constraints

- Never put API keys, secrets, or service role keys in the mobile app bundle
- All third-party API calls go through Supabase Edge Functions
- All Supabase tables have RLS enabled
- Use Supabase Auth — do not roll custom auth

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
