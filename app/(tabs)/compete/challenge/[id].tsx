import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Trophy,
  Clock,
  Gift,
  Users,
  Zap,
  CheckCircle,
  TrendingUp,
  Activity,
  Dumbbell,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import type { ChallengeWithStats, ChallengeLeaderboardEntry } from '@/types/challenge';
import {
  endsInLabel,
  formatChallengeScore,
  metricLabel,
} from '@/types/challenge';
import { ChallengeLeaderboardRow } from '@/components/features/compete/ChallengeLeaderboardRow';

export default function ChallengeDetailScreen() {
  const { t } = useTranslation('compete');
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    challenges,
    challengesError,
    loadingChallenges,
    leaderboards,
    loadingLeaderboard,
    leaderboardErrors,
    loadChallenges,
    loadLeaderboard,
    joinChallenge,
    leaveChallenge,
    subscribeToChallengeEvents,
  } = useCompeteStore();

  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Find challenge from store cache (populated by the list screen)
  const challenge: ChallengeWithStats | undefined = challenges.find(c => c.id === id);
  const entries: ChallengeLeaderboardEntry[] = leaderboards[id ?? ''] ?? [];
  const isLoadingBoard = !!loadingLeaderboard[id ?? ''];
  const boardError = leaderboardErrors[id ?? ''] ?? null;

  useEffect(() => {
    if (!user?.id || !id) return;
    if (challenges.length === 0) loadChallenges(user.id);
    loadLeaderboard(id, user.id);
  }, [user?.id, id, challenges.length, loadChallenges, loadLeaderboard]);

  // Live-update the leaderboard while this challenge is open — previously a
  // friend joining/leaving/scoring only appeared after a manual refresh.
  useEffect(() => {
    if (!user?.id || !id) return;
    return subscribeToChallengeEvents(id, user.id);
    // subscribeToChallengeEvents is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  // The list-fetch failed while we have nothing cached yet — without this,
  // `challenge` stays undefined and `challenges.length` stays 0 forever, so
  // neither the "not found" branch below nor the real content ever renders;
  // the screen would be stuck on the skeleton indefinitely with no way out.
  if (!challenge && challenges.length === 0 && !loadingChallenges && challengesError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="p-1 mr-2"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
          </Pressable>
          <Text className="font-heading text-[22px] tracking-[3px] text-primary flex-1">
            {t('detail.heading')}
          </Text>
          <View className="w-9" />
        </View>
        <View className="flex-1 items-center justify-center gap-2.5 px-8">
          <AlertCircle size={26} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-sm text-[#555] text-center">{t('detail.loadError')}</Text>
          <Pressable
            onPress={() => user?.id && loadChallenges(user.id)}
            className="flex-row items-center gap-1.5 mt-1 py-2 px-4"
          >
            <RefreshCw size={12} strokeWidth={2} color={Colors.accent} />
            <Text className="font-heading text-[11px] tracking-[2px] text-accent">{t('detail.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleJoin = async () => {
    if (!user?.id || !id) return;
    setJoining(true);
    setError(null);
    const result = await joinChallenge(id, user.id);
    if (result.error) setError(result.error);
    setJoining(false);
  };

  const handleLeave = async () => {
    if (!user?.id || !id) return;
    setJoining(true);
    setError(null);
    const result = await leaveChallenge(id, user.id);
    if (result.error) setError(result.error);
    setJoining(false);
  };

  if (!challenge && challenges.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="p-1 mr-2"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
          </Pressable>
          <Text className="font-heading text-[22px] tracking-[3px] text-primary flex-1">
            {t('detail.heading')}
          </Text>
          <View className="w-9" />
        </View>
        <View className="flex-1 items-center justify-center gap-2.5">
          <AlertCircle size={26} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-sm text-[#555]">{t('detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFriend   = challenge?.type === 'friend';
  const accentColor = isFriend ? '#4a9eff' : Colors.accent;

  const MetricIcon = challenge?.metric === 'most_improved' ? TrendingUp
    : challenge?.metric === 'total_volume'  ? Activity
    : Dumbbell;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="p-1 mr-2"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
        </Pressable>
        <Text className="font-heading text-[22px] tracking-[3px] text-primary flex-1">
          {t('detail.heading')}
        </Text>
        <View className="w-9" />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge info card */}
        {challenge ? (
          <View
            className="bg-surface rounded-[20px] p-5 mb-5 border"
            style={{ borderColor: accentColor + '33' }}
          >
            <View
              className="w-[54px] h-[54px] rounded-2xl border items-center justify-center mb-3.5"
              style={{ backgroundColor: accentColor + '15', borderColor: accentColor + '33' }}
            >
              <MetricIcon size={26} strokeWidth={1.4} color={accentColor} />
            </View>
            <Text className="font-heading text-[22px] tracking-[2px] text-primary mb-1.5">
              {challenge.title}
            </Text>
            {!!challenge.description && (
              <Text className="font-sans text-[13px] text-secondary leading-5 mb-1">
                {challenge.description}
              </Text>
            )}
            <Text className="font-sans text-[13px] leading-5 mb-1 text-[#555] mt-0.5">
              {metricLabel(challenge.metric)}
            </Text>

            {!!challenge.prize_label && (
              <View
                className="flex-row items-center gap-2.5 bg-black/30 rounded-xl py-2.5 px-3.5 mt-3 mb-3.5 border"
                style={{ borderColor: accentColor + '33' }}
              >
                <Gift size={15} strokeWidth={1.8} color={accentColor} />
                <View>
                  <Text className="font-heading text-[9px] text-[#555] tracking-[2px] mb-0.5">
                    {t('detail.prize')}
                  </Text>
                  <Text className="font-sans text-[13px]" style={{ color: accentColor }}>
                    {challenge.prize_label}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row gap-5 flex-wrap">
              <View className="flex-row items-center gap-2">
                <Clock size={14} strokeWidth={1.8} color="#555" />
                <View>
                  <Text className="font-heading text-[9px] text-[#555] tracking-[2px]">
                    {t('detail.endsIn')}
                  </Text>
                  <Text className="font-heading text-lg text-primary">
                    {endsInLabel(challenge.ends_at)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <Users size={14} strokeWidth={1.8} color="#555" />
                <View>
                  <Text className="font-heading text-[9px] text-[#555] tracking-[2px]">
                    {t('detail.participants')}
                  </Text>
                  <Text className="font-heading text-lg text-primary">
                    {challenge.participant_count}
                  </Text>
                </View>
              </View>
              {challenge.reward_xp > 0 && (
                <View className="flex-row items-center gap-2">
                  <Zap size={14} strokeWidth={1.8} color="#555" />
                  <View>
                    <Text className="font-heading text-[9px] text-[#555] tracking-[2px]">
                      {t('detail.xpReward')}
                    </Text>
                    <Text className="font-heading text-lg text-primary">
                      {challenge.reward_xp}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {challenge.is_joined && challenge.user_rank != null && (
              <View
                className="flex-row items-center gap-2 rounded-[10px] border py-2 px-3 mt-3.5"
                style={{ backgroundColor: accentColor + '15', borderColor: accentColor + '33' }}
              >
                <Trophy size={13} strokeWidth={1.8} color={accentColor} />
                <Text className="font-sans-medium text-[13px]" style={{ color: accentColor }}>
                  {t('card.yourRank', { rank: challenge.user_rank })}
                  {challenge.user_score != null
                    ? `  ·  ${formatChallengeScore(challenge.user_score, challenge.metric, '')}`
                    : ''}
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Skeleton while challenge loads
          <View className="bg-surface rounded-[20px] p-5 mb-5 border h-[180px] opacity-40 border-[#2a2a2a]" />
        )}

        {/* Error display */}
        {!!error && (
          <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.1)] rounded-[10px] p-3 mb-3">
            <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
            <Text className="font-sans text-[13px] text-accent">{error}</Text>
          </View>
        )}

        {/* Leaderboard */}
        <Text className="font-heading text-[11px] tracking-[3px] text-[#555] mb-2.5">
          {t('detail.leaderboard')}
        </Text>

        {isLoadingBoard && entries.length === 0 && (
          <View className="items-center py-8">
            <ActivityIndicator color={Colors.accent} />
          </View>
        )}

        {!isLoadingBoard && entries.length === 0 && boardError && (
          <View className="items-center bg-surface rounded-2xl py-10 gap-1.5 mb-4">
            <AlertCircle size={28} strokeWidth={1.4} color={Colors.accent} />
            <Text className="font-heading text-base tracking-[2px] text-white">
              {t('detail.leaderboardError')}
            </Text>
            <Pressable
              onPress={() => user?.id && id && loadLeaderboard(id, user.id)}
              className="flex-row items-center gap-1.5 mt-1 py-2 px-4"
            >
              <RefreshCw size={12} strokeWidth={2} color={Colors.accent} />
              <Text className="font-heading text-[11px] tracking-[2px] text-accent">{t('detail.retry')}</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingBoard && entries.length === 0 && !boardError && (
          <View className="items-center bg-surface rounded-2xl py-10 gap-1.5 mb-4">
            <Trophy size={28} strokeWidth={1.4} color="#333" />
            <Text className="font-heading text-base tracking-[2px] text-white">
              {t('detail.noParticipants')}
            </Text>
            <Text className="font-sans text-xs text-[#555]">{t('detail.beFirst')}</Text>
          </View>
        )}

        {entries.map((entry) => (
          <ChallengeLeaderboardRow
            key={entry.user_id}
            entry={entry}
            metric={challenge?.metric}
            accentColor={accentColor}
          />
        ))}

        {/* Refresh button */}
        {entries.length > 0 && (
          <Pressable
            onPress={() => user?.id && id && loadLeaderboard(id, user.id)}
            className="flex-row items-center justify-center gap-1.5 py-2.5 mb-1"
          >
            <RefreshCw size={12} strokeWidth={2} color="#383838" />
            <Text className="font-heading text-[10px] tracking-[2px] text-[#383838]">
              {t('detail.refresh')}
            </Text>
          </Pressable>
        )}

        {/* Join / Leave button */}
        {challenge && challenge.status === 'active' && (
          <Pressable
            onPress={challenge.is_joined ? handleLeave : handleJoin}
            disabled={joining}
            className="mt-2 mb-4 rounded-2xl overflow-hidden"
          >
            {challenge.is_joined ? (
              <View className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#2a2a2a]">
                <CheckCircle size={15} strokeWidth={2} color="#555" />
                <Text className="font-heading text-[13px] tracking-[2px] text-[#555]">
                  {t('detail.joinedTapToLeave')}
                </Text>
              </View>
            ) : joining ? (
              <LinearGradient
                colors={[accentColor, accentColor + '99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 14,
                }}
              >
                <ActivityIndicator size="small" color="#fff" />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[accentColor, accentColor + '99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 14,
                }}
              >
                <Zap size={15} strokeWidth={2} color="#fff" />
                <Text className="font-heading text-sm tracking-[3px] text-white">
                  {t('detail.joinChallenge')}
                </Text>
              </LinearGradient>
            )}
          </Pressable>
        )}

        {challenge?.status === 'completed' && (
          <View className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-[rgba(212,160,23,0.1)] border border-[rgba(212,160,23,0.3)] mb-4">
            <Trophy size={15} strokeWidth={1.8} color="#d4a017" />
            <Text className="font-heading text-[13px] tracking-[2px] text-[#d4a017]">
              {t('detail.challengeEnded')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
