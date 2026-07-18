import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Dumbbell, Activity, TrendingUp, Trophy, CheckCircle, ChevronRight,
  Clock, Gift, Users, Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import type { ChallengeWithStats } from '@/types/challenge';
import { endsInLabel, formatChallengeScore, metricLabel } from '@/types/challenge';
import { LeaderboardAvatar, MEDAL_COLORS } from './LeaderboardAvatar';
import { cStyles } from './styles';

const CHALLENGE_COLOR = '#e63030';

export function ChallengeCard({
  ch,
  topEntries,
  unit,
  onJoin,
  onLeave,
  joining,
}: {
  ch: ChallengeWithStats;
  topEntries: { user_id: string; full_name: string | null; username: string | null; score: number; is_me: boolean }[];
  unit: string;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
}) {
  const { t } = useTranslation('compete');
  const isFriend = ch.type === 'friend';
  const color    = isFriend ? '#4a9eff' : CHALLENGE_COLOR;
  const MetricIcon = ch.metric === 'most_improved' ? TrendingUp
    : ch.metric === 'total_volume' ? Activity
    : Dumbbell;

  return (
    <View style={[cStyles.card, { borderColor: color + '22' }]}>
      <View style={cStyles.cardHeader}>
        <View style={[cStyles.iconBox, { backgroundColor: color + '15', borderColor: color + '33' }]}>
          <MetricIcon size={22} strokeWidth={1.5} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cStyles.cardTitle}>{ch.title}</Text>
          <Text style={cStyles.cardDesc}>{ch.description ?? metricLabel(ch.metric)}</Text>
        </View>
      </View>

      <View style={cStyles.statsRow}>
        <View style={cStyles.statItem}>
          <Clock size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{endsInLabel(ch.ends_at)}</Text>
        </View>
        <View style={cStyles.statItem}>
          <Users size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{t('card.joined', { count: ch.participant_count })}</Text>
        </View>
        {!!ch.prize_label && (
          <View style={cStyles.statItem}>
            <Gift size={12} strokeWidth={1.8} color="#555" />
            <Text style={cStyles.statText}>{ch.prize_label}</Text>
          </View>
        )}
      </View>

      {topEntries.slice(0, 3).map((p, i) => {
        const displayName = p.full_name ?? p.username ?? t('unknown');
        return (
          <View key={p.user_id} style={cStyles.miniRow}>
            <View style={cStyles.miniMedal}>
              <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[i]} />
            </View>
            <LeaderboardAvatar id={p.user_id} name={displayName} size={26} />
            <Text style={[cStyles.miniName, p.is_me && { color, fontFamily: Fonts.bodyMedium }]}>
              {displayName}{p.is_me ? t('youSuffix') : ''}
            </Text>
            <Text style={[cStyles.miniVal, p.is_me && { color }]}>
              {formatChallengeScore(p.score, ch.metric, unit)}{' '}
              <Text style={cStyles.miniUnit}>{unit.toUpperCase()}</Text>
            </Text>
          </View>
        );
      })}

      {ch.is_joined && ch.user_rank != null && (
        <View style={[cStyles.statItem, { marginTop: 10, marginBottom: 2 }]}>
          <Trophy size={12} strokeWidth={1.8} color={color} />
          <Text style={[cStyles.statText, { color }]}>
            {t('card.yourRank', { rank: ch.user_rank })}
            {ch.user_score != null ? `  ·  ${formatChallengeScore(ch.user_score, ch.metric, unit)}` : ''}
          </Text>
        </View>
      )}

      <View style={cStyles.btnRow}>
        <Pressable onPress={ch.is_joined ? onLeave : onJoin} style={{ flex: 1 }} disabled={joining}>
          {ch.is_joined ? (
            <View style={cStyles.btnJoinedInactive}>
              <CheckCircle size={13} strokeWidth={2} color="#555" />
              <Text style={cStyles.btnJoinedText}>{t('card.joinedBtn')}</Text>
            </View>
          ) : joining ? (
            <View style={cStyles.btnJoinedInactive}>
              <ActivityIndicator size="small" color="#555" />
            </View>
          ) : (
            <LinearGradient
              colors={[color, color + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cStyles.btnJoin}
            >
              <Zap size={13} strokeWidth={2} color="#fff" />
              <Text style={cStyles.btnJoinText}>{t('card.joinBtn')}</Text>
            </LinearGradient>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(tabs)/compete/challenge/${ch.id}` as any)}
          style={[cStyles.btnViewAll, { borderColor: color + '44' }]}
        >
          <Text style={[cStyles.btnViewAllText, { color }]}>{t('card.viewAll')}</Text>
          <ChevronRight size={13} strokeWidth={2} color={color} />
        </Pressable>
      </View>
    </View>
  );
}
