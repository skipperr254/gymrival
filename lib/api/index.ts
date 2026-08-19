/**
 * Supabase service layer, split by domain. This barrel re-exports every domain
 * module so existing `import { fn } from '@/lib/api'` call sites keep working
 * unchanged. Prefer importing from a specific module (e.g. '@/lib/api/pr') in
 * new code; both resolve to the same functions.
 */
export * from "./profile";
export * from "./exercises";
export * from "./friends";
export * from "./pr";
export * from "./feed";
export * from "./chat";
export * from "./leaderboard";
export * from "./challenges";
export * from "./notifications";
export * from "./nutrition";
