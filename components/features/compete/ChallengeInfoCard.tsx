import { View, Text } from 'react-native';
import {
  Trophy,
  Clock,
  Gift,
  Users,
  Zap,
  TrendingUp,
  Activity,
  Dumbbell,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, withAlpha } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import type { ChallengeWithStats } from '@/types/challenge';
import { endsInLabel, formatChallengeScore, metricLabel } from '@/types/challenge';

interface Props {
  challenge: ChallengeWithStats;
  /** Friend challenges use the friend accent; admin/global ones the red accent. */
  accentColor: string;
}

/** Header card on the challenge detail screen: title, prize, stats, your rank. */
export function ChallengeInfoCard({ challenge, accentColor }: Props) {
  const { t } = useTranslation('compete');

  const MetricIcon = challenge.exercise_key ? getExerciseIcon(challenge.exercise_key)
    : challenge.metric === 'most_improved' ? TrendingUp
    : challenge.metric === 'total_volume'  ? Activity
    : Dumbbell;

  return (
    <View
      className="bg-surface rounded-[20px] p-5 mb-5 border"
      style={{ borderColor: withAlpha(accentColor, 0.2) }}
    >
      <View
        className="w-[54px] h-[54px] rounded-2xl border items-center justify-center mb-3.5"
        style={{ backgroundColor: withAlpha(accentColor, 0.082), borderColor: withAlpha(accentColor, 0.2) }}
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
      <Text className="font-sans text-[13px] leading-5 mb-1 text-muted mt-0.5">
        {metricLabel(challenge.metric)}
      </Text>

      {!!challenge.prize_label && (
        <View
          className="flex-row items-center gap-2.5 bg-black/30 rounded-xl py-2.5 px-3.5 mt-3 mb-3.5 border"
          style={{ borderColor: withAlpha(accentColor, 0.2) }}
        >
          <Gift size={15} strokeWidth={1.8} color={accentColor} />
          <View>
            <Text className="font-heading text-[9px] text-muted tracking-[2px] mb-0.5">
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
          <Clock size={14} strokeWidth={1.8} color={Colors.muted} />
          <View>
            <Text className="font-heading text-[9px] text-muted tracking-[2px]">
              {t('detail.endsIn')}
            </Text>
            <Text className="font-heading text-lg text-primary">
              {endsInLabel(challenge.ends_at)}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <Users size={14} strokeWidth={1.8} color={Colors.muted} />
          <View>
            <Text className="font-heading text-[9px] text-muted tracking-[2px]">
              {t('detail.participants')}
            </Text>
            <Text className="font-heading text-lg text-primary">
              {challenge.participant_count}
            </Text>
          </View>
        </View>
        {challenge.reward_xp > 0 && (
          <View className="flex-row items-center gap-2">
            <Zap size={14} strokeWidth={1.8} color={Colors.muted} />
            <View>
              <Text className="font-heading text-[9px] text-muted tracking-[2px]">
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
          style={{ backgroundColor: withAlpha(accentColor, 0.082), borderColor: withAlpha(accentColor, 0.2) }}
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
  );
}
