import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
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
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { formatNumber } from '@/lib/i18n/format';
import type { ChallengeWithStats, ChallengeLeaderboardEntry } from '@/types/challenge';
import {
  endsInLabel,
  formatChallengeScore,
  metricLabel,
} from '@/types/challenge';

const MEDAL_COLORS   = ['#d4a017', '#909090', '#a0522d'];
const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function Avatar({ id, name, size = 38 }: { id: string; name: string; size?: number }) {
  const color    = avatarColor(id);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <LinearGradient
      colors={[color, '#1a1a1a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderWidth: 2,
        borderColor: color + '44',
      }}
    >
      <Text style={{
        fontFamily: Fonts.display,
        fontSize: Math.round(size * 0.28),
        color: '#fff',
        letterSpacing: 1,
      }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

export default function ChallengeDetailScreen() {
  const { t } = useTranslation('compete');
  const { id }   = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const {
    challenges,
    leaderboards,
    loadingLeaderboard,
    loadChallenges,
    loadLeaderboard,
    joinChallenge,
    leaveChallenge,
  } = useCompeteStore();

  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Find challenge from store cache (populated by the list screen)
  const challenge: ChallengeWithStats | undefined = challenges.find(c => c.id === id);
  const entries: ChallengeLeaderboardEntry[] = leaderboards[id ?? ''] ?? [];
  const isLoadingBoard = !!loadingLeaderboard[id ?? ''];

  useEffect(() => {
    if (!user?.id || !id) return;
    if (challenges.length === 0) loadChallenges(user.id);
    loadLeaderboard(id, user.id);
  }, [user?.id, id, challenges.length, loadChallenges, loadLeaderboard]);

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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
          </Pressable>
          <Text style={styles.heading}>{t('detail.heading')}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.errorCenter}>
          <AlertCircle size={26} strokeWidth={1.6} color={Colors.accent} />
          <Text style={styles.errorText}>{t('detail.notFound')}</Text>
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>{t('detail.heading')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenge info card */}
        {challenge ? (
          <View style={[styles.card, { borderColor: accentColor + '33' }]}>
            <View style={[styles.iconWrap, { backgroundColor: accentColor + '15', borderColor: accentColor + '33' }]}>
              <MetricIcon size={26} strokeWidth={1.4} color={accentColor} />
            </View>
            <Text style={styles.cardTitle}>{challenge.title}</Text>
            {!!challenge.description && (
              <Text style={styles.cardDesc}>{challenge.description}</Text>
            )}
            <Text style={[styles.cardDesc, { color: '#555', marginTop: 2 }]}>
              {metricLabel(challenge.metric)}
            </Text>

            {!!challenge.prize_label && (
              <View style={[styles.prizeBox, { borderColor: accentColor + '33' }]}>
                <Gift size={15} strokeWidth={1.8} color={accentColor} />
                <View>
                  <Text style={styles.prizeLabel}>{t('detail.prize')}</Text>
                  <Text style={[styles.prizeVal, { color: accentColor }]}>
                    {challenge.prize_label}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={14} strokeWidth={1.8} color="#555" />
                <View>
                  <Text style={styles.statLabel}>{t('detail.endsIn')}</Text>
                  <Text style={styles.statVal}>{endsInLabel(challenge.ends_at)}</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Users size={14} strokeWidth={1.8} color="#555" />
                <View>
                  <Text style={styles.statLabel}>{t('detail.participants')}</Text>
                  <Text style={styles.statVal}>{challenge.participant_count}</Text>
                </View>
              </View>
              {challenge.reward_xp > 0 && (
                <View style={styles.statItem}>
                  <Zap size={14} strokeWidth={1.8} color="#555" />
                  <View>
                    <Text style={styles.statLabel}>{t('detail.xpReward')}</Text>
                    <Text style={styles.statVal}>{challenge.reward_xp}</Text>
                  </View>
                </View>
              )}
            </View>

            {challenge.is_joined && challenge.user_rank != null && (
              <View style={[styles.rankBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '33' }]}>
                <Trophy size={13} strokeWidth={1.8} color={accentColor} />
                <Text style={[styles.rankBadgeText, { color: accentColor }]}>
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
          <View style={[styles.card, styles.skeleton]} />
        )}

        {/* Error display */}
        {!!error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Leaderboard */}
        <Text style={styles.sectionLabel}>{t('detail.leaderboard')}</Text>

        {isLoadingBoard && entries.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        )}

        {!isLoadingBoard && entries.length === 0 && (
          <View style={styles.emptyBoard}>
            <Trophy size={28} strokeWidth={1.4} color="#333" />
            <Text style={styles.emptyBoardText}>{t('detail.noParticipants')}</Text>
            <Text style={styles.emptyBoardSub}>{t('detail.beFirst')}</Text>
          </View>
        )}

        {entries.map((entry, i) => {
          const displayName = entry.full_name ?? entry.username ?? t('unknown');
          const rankIdx     = Number(entry.rank) - 1;
          return (
            <View
              key={entry.user_id}
              style={[
                styles.row,
                entry.is_me
                  ? { backgroundColor: accentColor + '12', borderColor: accentColor + '44' }
                  : { backgroundColor: '#1e1e1e', borderColor: '#2a2a2a' },
              ]}
            >
              <View style={styles.rankBox}>
                {rankIdx < 3 ? (
                  <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[rankIdx]} />
                ) : (
                  <Text style={styles.rankNum}>#{entry.rank}</Text>
                )}
              </View>
              <Avatar id={entry.user_id} name={displayName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, entry.is_me && { color: accentColor }]} numberOfLines={1}>
                  {displayName}
                  {entry.is_me ? t('youSuffix') : ''}
                </Text>
                <Text style={styles.rowUsername} numberOfLines={1}>
                  {entry.username ?? ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowScore, entry.is_me && { color: accentColor }]}>
                  {challenge
                    ? formatChallengeScore(entry.score, challenge.metric, '')
                    : formatNumber(entry.score)}
                </Text>
                <Text style={styles.rowUnit}>{t('lvl', { level: entry.level })}</Text>
              </View>
            </View>
          );
        })}

        {/* Refresh button */}
        {entries.length > 0 && (
          <Pressable
            onPress={() => user?.id && id && loadLeaderboard(id, user.id)}
            style={styles.refreshBtn}
          >
            <RefreshCw size={12} strokeWidth={2} color="#383838" />
            <Text style={styles.refreshText}>{t('detail.refresh')}</Text>
          </Pressable>
        )}

        {/* Join / Leave button */}
        {challenge && challenge.status === 'active' && (
          <Pressable
            onPress={challenge.is_joined ? handleLeave : handleJoin}
            disabled={joining}
            style={{ marginTop: 8, marginBottom: 16, borderRadius: 14, overflow: 'hidden' }}
          >
            {challenge.is_joined ? (
              <View style={styles.leaveBtn}>
                <CheckCircle size={15} strokeWidth={2} color="#555" />
                <Text style={styles.leaveBtnText}>{t('detail.joinedTapToLeave')}</Text>
              </View>
            ) : joining ? (
              <LinearGradient
                colors={[accentColor, accentColor + '99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.joinBtn}
              >
                <ActivityIndicator size="small" color="#fff" />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[accentColor, accentColor + '99']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.joinBtn}
              >
                <Zap size={15} strokeWidth={2} color="#fff" />
                <Text style={styles.joinBtnText}>{t('detail.joinChallenge')}</Text>
              </LinearGradient>
            )}
          </Pressable>
        )}

        {challenge?.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Trophy size={15} strokeWidth={1.8} color="#d4a017" />
            <Text style={styles.completedText}>{t('detail.challengeEnded')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 3,
    color: Colors.primary,
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  skeleton: {
    height: 180,
    opacity: 0.4,
    borderColor: '#2a2a2a',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 2,
    color: Colors.primary,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  prizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  prizeLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 2,
  },
  prizeVal: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 2,
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.primary,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  rankBadgeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(230,48,48,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.accent,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 3,
    color: '#555',
    marginBottom: 10,
  },
  emptyBoard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 40,
    gap: 6,
    marginBottom: 16,
  },
  emptyBoardText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    letterSpacing: 2,
    color: '#fff',
  },
  emptyBoardSub: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  rankBox: {
    width: 24,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankNum: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: '#555',
  },
  rowName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.primary,
  },
  rowUsername: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  rowScore: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.primary,
  },
  rowUnit: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 1,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  refreshText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2,
    color: '#383838',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  joinBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 3,
    color: '#fff',
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
  },
  leaveBtnText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 2,
    color: '#555',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(212,160,23,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.3)',
    marginBottom: 16,
  },
  completedText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 2,
    color: '#d4a017',
  },
  errorCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#555',
  },
});
