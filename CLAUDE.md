# GymRival

A React Native + Expo fitness competition app. Users log PRs with video proof, compete on leaderboards and challenges, share a social feed, chat with friends, check in at the gym, and track nutrition. Freemium, with a Pro subscription.

Write clean, simple code that is easy to read and extend. Build working features and don't over-engineer them. Ask before adding a major library or making an architectural decision this file doesn't cover.

## Stack

Expo SDK 54 (managed) · Expo Router 6 · TypeScript strict · NativeWind v5 preview + Tailwind v4 · Zustand · Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions) · i18next · RevenueCat · lucide-react-native icons.

- Expo's APIs changed in SDK 54. Check https://docs.expo.dev/versions/v54.0.0/ rather than relying on memory.
- NativeWind v5 is configured in CSS (`global.css` `@theme`). There is no `tailwind.config.js`. Use v5 APIs only, and don't upgrade it without approval.
- Run `npx expo lint` and `npx tsc --noEmit` after every change, and fix every error and warning.

## Layout

```
app/
  _layout.tsx        root: auth gate, i18n init, push registration + tap routing, PaywallProvider
  (auth)/            splash, onboarding, sign-in/up, verify, setup, forgot/reset password
  (tabs)/            compete.tsx, social.tsx, train.tsx, profile.tsx (one file per tab) + _layout (tab bar, FAB sheets)
  (stack)/           every drill-down, pushed over the tabs: challenge/[id], chat/[userId], friends,
                     messages, checkin, nutrition-goals, edit-profile, pr-history, badges, settings, …
components/ui/       shared primitives
components/features/<feature>/   feature components (compete, social/*, train, logpr, nutrition, paywall, progress, profile)
lib/api/<domain>.ts  Supabase queries/mutations, re-exported from lib/api/index.ts
lib/billing/         billing adapter (see Monetization)
store/               one Zustand store per domain
types/               domain types
constants/           theme.ts, routes.ts, images.ts, entitlements.ts
locales/<lang>/<namespace>.json
supabase/migrations/, supabase/functions/
```

- **Screens compose; they don't contain.** Files in `app/` call stores and hooks, handle navigation, and render components. Large UI blocks and modal/sheet definitions belong in `components/features/<feature>/`.
- Treat **~400 lines** as a ceiling for any file. If you go past it, extract.
- Only create a component when it's reused or it clearly makes a screen easier to read.
- **Every Supabase query, mutation, RPC and `functions.invoke` lives in `lib/api/<domain>.ts`.** Screens and components never touch `supabase`. Stores may own realtime channels and `supabase.auth` calls, but fetch data through `lib/api`.
- Global state lives in Zustand, one store per domain. Chat (`useChatStore`) is separate from `useSocialStore`. Temporary UI state uses `useState`.
- Define domain types in `types/`. Avoid `any`: use `unknown` and narrow it.
- Use the `@/` path alias for imports.

## Scope

**Shipped:** auth (email/password only, no OAuth). Compete tab with Rivals / Challenges / Global segments, plus admin challenge management for `profiles.role = 'admin'`. Social tab with feed, friends, messages and realtime chat. Train tab with Schedule / Check-in / Progress / Nutrition segments. Profile, PR logging + video proof, push notifications, 7 languages incl. RTL Arabic, and Pro.

**Not in scope. Don't build or scaffold these:** AI coach, body scan / progress photos, weight log, Workout of the Day, the old "program/schema" concept (Schedule replaced it), deep links / URL-scheme routing (push tap-to-route in `app/_layout.tsx` already exists and is a different thing), metric⇄imperial units, third-party food database or barcode scanning.

**Product rules:**
- The FAB opens a sheet with exactly three actions: **Log a PR**, **Gym Check-in**, **Log a Meal**. Don't add more.
- Badges (`(stack)/badges.tsx`) is static mock data. It isn't backed by the DB.
- Nutrition targets come from Mifflin-St Jeor over profile fields, and the user can override them via `profiles.target_*`. Nutrition is not part of XP or leaderboards.

## Design & styling

- Style with NativeWind `className`; ScrollView/FlatList content padding uses `contentContainerClassName`. Fall back to `style`/`StyleSheet` only for things className can't reach: `SafeAreaView`, `Modal`, third-party components (`LinearGradient`, `expo-image`, `VideoView`, icons), Animated values and transforms, runtime-computed values, platform-specific shadows, and `Pressable` style functions. To give a third-party component className support, wrap it with NativeWind's `styled()` in `components/ui/` (see `KeyboardAwareScrollView.tsx`).
- **Never hardcode a color.** Tokens live in `global.css` `@theme` (for classNames) and `constants/theme.ts` `Colors` (for props like an icon's `color`). Keep the two in sync. If you need a new color, add a token to both.
  - Greys between the semantic tokens use the `ink-950…ink-200` ramp (`text-ink-600`, `Colors.ink600`). Pick the nearest step instead of inventing a grey.
  - For translucency, use the opacity modifier in className (`bg-accent/10`) and `withAlpha(Colors.accent, 0.1)` in JS. Never use raw `rgba()` or hex-alpha suffixes.
  - Gradient stops come from `Gradients`, macro colors from `MacroColors`, and rank colors from `MedalColors`.
- Fonts: Bebas Neue (`font-display`/`font-heading`) for headings, labels, numbers and all-caps UI. DM Sans (`font-body*`) for body text and inputs.
- The look is dark, bold and high-contrast, with red accents and rounded dark cards. Use skeleton loaders rather than spinners, touch targets of at least 44px, and press feedback on everything interactive.
- Scrollable screens need bottom padding (`pb-24`) so the tab bar doesn't hide content.
- **Keyboard:** Android runs edge-to-edge, so RN's `KeyboardAvoidingView` under-measures. Use `react-native-keyboard-controller`: `KeyboardAwareScrollView` from `@/components/ui/KeyboardAwareScrollView` for forms, the library's `KeyboardAvoidingView` otherwise. Inside an RN `<Modal>` sheet, use `hooks/useKeyboardOverlap`.
- When a design reference is given, match it exactly: layout, spacing, sizes, hierarchy, radius.
- Route strings come from `constants/routes.ts` and images from `constants/images.ts`. Never inline them.
- **iOS modals:** never present two RN `<Modal>`s at once. UIKit silently drops the second one and leaves an invisible view that swallows touches. Sequence them so the next modal opens only after the first has fully closed (see the comment in `app/(tabs)/_layout.tsx`).

## Internationalization

Languages: en, nl, es, de, pt, fr, ar (RTL). All are complete.

- **All user-facing copy goes through `t()`**: text, placeholders, alerts, composed errors. ESLint (`i18next/no-literal-string`) flags slips. Brand wordmarks ("GYMRIVAL") are the only exception.
- Each feature area has one namespace per file. When you add a key, add it to **all seven** language folders (`__tests__/locales.test.ts` fails otherwise). A new feature gets its own namespace.
- Module-level constants (tab configs, option lists) store the key path and resolve it with `t()` at render time. Non-component helpers use `i18n.t()` from `@/lib/i18n`.
- Format dates and numbers with `lib/i18n/format.ts` only. Never call `toLocale*` or hardcode a locale.
- RTL: RN mirrors layout automatically, so never write `flex-row-reverse` or per-language branches. Directional icons (chevrons, arrows) need `style={rtlIconFlip}` from `lib/i18n/rtl.ts`.
- Language switching persists the choice and then reboots via `reloadAppAsync()`. Don't add an in-place `changeLanguage` flow.
- DB content:
  - Static reference rows (e.g. `exercise_types`) are translated via their `key` column in `locales/*/exercises.json`. Exercise names go through `exerciseLabel()` (`lib/i18n/exercises.ts`) where rows are loaded in `lib/api`; never render the DB `label` directly.
  - Friend-challenge titles are rebuilt per viewer with `friendChallengeTitle()`; the stored title is in the creator's language.
  - Admin-authored challenges use `challenge_translations`.
  - Notifications store stable keys in `data` (e.g. `exercise_key`), never rendered text.
- Push notifications are composed **server-side** in the recipient's language. A trigger on `notifications` calls the `send-notification` edge function. Don't add a client-side send wrapper. The edge function keeps its own copy of notification and exercise strings, so update it by hand when `notifications.json` or `exercises.json` changes.
- No bare `'` in JSX text (lint error): write `{"Don't"}` or `&apos;`.

## Supabase

- Use one client, from `lib/supabase.ts`. It's typed by `types/supabase.ts`, which is generated. **Regenerate it after every migration** (Supabase MCP `generate_typescript_types`). Never hand-edit it.
- Type query rows from the query itself (`QueryData<typeof query>`) or with `RpcRow<'fn'>` from `lib/api/rows.ts`. Don't use `any`. The generator marks RPC output columns and NULL-able function arguments as non-null, so keep `?? null` guards in mappers.
- **Every schema change is a migration** in `supabase/migrations/`, numbered sequentially (`NNN_description.sql`). Check the highest number first and don't reuse one. 046 is already duplicated.
- RLS is on for every table, and policies live in migrations. Never disable RLS.
- **Column-level UPDATE grants are the auth boundary** on `profiles` and `challenge_participants`. Never grant table-level UPDATE. When you add a client-writable column, grant it explicitly (see migration 024, 042).
- Storage uploads with `upsert: true` also need a SELECT policy on `storage.objects`.
- Realtime subscriptions are set up in a `useEffect` and always cleaned up.
- Profile rows are created by a DB trigger on sign-up, never by the client. Let supabase-js persist the session.
- Secrets live only in edge functions. Nothing secret goes in the app bundle.

## Monetization

Free tier plus Pro, through RevenueCat behind a swappable adapter. iOS first: Android stays on the no-op adapter until `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is set. Rollout status: `docs/pro-rollout-tracker.md`.

Rules:
1. **`profiles.is_pro` is server-owned.** The trigger that mirrors `public.subscriptions` is its only writer. Never grant client UPDATE on it.
2. **`public.subscriptions` is the source of truth.** It's written only by the service role (`revenuecat-webhook`, `billing-reconcile`). `billing_events` is the webhook's idempotency ledger.
3. **Read Pro state with `useEntitlement()`**, never `profile.is_pro`.
4. **Gate by name** with `useProGate('<feature>')`, using features declared in `constants/entitlements.ts`. Never check a boolean inline.
5. **Every gate lands twice:** server-side (RLS or an RPC check) plus a client lock that taps through to the paywall. A patched client must gain nothing.
6. **Only `lib/billing/revenuecat.ts` imports the billing SDK** (ESLint enforces this). No vendor types leak out of it. Don't use `react-native-purchases-ui`. Prices come from the offering, never hardcoded.
7. **Never gate Nutrition, Schedule, Check-in or Progress.** Not even a nag.
8. **The paywall mounts once**, via `PaywallProvider` in the root layout. Open it with `showPaywall({ trigger })` from `lib/billing/paywall.ts`, always passing a trigger.

To test Pro locally: the Profile Pro card toggles a `__DEV__`-only client override. For server-enforced gates, insert a `provider: 'manual'` row into `subscriptions`. Webhooks never overwrite manual rows, so delete the row before you test real purchases.

## Build traps

- **Don't remove** the `postinstall` `scripts/patch-supabase.js`. Without it, Hermes release builds break.
- `.env.local` is **not** read by EAS builds. Every `EXPO_PUBLIC_*` var (Supabase, RevenueCat) must also be set as an EAS environment variable.
- The Hermes Intl polyfills must load in order: Locale → PluralRules → RelativeTimeFormat.
- iOS builds use App Store Connect API-key auth. The Apple ID has no dev team.
