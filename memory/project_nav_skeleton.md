---
name: project-nav-skeleton
description: Navigation skeleton complete — custom tab bar, all screens, nested stacks
metadata:
  type: project
---

Navigation skeleton was built in this session (2026-05-19).

**What was built:**
- `(tabs)/_layout.tsx` replaced Stack→Tabs with `CustomTabBar` + `LogSheet` modal
- `components/ui/CustomTabBar.tsx` — Ionicons icons, FAB center button (red circle with add icon), active dot indicator, `useSafeAreaInsets`
- `components/ui/LogSheet.tsx` — React Native `Modal` with 4 log actions (PR, Meal, Weight, Check-in)
- Nested `_layout.tsx` (Stack) inside compete/, social/, train/, profile/
- 26 placeholder screens with rich dark-themed content and drill-down nav links

**Why:** `as never` casts added to all router.push calls that use dynamic template literal routes (challengeDetail, chat, schemaDetail) and string-typed route arrays, because Expo Router typed routes haven't been regenerated for the new file structure yet. Will self-heal when `expo start` runs.

**How to apply:** When adding more dynamic router.push calls, use `as never` cast until Expo Router regenerates `.expo/` types.

[[project-auth-flow]]
