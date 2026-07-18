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
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { ChallengeCard } from './ChallengeCard';
import { InvitationCard } from './InvitationCard';
import { CreateChallengeModal } from './CreateChallengeModal';

export function ChallengesContent({ onDetailChange }: { onDetailChange?: () => void }) {
  const { t } = useTranslation('compete');
  const { user }    = useAuthStore();
  const {
    challenges,
    loadingChallenges,
    challengesError,
    leaderboards,
    pendingInvitations,
    loadingInvitations,
    exercises,
    loadChallenges,
    loadLeaderboard,
    joinChallenge,
    leaveChallenge,
    loadPendingInvitations,
    respondToInvitation,
    createFriendChallenge,
    loadExercises,
  } = useCompeteStore();

  const { friends, loadFriends } = useSocialStore();

  const [joiningId,    setJoiningId]    = useState<string | null>(null);
  const [invLoading,   setInvLoading]   = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);

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

  const handleJoin = async (challengeId: string) => {
    if (!user?.id) return;
    setJoiningId(challengeId);
    await joinChallenge(challengeId, user.id);
    setJoiningId(null);
    onDetailChange?.();
  };

  const handleLeave = async (challengeId: string) => {
    if (!user?.id) return;
    await leaveChallenge(challengeId, user.id);
    onDetailChange?.();
  };

  const handleInvitation = async (
    invId: string, chalId: string, response: 'accepted' | 'declined',
  ) => {
    if (!user?.id) return;
    setInvLoading(invId);
    await respondToInvitation(invId, chalId, user.id, response);
    setInvLoading(null);
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
        <Text className="font-sans text-[13px] text-[#b0b0b0]">{t('challenges.loadError')}</Text>
        <Pressable
          onPress={() => user?.id && loadChallenges(user.id)}
          className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
        >
          <RefreshCw size={13} strokeWidth={2} color="#fff" />
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

      {/* ── Pending Invitations ─────────────────────────────────────── */}
      {(pendingInvitations.length > 0 || loadingInvitations) && (
        <>
          <Text className="font-heading text-[11px] tracking-[3px] text-[#555] mb-2.5">
            {t('challenges.pendingInvitations')}
          </Text>
          {loadingInvitations ? (
            <ActivityIndicator color={Colors.accent} style={{ marginBottom: 16 }} />
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
          <Text className="font-heading text-[11px] tracking-[3px] text-[#555] mb-2.5">
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
          <Text className="font-heading text-[11px] tracking-[3px] text-[#555] mb-2.5">
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
        <View className="items-center bg-[#1e1e1e] rounded-2xl py-12 px-5 gap-2">
          <Zap size={32} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('challenges.emptyTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-[#555]">{t('challenges.emptySub')}</Text>
        </View>
      )}

      {/* ── Challenge a Friend ──────────────────────────────────────── */}
      <View className="bg-[#1e1e1e] rounded-2xl py-4 px-[18px] mb-3 mt-1 border border-[#2a2a2a]">
        <View className="flex-row items-center gap-2.5 mb-1">
          <Swords size={17} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-heading text-sm tracking-[2px] text-white">
            {t('challenges.challengeFriendTitle')}
          </Text>
        </View>
        <Text className="font-sans text-xs text-[#555] mb-3.5">
          {t('challenges.challengeFriendSub')}
        </Text>

        {friends.length > 0 && (
          <View className="flex-row gap-2 mb-3.5 flex-wrap">
            {friends.slice(0, 6).map(f => (
              <LeaderboardAvatar
                key={f.id}
                id={f.id}
                name={f.full_name ?? f.username ?? '?'}
                size={36}
              />
            ))}
            {friends.length > 6 && (
              <View className="w-9 h-9 rounded-full bg-[#252525] border border-[#2a2a2a] items-center justify-center">
                <Text className="font-heading text-[11px] text-[#555]">
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
