import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Gradients, MedalColors } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import { formatNumber } from '@/lib/i18n/format';
import type { GlobalLeaderboardEntry } from '@/types/compete';
import { Avatar } from '@/components/ui/Avatar';

/** Converts an ISO 3166-1 alpha-2 code (e.g. 'NL') to its Unicode flag emoji. */
function toFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6 - 65; // 🇦 = 0x1F1E6, 'A' = 65
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) + base,
    code.toUpperCase().charCodeAt(1) + base,
  );
}

const GLOBAL_STAT_BOXES = [
  { key: 'bench_pr'    as const, labelKey: 'global.statBench', Icon: getExerciseIcon('bench')    },
  { key: 'squat_pr'    as const, labelKey: 'global.statSquat', Icon: getExerciseIcon('squat')    },
  { key: 'deadlift_pr' as const, labelKey: 'global.statDead',  Icon: getExerciseIcon('deadlift') },
] as const;

/** Skeleton placeholder rendered while the first page is loading. */
export function GlobalEntrySkeleton() {
  return (
    <View className="rounded-2xl py-3.5 px-4 mb-2.5 mt-1.5 bg-surface border border-default opacity-[0.45]">
      <View className="flex-row items-center gap-3 mb-2.5">
        <View className="bg-elevated rounded-md" style={{ width: 28, height: 18 }} />
        <View className="bg-elevated rounded-md" style={{ width: 42, height: 42, borderRadius: 21 }} />
        <View className="flex-1 gap-1.5">
          <View className="bg-elevated rounded-md" style={{ height: 13, width: '60%' }} />
          <View className="bg-elevated rounded-md" style={{ height: 10, width: '40%' }} />
        </View>
        <View className="bg-elevated rounded-md" style={{ width: 48, height: 26 }} />
      </View>
      <View className="flex-row gap-1.5 mb-2.5">
        {[0, 1, 2].map(i => (
          <View key={i} className="flex-1 bg-elevated rounded-md" style={{ height: 50 }} />
        ))}
      </View>
    </View>
  );
}

/**
 * A single global leaderboard card. Memoized so search keystrokes and other
 * GlobalContent re-renders don't re-render every mounted card — with pages of
 * 50 heavy cards (gradient + 3 stat boxes each) that re-render was the main
 * source of typing lag on this tab.
 */
export const GlobalEntryCard = React.memo(function GlobalEntryCard({
  entry,
  maxTotal,
}: {
  entry: GlobalLeaderboardEntry;
  maxTotal: number;
}) {
  const { t } = useTranslation('compete');
  const { is_me: isMe, rank } = entry;
  const displayName = entry.full_name ?? entry.username ?? t('unknown');
  const total       = entry.total_kg;
  const safeDenom   = maxTotal > 0 ? maxTotal : 1;
  const pct         = `${Math.round((total / safeDenom) * 100)}%` as `${number}%`;
  const rankIndex   = rank - 1; // 0-based for medal color
  const totalColor  = rankIndex === 0 ? (isMe ? Colors.black : Colors.accent) : isMe ? Colors.ink800 : Colors.primary;
  const flag        = toFlagEmoji(entry.country_code);

  return (
    <View
      className={`rounded-2xl py-3.5 px-4 mb-2.5 mt-1.5 ${
        isMe ? 'bg-white' : 'bg-surface border border-default'
      }`}
      style={isMe ? { transform: [{ scale: 1.025 }] } : undefined}
    >
      <View className="flex-row items-center gap-3 mb-2.5">
        <View className="w-7 items-center shrink-0">
          {rankIndex < 3 ? (
            <Trophy size={16} strokeWidth={1.8} color={MedalColors[rankIndex]} />
          ) : (
            <Text className="font-heading text-[13px] text-ink-650">#{rank}</Text>
          )}
        </View>

        <Avatar userId={entry.user_id} name={displayName} avatarUrl={entry.avatar_url} size={42} />

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <Text
              className={`font-heading text-[15px] tracking-[1px] ${isMe ? 'text-black' : 'text-white'}`}
              numberOfLines={1}
            >
              {displayName.toUpperCase()}
            </Text>
            {!!flag && <Text className="text-sm">{flag}</Text>}
            {isMe && (
              <Text className="font-heading text-[9px] text-accent tracking-[1px]">{t('you')}</Text>
            )}
          </View>
          <Text
            className={`font-sans text-[11px] ${isMe ? 'text-ink-450' : 'text-muted'}`}
            numberOfLines={1}
          >
            {entry.username ? `${entry.username} · ` : ''}{t('lvl', { level: entry.level })}
          </Text>
        </View>

        <View className="items-end shrink-0">
          <Text className="font-heading text-[26px] leading-[26px]" style={{ color: totalColor }}>
            {formatNumber(total)}
          </Text>
          <Text
            className={`font-heading text-[9px] tracking-[1px] ${
              isMe ? 'text-ink-450' : 'text-ink-650'
            }`}
          >
            {t('global.totalKg')}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-1.5 mb-2.5">
        {GLOBAL_STAT_BOXES.map(s => {
          const StatIcon = s.Icon;
          return (
            <View
              key={s.key}
              className={`flex-1 rounded-[10px] py-[7px] px-[5px] items-center gap-0.5 ${
                isMe ? 'bg-black/[0.07]' : 'bg-black/30'
              }`}
            >
              <StatIcon size={12} strokeWidth={1.8} color={isMe ? Colors.ink450 : Colors.muted} />
              <Text
                className={`font-heading text-base ${isMe ? 'text-black' : 'text-white'}`}
              >
                {entry[s.key] > 0 ? formatNumber(entry[s.key]) : '–'}
              </Text>
              <Text
                className={`font-heading text-[8px] tracking-[1px] ${
                  isMe ? 'text-ink-450' : 'text-muted'
                }`}
              >
                {t(s.labelKey)}
              </Text>
            </View>
          );
        })}
      </View>

      <View className={`h-1 rounded overflow-hidden ${isMe ? 'bg-black/10' : 'bg-elevated'}`}>
        {isMe ? (
          <View className="h-1 rounded bg-black" style={{ width: pct }} />
        ) : (
          <LinearGradient
            colors={Gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4, borderRadius: 4, width: pct }}
          />
        )}
      </View>
    </View>
  );
});
