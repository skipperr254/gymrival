import { View, Text } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MedalColors, Colors } from '@/constants/theme';
import { formatNumber } from '@/lib/i18n/format';
import type { ChallengeLeaderboardEntry, ChallengeMetric } from '@/types/challenge';
import { formatChallengeScore } from '@/types/challenge';
import { Avatar } from '@/components/ui/Avatar';

/** A single row in the challenge-detail leaderboard. */
export function ChallengeLeaderboardRow({
  entry,
  metric,
  accentColor,
}: {
  entry: ChallengeLeaderboardEntry;
  metric: ChallengeMetric | undefined;
  accentColor: string;
}) {
  const { t } = useTranslation('compete');
  const displayName = entry.full_name ?? entry.username ?? t('unknown');
  const rankIdx     = Number(entry.rank) - 1;
  const score = metric
    ? formatChallengeScore(entry.score, metric, '')
    : formatNumber(entry.score);

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl py-3 px-4 mb-2 border"
      style={
        entry.is_me
          ? { backgroundColor: accentColor + '12', borderColor: accentColor + '44' }
          : { backgroundColor: Colors.surface, borderColor: Colors.borderDefault }
      }
    >
      <View className="w-6 items-center shrink-0">
        {rankIdx < 3 ? (
          <Trophy size={16} strokeWidth={1.8} color={MedalColors[rankIdx]} />
        ) : (
          <Text className="font-heading text-xs text-muted">#{entry.rank}</Text>
        )}
      </View>
      <Avatar userId={entry.user_id} name={displayName} avatarUrl={entry.avatar_url} size={36} />
      <View className="flex-1">
        <Text
          className="font-sans-medium text-sm text-primary"
          style={entry.is_me ? { color: accentColor } : undefined}
          numberOfLines={1}
        >
          {displayName}
          {entry.is_me ? t('youSuffix') : ''}
        </Text>
        <Text className="font-sans text-[11px] text-muted" numberOfLines={1}>
          {entry.username ?? ''}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className="font-heading text-xl text-primary"
          style={entry.is_me ? { color: accentColor } : undefined}
        >
          {score}
        </Text>
        <Text className="font-heading text-[9px] text-muted tracking-[1px]">
          {t('lvl', { level: entry.level })}
        </Text>
      </View>
    </View>
  );
}
