import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Trophy,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, withAlpha } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import type { ChallengeWithStats, ChallengeLeaderboardEntry } from '@/types/challenge';
import { formatChallengeScore } from '@/types/challenge';
import { ChallengeLeaderboardRow } from '@/components/features/compete/ChallengeLeaderboardRow';
import { ChallengeInfoCard } from '@/components/features/compete/ChallengeInfoCard';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { Avatar } from '@/components/ui/Avatar';

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
  }, [user?.id, id, subscribeToChallengeEvents]);

  // The list-fetch failed while we have nothing cached yet — without this,
  // `challenge` stays undefined and `challenges.length` stays 0 forever, so
  // neither the "not found" branch below nor the real content ever renders;
  // the screen would be stuck on the skeleton indefinitely with no way out.
  if (!challenge && challenges.length === 0 && !loadingChallenges && challengesError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <DetailHeader title={t('detail.heading')} />
        <View className="flex-1 items-center justify-center gap-2.5 px-8">
          <AlertCircle size={26} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-sm text-muted text-center">{t('detail.loadError')}</Text>
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
        <DetailHeader title={t('detail.heading')} />
        <View className="flex-1 items-center justify-center gap-2.5">
          <AlertCircle size={26} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-sm text-muted">{t('detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFriend   = challenge?.type === 'friend';
  const accentColor = isFriend ? Colors.friend : Colors.accent;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('detail.heading')} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge info card */}
        {challenge ? (
          <ChallengeInfoCard challenge={challenge} accentColor={accentColor} />
        ) : (
          // Skeleton while challenge loads
          <View className="bg-surface rounded-[20px] p-5 mb-5 border h-[180px] opacity-40 border-default" />
        )}

        {/* Error display */}
        {!!error && (
          <View className="flex-row items-center gap-2 bg-accent/10 rounded-[10px] p-3 mb-3">
            <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
            <Text className="font-sans text-[13px] text-accent">{error}</Text>
          </View>
        )}

        {/* Leaderboard */}
        <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-2.5">
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
            <Trophy size={28} strokeWidth={1.4} color={Colors.ink800} />
            <Text className="font-heading text-base tracking-[2px] text-white">
              {t('detail.noParticipants')}
            </Text>
            <Text className="font-sans text-xs text-muted">{t('detail.beFirst')}</Text>
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
            <RefreshCw size={12} strokeWidth={2} color={Colors.ink750} />
            <Text className="font-heading text-[10px] tracking-[2px] text-ink-750">
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
              <View className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl bg-elevated">
                <CheckCircle size={15} strokeWidth={2} color={Colors.muted} />
                <Text className="font-heading text-[13px] tracking-[2px] text-muted">
                  {t('detail.joinedTapToLeave')}
                </Text>
              </View>
            ) : joining ? (
              <LinearGradient
                colors={[accentColor, withAlpha(accentColor, 0.6)]}
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
                <ActivityIndicator size="small" color={Colors.primary} />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[accentColor, withAlpha(accentColor, 0.6)]}
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
                <Zap size={15} strokeWidth={2} color={Colors.primary} />
                <Text className="font-heading text-sm tracking-[3px] text-white">
                  {t('detail.joinChallenge')}
                </Text>
              </LinearGradient>
            )}
          </Pressable>
        )}

        {challenge?.status === 'completed' && (
          entries.length > 0 ? (
            <View className="flex-row items-center gap-3 py-3.5 px-4 rounded-2xl bg-gold/10 border border-gold/30 mb-4">
              <Trophy size={22} strokeWidth={1.8} color={Colors.gold} />
              <Avatar
                userId={entries[0].user_id}
                name={entries[0].full_name ?? entries[0].username ?? t('unknown')}
                avatarUrl={entries[0].avatar_url}
                size={36}
              />
              <View className="flex-1">
                <Text className="font-heading text-[9px] tracking-[2px] text-gold">
                  {t('detail.winner')}
                </Text>
                <Text className="font-sans-medium text-sm text-white" numberOfLines={1}>
                  {entries[0].full_name ?? entries[0].username ?? t('unknown')}
                  {entries[0].is_me ? t('youSuffix') : ''}
                </Text>
              </View>
              <Text className="font-heading text-lg text-gold">
                {formatChallengeScore(entries[0].score, challenge.metric, '')}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-gold/10 border border-gold/30 mb-4">
              <Trophy size={15} strokeWidth={1.8} color={Colors.gold} />
              <Text className="font-heading text-[13px] tracking-[2px] text-gold">
                {t('detail.challengeEnded')}
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
