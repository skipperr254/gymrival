import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';
import { formatNumber } from '@/lib/i18n/format';
import type { ChallengeLeaderboardEntry, ChallengeMetric } from '@/types/challenge';
import { formatChallengeScore } from '@/types/challenge';

const MEDAL_COLORS = ['#d4a017', '#909090', '#a0522d'];
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
          : { backgroundColor: '#1e1e1e', borderColor: '#2a2a2a' }
      }
    >
      <View className="w-6 items-center shrink-0">
        {rankIdx < 3 ? (
          <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[rankIdx]} />
        ) : (
          <Text className="font-heading text-xs text-[#555]">#{entry.rank}</Text>
        )}
      </View>
      <Avatar id={entry.user_id} name={displayName} size={36} />
      <View className="flex-1">
        <Text
          className="font-sans-medium text-sm text-primary"
          style={entry.is_me ? { color: accentColor } : undefined}
          numberOfLines={1}
        >
          {displayName}
          {entry.is_me ? t('youSuffix') : ''}
        </Text>
        <Text className="font-sans text-[11px] text-[#555]" numberOfLines={1}>
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
        <Text className="font-heading text-[9px] text-[#555] tracking-[1px]">
          {t('lvl', { level: entry.level })}
        </Text>
      </View>
    </View>
  );
}
