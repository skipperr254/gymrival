import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Dumbbell, Activity, TrendingUp, Trophy, CheckCircle, ChevronRight,
  Clock, Gift, Users, Zap,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Fonts, MedalColors, Colors } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import type { ChallengeWithStats } from '@/types/challenge';
import { endsInLabel, formatChallengeScore, metricLabel } from '@/types/challenge';
import { Avatar } from '@/components/ui/Avatar';

const CHALLENGE_COLOR = Colors.accent;

export function ChallengeCard({
  ch,
  topEntries,
  unit,
  onJoin,
  onLeave,
  joining,
}: {
  ch: ChallengeWithStats;
  topEntries: { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; score: number; is_me: boolean }[];
  unit: string;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
}) {
  const { t } = useTranslation('compete');
  const isFriend = ch.type === 'friend';
  const color    = isFriend ? Colors.friend : CHALLENGE_COLOR;
  const MetricIcon = ch.exercise_key ? getExerciseIcon(ch.exercise_key)
    : ch.metric === 'most_improved' ? TrendingUp
    : ch.metric === 'total_volume' ? Activity
    : Dumbbell;

  return (
    <View className="bg-surface rounded-2xl py-4 px-[18px] mb-3 border" style={{ borderColor: color + '22' }}>
      <View className="flex-row items-start gap-3.5 mb-3.5">
        <View
          className="w-[46px] h-[46px] rounded-[13px] border items-center justify-center shrink-0"
          style={{ backgroundColor: color + '15', borderColor: color + '33' }}
        >
          <MetricIcon size={22} strokeWidth={1.5} color={color} />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-lg tracking-[2px] text-white mb-[3px]">{ch.title}</Text>
          <Text className="font-sans text-xs text-[#707070] leading-[18px]">
            {ch.description ?? metricLabel(ch.metric)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3.5 mb-3.5 flex-wrap">
        <View className="flex-row items-center gap-[5px]">
          <Clock size={12} strokeWidth={1.8} color={Colors.muted} />
          <Text className="font-sans text-[11px] text-[#606060]">{endsInLabel(ch.ends_at)}</Text>
        </View>
        <View className="flex-row items-center gap-[5px]">
          <Users size={12} strokeWidth={1.8} color={Colors.muted} />
          <Text className="font-sans text-[11px] text-[#606060]">
            {t('card.joined', { count: ch.participant_count })}
          </Text>
        </View>
        {!!ch.prize_label && (
          <View className="flex-row items-center gap-[5px]">
            <Gift size={12} strokeWidth={1.8} color={Colors.muted} />
            <Text className="font-sans text-[11px] text-[#606060]">{ch.prize_label}</Text>
          </View>
        )}
      </View>

      {topEntries.slice(0, 3).map((p, i) => {
        const displayName = p.full_name ?? p.username ?? t('unknown');
        return (
          <View key={p.user_id} className="flex-row items-center gap-2.5 mb-[7px]">
            <View className="w-5 items-center">
              <Trophy size={16} strokeWidth={1.8} color={MedalColors[i]} />
            </View>
            <Avatar userId={p.user_id} name={displayName} avatarUrl={p.avatar_url} size={26} />
            <Text
              className="flex-1 font-sans text-[13px] text-secondary"
              style={p.is_me ? { color, fontFamily: Fonts.bodyMedium } : undefined}
            >
              {displayName}{p.is_me ? t('youSuffix') : ''}
            </Text>
            <Text
              className="font-heading text-[15px] text-white"
              style={p.is_me ? { color } : undefined}
            >
              {formatChallengeScore(p.score, ch.metric, unit)}{' '}
              <Text className="font-sans text-[10px] text-muted">{unit.toUpperCase()}</Text>
            </Text>
          </View>
        );
      })}

      {ch.is_joined && ch.user_rank != null && (
        <View className="flex-row items-center gap-[5px] mt-2.5 mb-0.5">
          <Trophy size={12} strokeWidth={1.8} color={color} />
          <Text className="font-sans text-[11px]" style={{ color }}>
            {t('card.yourRank', { rank: ch.user_rank })}
            {ch.user_score != null ? `  ·  ${formatChallengeScore(ch.user_score, ch.metric, unit)}` : ''}
          </Text>
        </View>
      )}

      <View className="flex-row gap-2 mt-3.5">
        <Pressable onPress={ch.is_joined ? onLeave : onJoin} className="flex-1" disabled={joining}>
          {ch.is_joined ? (
            <View className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-elevated">
              <CheckCircle size={13} strokeWidth={2} color={Colors.muted} />
              <Text className="font-heading text-xs tracking-[2px] text-muted">
                {t('card.joinedBtn')}
              </Text>
            </View>
          ) : joining ? (
            <View className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-elevated">
              <ActivityIndicator size="small" color={Colors.muted} />
            </View>
          ) : (
            <LinearGradient
              colors={[color, color + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Zap size={13} strokeWidth={2} color={Colors.primary} />
              <Text className="font-heading text-xs tracking-[2px] text-white">
                {t('card.joinBtn')}
              </Text>
            </LinearGradient>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(tabs)/compete/challenge/${ch.id}` as any)}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border-[1.5px] bg-transparent"
          style={{ borderColor: color + '44' }}
        >
          <Text className="font-heading text-xs tracking-[2px]" style={{ color }}>
            {t('card.viewAll')}
          </Text>
          <ChevronRight size={13} strokeWidth={2} color={color} />
        </Pressable>
      </View>
    </View>
  );
}
