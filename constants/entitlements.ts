/**
 * The single declaration of what Pro unlocks.
 *
 * Every gate in the app names a `ProFeature` from this file. Nothing checks
 * `is_pro` directly — that way "is publishing a PR still Pro-only?" has exactly
 * one answer, and changing the free tier is a one-line edit here rather than a
 * hunt through screens.
 *
 * This is the *client affordance* layer only. Each of these is independently
 * enforced server-side (RLS policy or RPC check) in Phase 3 — a patched client
 * that flips a boolean here gains nothing.
 */

/**
 * Where an upgrade prompt was opened from. Recorded with every paywall
 * impression so Phase 5 can report which placements actually earn their keep —
 * the billing provider can tell you what was bought, never what prompted it.
 */
export type PaywallTrigger =
  | 'onboarding'
  | 'publish_pr'
  | 'pr_video'
  | 'chat_reply'
  | 'leaderboard_depth'
  | 'create_challenge'
  | 'streak_milestone'
  | 'upgrade_card'
  | 'settings';

export type ProFeature =
  /** Push a logged PR to the social feed. Free users log privately. */
  | 'publishPR'
  /** Attach video proof to a PR. */
  | 'prVideo'
  /** Send or reply to a chat message. Reading stays free. */
  | 'sendMessage'
  /** Global leaderboard past the free row cap. */
  | 'leaderboardDepth'
  /** Search / filter athletes on the global leaderboard. */
  | 'leaderboardSearch'
  /** Create a friend-vs-friend challenge. Joining one stays free. */
  | 'createChallenge';

/**
 * The paywall placement each locked feature should open. Keeps the trigger tag
 * next to the feature it belongs to instead of being retyped at every call
 * site, where it would inevitably drift and poison the Phase 5 numbers.
 */
export const FEATURE_TRIGGER: Record<ProFeature, PaywallTrigger> = {
  publishPR: 'publish_pr',
  prVideo: 'pr_video',
  sendMessage: 'chat_reply',
  leaderboardDepth: 'leaderboard_depth',
  leaderboardSearch: 'leaderboard_depth',
  createChallenge: 'create_challenge',
};

/**
 * Quantitative limits on the free tier. Mirrored server-side — the clamp in
 * `global_leaderboard()` is what actually enforces the row cap; this constant
 * only tells the UI where to draw the blur.
 */
export const FREE_LIMITS = {
  /** Rows of the global leaderboard a free user can see past their own rank. */
  globalLeaderboardRows: 10,
} as const;

/**
 * Never gated, not even with a nag. This is the daily-habit half of the app and
 * the reason a free user opens it again tomorrow — listed explicitly so the
 * rule survives contact with future feature work.
 */
export const ALWAYS_FREE = [
  'nutrition',
  'schedule',
  'checkin',
  'progress',
  'logPR',
  'prHistory',
  'browseFeed',
  'likePost',
  'friends',
  'readMessages',
  'rivalsLeaderboard',
  'ownGlobalRank',
  'joinChallenge',
] as const;
