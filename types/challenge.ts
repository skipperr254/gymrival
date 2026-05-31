export type ChallengeType   = 'admin' | 'friend';
export type ChallengeScope  = 'global' | 'friends_only' | 'direct';
export type ChallengeMetric = 'highest_pr' | 'most_improved' | 'total_volume';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface Challenge {
  id: string;
  type: ChallengeType;
  scope: ChallengeScope;
  metric: ChallengeMetric;
  exercise_key: string | null;
  title: string;
  description: string | null;
  icon: string | null;
  prize_label: string | null;
  reward_xp: number;
  starts_at: string;
  ends_at: string;
  status: ChallengeStatus;
  created_by: string | null;
  winner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Challenge enriched with live participant stats.
 * Returned by the active_challenges_for_user() RPC.
 */
export interface ChallengeWithStats extends Omit<Challenge, 'created_at' | 'updated_at'> {
  participant_count: number;
  is_joined: boolean;
  user_score: number | null;
  user_rank: number | null;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  status: 'active' | 'withdrawn';
  score: number;
  baseline_score: number;
  score_updated_at: string | null;
}

/**
 * One row returned by challenge_leaderboard() RPC.
 * Includes user profile fields and live rank.
 */
export interface ChallengeLeaderboardEntry {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  score: number;
  baseline_score: number;
  rank: number;
  joined_at: string;
  is_me: boolean;
}

export interface ChallengeInvitation {
  id: string;
  challenge_id: string;
  inviter_id: string;
  invitee_id: string;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
  /** Populated when fetching invitations with inviter profile join */
  challenge?: Pick<Challenge, 'id' | 'title' | 'description' | 'icon' | 'metric' | 'exercise_key' | 'ends_at' | 'prize_label'>;
  inviter?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

/** Input for creating a new friend challenge */
export interface CreateFriendChallengeInput {
  metric: ChallengeMetric;
  exercise_key: string;
  title: string;
  description?: string;
  prize_label?: string;
  ends_at: string;
  invitee_id: string;
}

/** Display-ready format of a score value for any metric type */
export function formatChallengeScore(
  score: number,
  metric: ChallengeMetric,
  unit: string,
): string {
  if (metric === 'most_improved') return `+${score}${unit}`;
  if (metric === 'total_volume')  return `${score}${unit}`;
  return `${score}${unit}`;
}

/** Human-readable label for a metric type */
export function metricLabel(metric: ChallengeMetric): string {
  switch (metric) {
    case 'highest_pr':    return 'Highest PR';
    case 'most_improved': return 'Most Improved';
    case 'total_volume':  return 'Total Volume';
  }
}

/** Returns milliseconds until a challenge ends (negative if already ended) */
export function msUntilEnd(endsAt: string): number {
  return new Date(endsAt).getTime() - Date.now();
}

/** Returns a human-readable "ends in" string */
export function endsInLabel(endsAt: string): string {
  const ms = msUntilEnd(endsAt);
  if (ms <= 0) return 'Ended';
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(ms / 60_000);
  return `${mins}m left`;
}
