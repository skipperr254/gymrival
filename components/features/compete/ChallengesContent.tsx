import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, RefreshCw, Zap, Swords } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { useSocialStore } from '@/store/useSocialStore';
import type { ChallengeMetric } from '@/types/challenge';
import { metricLabel } from '@/types/challenge';
import { Avatar } from '@/components/ui/Avatar';
import { ChallengeCard } from './ChallengeCard';
import { InvitationCard } from './InvitationCard';
import { CreateChallengeModal } from './CreateChallengeModal';

export function ChallengesContent({ onDetailChange }: { onDetailChange?: () => void }) {
  const { t } = useTranslation('compete');
  const user = useAuthStore((s) => s.user);
  // Per-field selectors — avoids re-rendering this tab on unrelated compete
  // store changes (rivals loads, global leaderboard pages, etc.)
  const challenges = useCompeteStore((s) => s.challenges);
  const loadingChallenges = useCompeteStore((s) => s.loadingChallenges);
  const challengesError = useCompeteStore((s) => s.challengesError);
  const leaderboards = useCompeteStore((s) => s.leaderboards);
  const pendingInvitations = useCompeteStore((s) => s.pendingInvitations);
  const loadingInvitations = useCompeteStore((s) => s.loadingInvitations);
  const invitationsError = useCompeteStore((s) => s.invitationsError);
  const exercises = useCompeteStore((s) => s.exercises);
  const loadChallenges = useCompeteStore((s) => s.loadChallenges);
  const loadLeaderboard = useCompeteStore((s) => s.loadLeaderboard);
  const joinChallenge = useCompeteStore((s) => s.joinChallenge);
  const leaveChallenge = useCompeteStore((s) => s.leaveChallenge);
  const loadPendingInvitations = useCompeteStore((s) => s.loadPendingInvitations);
  const respondToInvitation = useCompeteStore((s) => s.respondToInvitation);
  const createFriendChallenge = useCompeteStore((s) => s.createFriendChallenge);
  const loadExercises = useCompeteStore((s) => s.loadExercises);
  const subscribeToInvitationEvents = useCompeteStore((s) => s.subscribeToInvitationEvents);

  const friends = useSocialStore((s) => s.friends);
  const loadFriends = useSocialStore((s) => s.loadFriends);

  const [joiningId,    setJoiningId]    = useState<string | null>(null);
  const [invLoading,   setInvLoading]   = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);
  const [actionError,  setActionError]  = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadChallenges(user.id);
    loadPendingInvitations(user.id);
    loadFriends(user.id);
    loadExercises();
  }, [user?.id, loadChallenges, loadPendingInvitations, loadFriends, loadExercises]);

  useEffect(() => {
    if (!user?.id || challenges.length === 0) return;
    challenges.forEach(ch => {
      if (!leaderboards[ch.id]) loadLeaderboard(ch.id, user.id!);
    });
  }, [challenges, leaderboards, loadLeaderboard, user?.id]);

  // Live-update pending invitations while this tab is mounted — previously
  // a new invite only appeared after a manual refresh or remount.
  useEffect(() => {
    if (!user?.id) return;
    return subscribeToInvitationEvents(user.id);
    // subscribeToInvitationEvents is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleJoin = async (challengeId: string) => {
    if (!user?.id) return;
    setJoiningId(challengeId);
    setActionError(null);
    const { error } = await joinChallenge(challengeId, user.id);
    setJoiningId(null);
    if (error) setActionError(error);
    onDetailChange?.();
  };

  const handleLeave = async (challengeId: string) => {
    if (!user?.id) return;
    // Same in-flight guard as handleJoin — without it, "Leave" stayed fully
    // interactive during the request (no spinner, no disabling) and a rapid
    // double-tap could fire two DELETE requests.
    setJoiningId(challengeId);
    setActionError(null);
    const { error } = await leaveChallenge(challengeId, user.id);
    setJoiningId(null);
    if (error) setActionError(error);
    onDetailChange?.();
  };

  const handleInvitation = async (
    invId: string, chalId: string, response: 'accepted' | 'declined',
  ) => {
    if (!user?.id) return;
    setInvLoading(invId);
    setActionError(null);
    const { error } = await respondToInvitation(invId, chalId, user.id, response);
    setInvLoading(null);
    if (error) setActionError(error);
    onDetailChange?.();
  };

  const handleCreate = async (friendId: string, exerciseKey: string, metric: ChallengeMetric, durationDays: number) => {
    if (!user?.id) return;
    setCreating(true);
    setCreateError(null);
    const endsAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();
    const ex = exercises.find(e => e.key === exerciseKey);
    const { error } = await createFriendChallenge(user.id, {
      metric,
      exercise_key: exerciseKey,
      title:        `${ex?.label ?? exerciseKey} — ${metricLabel(metric)}`,
      ends_at:      endsAt,
      invitee_id:   friendId,
    });
    setCreating(false);
    if (!error) {
      setShowModal(false);
    } else {
      console.error('[createFriendChallenge]', error);
      setCreateError(error);
    }
  };

  const adminChallenges  = challenges.filter(c => c.type === 'admin');
  const friendChallenges = challenges.filter(c => c.type === 'friend');

  if (loadingChallenges && challenges.length === 0) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (challengesError && challenges.length === 0) {
    return (
      <View className="items-center bg-[rgba(230,48,48,0.06)] rounded-2xl border border-[rgba(230,48,48,0.2)] py-7 px-5 gap-2 mt-6">
        <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
        <Text className="font-sans text-[13px] text-secondary">{t('challenges.loadError')}</Text>
        <Pressable
          onPress={() => user?.id && loadChallenges(user.id)}
          className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
        >
          <RefreshCw size={13} strokeWidth={2} color={Colors.primary} />
          <Text className="font-heading text-xs tracking-[2px] text-white">
            {t('challenges.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={{ height: 16 }} />

      {!!actionError && (
        <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.1)] rounded-[10px] p-3 mb-3">
          <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-accent flex-1">{actionError}</Text>
        </View>
      )}

      {/* ── Pending Invitations ─────────────────────────────────────── */}
      {(pendingInvitations.length > 0 || loadingInvitations || invitationsError) && (
        <>
          <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-2.5">
            {t('challenges.pendingInvitations')}
          </Text>
          {loadingInvitations ? (
            <ActivityIndicator color={Colors.accent} style={{ marginBottom: 16 }} />
          ) : invitationsError && pendingInvitations.length === 0 ? (
            // A failed fetch previously just made this whole section vanish
            // with no trace — indistinguishable from "no invitations".
            <Pressable
              onPress={() => user?.id && loadPendingInvitations(user.id)}
              className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.06)] border border-[rgba(230,48,48,0.2)] rounded-2xl py-3 px-4 mb-3.5"
            >
              <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
              <Text className="font-sans text-[13px] text-secondary flex-1">
                {t('challenges.invitationsLoadError')}
              </Text>
              <RefreshCw size={13} strokeWidth={2} color={Colors.accent} />
            </Pressable>
          ) : (
            pendingInvitations.map(inv => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onAccept={() => handleInvitation(inv.id, inv.challenge_id, 'accepted')}
                onDecline={() => handleInvitation(inv.id, inv.challenge_id, 'declined')}
                loading={invLoading === inv.id}
              />
            ))
          )}
        </>
      )}

      {/* ── Admin / Global Challenges ───────────────────────────────── */}
      {adminChallenges.length > 0 && (
        <>
          <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-2.5">
            {t('challenges.activeChallenges')}
          </Text>
          {adminChallenges.map(ch => (
            <ChallengeCard
              key={ch.id}
              ch={ch}
              topEntries={leaderboards[ch.id] ?? []}
              unit={exercises.find(e => e.key === ch.exercise_key)?.unit ?? 'kg'}
              onJoin={() => handleJoin(ch.id)}
              onLeave={() => handleLeave(ch.id)}
              joining={joiningId === ch.id}
            />
          ))}
        </>
      )}

      {/* ── Friend Challenges ───────────────────────────────────────── */}
      {friendChallenges.length > 0 && (
        <>
          <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-2.5">
            {t('challenges.friendChallenges')}
          </Text>
          {friendChallenges.map(ch => (
            <ChallengeCard
              key={ch.id}
              ch={ch}
              topEntries={leaderboards[ch.id] ?? []}
              unit={exercises.find(e => e.key === ch.exercise_key)?.unit ?? 'kg'}
              onJoin={() => handleJoin(ch.id)}
              onLeave={() => handleLeave(ch.id)}
              joining={joiningId === ch.id}
            />
          ))}
        </>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loadingChallenges && challenges.length === 0 && (
        <View className="items-center bg-surface rounded-2xl py-12 px-5 gap-2">
          <Zap size={32} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('challenges.emptyTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted">{t('challenges.emptySub')}</Text>
        </View>
      )}

      {/* ── Challenge a Friend ──────────────────────────────────────── */}
      <View className="bg-surface rounded-2xl py-4 px-[18px] mb-3 mt-1 border border-default">
        <View className="flex-row items-center gap-2.5 mb-1">
          <Swords size={17} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-heading text-sm tracking-[2px] text-white">
            {t('challenges.challengeFriendTitle')}
          </Text>
        </View>
        <Text className="font-sans text-xs text-muted mb-3.5">
          {t('challenges.challengeFriendSub')}
        </Text>

        {friends.length > 0 && (
          <View className="flex-row gap-2 mb-3.5 flex-wrap">
            {friends.slice(0, 6).map(f => (
              <Avatar
                key={f.id}
                userId={f.id}
                name={f.full_name ?? f.username ?? '?'}
                avatarUrl={f.avatar_url}
                size={36}
              />
            ))}
            {friends.length > 6 && (
              <View className="w-9 h-9 rounded-full bg-[#252525] border border-default items-center justify-center">
                <Text className="font-heading text-[11px] text-muted">
                  {t('challenges.moreCount', { count: friends.length - 6 })}
                </Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          onPress={() => setShowModal(true)}
          disabled={friends.length === 0}
          className={`rounded-2xl overflow-hidden ${friends.length === 0 ? 'opacity-35' : ''}`}
        >
          <LinearGradient
            colors={['rgba(230,48,48,0.14)', 'rgba(230,48,48,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 13,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(230,48,48,0.25)',
            }}
          >
            <Swords size={14} strokeWidth={1.8} color={Colors.accent} />
            <Text className="font-heading text-xs tracking-[2px] text-accent">
              {friends.length === 0 ? t('challenges.addFriendsFirst') : t('challenges.challengeFriendBtn')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <CreateChallengeModal
        visible={showModal}
        friends={friends}
        exercises={exercises}
        onClose={() => { setShowModal(false); setCreateError(null); }}
        onCreate={handleCreate}
        loading={creating}
        errorMsg={createError}
      />
    </>
  );
}
