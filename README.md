# GymRival

A fitness competition app for iOS and Android. Users log PRs with video proof, compete on friend and global leaderboards and in challenges, share a social feed, chat with friends, check in at the gym, and track nutrition. Freemium, with a Pro subscription.

Built with Expo SDK 54 (Expo Router, TypeScript), NativeWind v5, Zustand and Supabase (Postgres + RLS, Auth, Realtime, Storage, Edge Functions). Subscriptions run through RevenueCat. Seven languages, including RTL Arabic.

Conventions and rules for working in the codebase are in [`CLAUDE.md`](CLAUDE.md).

## Getting started

```bash
npm install        # also runs scripts/patch-supabase.js (required for Hermes builds)
npx expo start
```

The app uses native modules (RevenueCat, video, notifications) that Expo Go doesn't include, so run it in a **development build**:

```bash
eas build --profile development --platform ios
```

### Environment

Create `.env.local` in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_IOS_KEY=
# EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=   # not provisioned yet; Android runs without billing
```

EAS builds **do not read `.env.local`**. Set the same variables as EAS environment variables for each build environment (development / preview / production), or the build ships without them.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` | Start and open on a simulator/device |
| `npm run lint` | ESLint (`expo lint`) |
| `npm test` | Jest unit tests |
| `npx tsc --noEmit` | Type-check |

## Project layout

```
app/                 Expo Router screens: (auth), (tabs), (stack) drill-downs, root _layout
components/          ui/ primitives and features/<feature>/ components
lib/                 Supabase client, api/ service layer, billing/ adapter, i18n/
store/               Zustand stores, one per domain
types/  constants/  hooks/
locales/<lang>/      i18n namespaces (en, nl, es, de, pt, fr, ar)
supabase/            migrations/ and functions/
__tests__/           Jest tests
```

## Backend (Supabase)

- **Schema:** every change is a numbered SQL file in `supabase/migrations/`. Never change the database from the dashboard.
- **Edge functions** in `supabase/functions/`. `verify_jwt` is pinned per function in `supabase/config.toml`.
  - `send-notification` sends Expo push notifications. It's called by a database trigger on `notifications`, not by the app.
  - `revenuecat-webhook` writes subscription state from RevenueCat events.
  - `billing-reconcile` re-syncs a user's subscription from RevenueCat.
- **Function secrets:** `PUSH_WEBHOOK_SECRET`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY` (the `SUPABASE_*` ones are provided automatically).
- **Push setup:** push delivery also needs the same `PUSH_WEBHOOK_SECRET` value stored in Supabase Vault as `push_webhook_secret`. Until both are set, the trigger silently skips sending. See the header of migration `028_push_notification_webhook.sql`.

## Builds & release

EAS profiles in `eas.json`:

- `development`: dev client, internal distribution
- `preview`: internal distribution (Android builds an APK)
- `production`: store build, auto-incremented version

```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

iOS submission authenticates with an App Store Connect API key, `AuthKey_<id>.p8` in the project root. It's gitignored, so get it from the project owner. iOS is the launch platform. Android billing is enabled later by adding `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, with no code change.
