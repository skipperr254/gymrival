import { supabase } from "@/lib/supabase";
import type {
  ChallengeWithStats,
  ChallengeLeaderboardEntry,
  ChallengeInvitation,
  CreateFriendChallengeInput,
  InvitationStatus,
} from "@/types/challenge";

function mapChallengeRow(row: any): ChallengeWithStats {
  return {
    id:                row.id,
    type:              row.type,
    scope:             row.scope,
    metric:            row.metric,
    exercise_key:      row.exercise_key ?? null,
    title:             row.title,
    description:       row.description ?? null,
    icon:              row.icon ?? null,
    prize_label:       row.prize_label ?? null,
    reward_xp:         Number(row.reward_xp ?? 0),
    starts_at:         row.starts_at,
    ends_at:           row.ends_at,
    status:            row.status,
    created_by:        row.created_by ?? null,
    winner_user_id:    row.winner_user_id ?? null,
    participant_count: Number(row.participant_count ?? 0),
    is_joined:         Boolean(row.is_joined),
    user_score:        row.user_score != null ? Number(row.user_score) : null,
    user_rank:         row.user_rank  != null ? Number(row.user_rank)  : null,
  };
}

/**
 * Fetch all challenges visible to the given user, enriched with live stats.
 * Uses the active_challenges_for_user() RPC which handles all visibility rules.
 */
export async function fetchActiveChallenges(
  userId: string,
  locale: string,
): Promise<{ data: ChallengeWithStats[]; error: string | null }> {
  const { data, error } = await supabase.rpc('active_challenges_for_user', {
    p_user_id: userId,
    p_locale: locale,
  });
  if (error) return { data: [], error: error.message };
  return {
    data: ((data as any[]) ?? []).map(mapChallengeRow),
    error: null,
  };
}

/**
 * Fetch the full leaderboard for a challenge, ranked by score.
 * Uses the challenge_leaderboard() RPC.
 */
export async function fetchChallengeLeaderboard(
  challengeId: string,
  viewerId: string,
): Promise<{ data: ChallengeLeaderboardEntry[]; error: string | null }> {
  const { data, error } = await supabase.rpc('challenge_leaderboard', {
    p_challenge_id: challengeId,
    p_viewer_id:    viewerId,
  });
  if (error) return { data: [], error: error.message };
  return {
    data: ((data as any[]) ?? []).map((row: any): ChallengeLeaderboardEntry => ({
      user_id:        row.user_id,
      full_name:      row.full_name  ?? null,
      username:       row.username   ?? null,
      avatar_url:     row.avatar_url ?? null,
      level:          Number(row.level ?? 1),
      score:          Number(row.score ?? 0),
      baseline_score: Number(row.baseline_score ?? 0),
      rank:           Number(row.rank),
      joined_at:      row.joined_at,
      is_me:          Boolean(row.is_me),
    })),
    error: null,
  };
}

/** Join an admin / global challenge. */
export async function joinChallenge(
  challengeId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('challenge_participants')
    .insert({ challenge_id: challengeId, user_id: userId });
  // 23505 = unique_violation (already joined)
  if (error && error.code !== '23505') return { error: error.message };
  return { error: null };
}

/** Leave (withdraw from) a challenge. */
export async function leaveChallenge(
  challengeId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}

/**
 * Create a friend challenge and immediately invite the target friend.
 * Returns the new challenge id on success.
 */
export async function createFriendChallenge(
  creatorId: string,
  input: CreateFriendChallengeInput,
): Promise<{ challengeId: string | null; error: string | null }> {
  const now = new Date().toISOString();

  const { data, error: insertErr } = await supabase
    .from('challenges')
    .insert({
      type:        'friend',
      scope:       'direct',
      metric:      input.metric,
      exercise_key: input.exercise_key,
      title:       input.title,
      description: input.description ?? null,
      prize_label: input.prize_label ?? null,
      starts_at:   now,
      ends_at:     input.ends_at,
      created_by:  creatorId,
      status:      'active',
    })
    .select('id')
    .single();

  if (insertErr || !data) {
    return { challengeId: null, error: insertErr?.message ?? 'Failed to create challenge' };
  }

  const challengeId = data.id as string;

  // Add creator as participant
  await supabase
    .from('challenge_participants')
    .insert({ challenge_id: challengeId, user_id: creatorId });

  // Send invitation to friend
  const { error: invErr } = await supabase
    .from('challenge_invitations')
    .insert({
      challenge_id: challengeId,
      inviter_id:   creatorId,
      invitee_id:   input.invitee_id,
    });

  if (invErr) return { challengeId, error: invErr.message };
  return { challengeId, error: null };
}

/**
 * Fetch pending challenge invitations for the current user,
 * including the challenge details and inviter's profile.
 */
export async function fetchPendingInvitations(
  userId: string,
): Promise<{ data: ChallengeInvitation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('challenge_invitations')
    .select(`
      id, challenge_id, inviter_id, invitee_id, status, created_at, updated_at,
      challenge:challenges!challenge_invitations_challenge_id_fkey(
        id, title, description, icon, metric, exercise_key, ends_at, prize_label
      ),
      inviter:profiles!challenge_invitations_inviter_id_fkey(
        id, full_name, username, avatar_url
      )
    `)
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const invitations: ChallengeInvitation[] = (data ?? []).map((row: any) => ({
    id:           row.id,
    challenge_id: row.challenge_id,
    inviter_id:   row.inviter_id,
    invitee_id:   row.invitee_id,
    status:       row.status as InvitationStatus,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
    challenge:    row.challenge ?? undefined,
    inviter:      row.inviter   ?? undefined,
  }));

  return { data: invitations, error: null };
}

/**
 * Accept or decline a challenge invitation.
 * Accepting automatically creates a challenge_participants row.
 */
export async function respondToInvitation(
  invitationId: string,
  challengeId: string,
  userId: string,
  response: 'accepted' | 'declined',
): Promise<{ error: string | null }> {
  const { error: updateErr } = await supabase
    .from('challenge_invitations')
    .update({ status: response })
    .eq('id', invitationId);

  if (updateErr) return { error: updateErr.message };

  if (response === 'accepted') {
    const { error: joinErr } = await supabase
      .from('challenge_participants')
      .insert({ challenge_id: challengeId, user_id: userId });
    // Ignore duplicate-key if already joined
    if (joinErr && joinErr.code !== '23505') return { error: joinErr.message };
  }

  return { error: null };
}

/**
 * Admin-only: create a global or friends_only challenge.
 * Regular users should use createFriendChallenge instead.
 */
export async function createAdminChallenge(
  adminId: string,
  input: {
    type: 'admin';
    scope: 'global' | 'friends_only';
    metric: string;
    exercise_key: string | null;
    title: string;
    description?: string;
    icon?: string;
    prize_label?: string;
    reward_xp?: number;
    starts_at: string;
    ends_at: string;
    max_participants?: number;
  },
): Promise<{ challengeId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      type:             input.type,
      scope:            input.scope,
      metric:           input.metric,
      exercise_key:     input.exercise_key,
      title:            input.title,
      description:      input.description ?? null,
      icon:             input.icon ?? null,
      prize_label:      input.prize_label ?? null,
      reward_xp:        input.reward_xp ?? 0,
      starts_at:        input.starts_at,
      ends_at:          input.ends_at,
      created_by:       adminId,
      status:           'active',
      max_participants: input.max_participants ?? null,
    })
    .select('id')
    .single();

  if (error || !data) return { challengeId: null, error: error?.message ?? 'Failed' };
  return { challengeId: data.id as string, error: null };
}

/**
 * Admin-only: mark a challenge as completed.
 * This triggers the award_challenge_xp() DB trigger which awards XP to the winner.
 */
export async function completeChallenge(
  challengeId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'completed' })
    .eq('id', challengeId);
  return { error: error?.message ?? null };
}
