import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Search, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, MedalColors } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
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
function GlobalEntrySkeleton() {
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
const GlobalEntryCard = React.memo(function GlobalEntryCard({
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
  const totalColor  = rankIndex === 0 ? (isMe ? '#000' : Colors.accent) : isMe ? '#333' : Colors.primary;
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
            <Text className="font-heading text-[13px] text-[#505050]">#{rank}</Text>
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
            className={`font-sans text-[11px] ${isMe ? 'text-[#888]' : 'text-muted'}`}
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
              isMe ? 'text-[#888]' : 'text-[#505050]'
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
              <StatIcon size={12} strokeWidth={1.8} color={isMe ? '#888' : Colors.muted} />
              <Text
                className={`font-heading text-base ${isMe ? 'text-black' : 'text-white'}`}
              >
                {entry[s.key] > 0 ? formatNumber(entry[s.key]) : '–'}
              </Text>
              <Text
                className={`font-heading text-[8px] tracking-[1px] ${
                  isMe ? 'text-[#888]' : 'text-muted'
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
            colors={[Colors.accent, '#ff6b6b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 4, borderRadius: 4, width: pct }}
          />
        )}
      </View>
    </View>
  );
});

/**
 * Global leaderboard tab. Owns its own virtualized FlatList (the search bar
 * and status blocks live in the list header) — previously all loaded pages
 * rendered unvirtualized inside the Compete screen's ScrollView, so every
 * "Load More" permanently mounted 50 more cards.
 */
export function GlobalContent() {
  const { t } = useTranslation('compete');
  const userId = useAuthStore((s) => s.user?.id);

  const globalEntries = useCompeteStore((s) => s.globalEntries);
  const myGlobalRank = useCompeteStore((s) => s.myGlobalRank);
  const loadingGlobal = useCompeteStore((s) => s.loadingGlobal);
  const loadingMyRank = useCompeteStore((s) => s.loadingMyRank);
  const globalHasMore = useCompeteStore((s) => s.globalHasMore);
  const globalError = useCompeteStore((s) => s.globalError);
  const myRankError = useCompeteStore((s) => s.myRankError);
  const loadGlobalLeaderboard = useCompeteStore((s) => s.loadGlobalLeaderboard);
  const loadMoreGlobal = useCompeteStore((s) => s.loadMoreGlobal);
  const loadMyGlobalRank = useCompeteStore((s) => s.loadMyGlobalRank);

  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listRef = useRef<FlatList<GlobalLeaderboardEntry>>(null);
  const isFirstLoad = globalEntries.length === 0 && loadingGlobal;

  // Initial load
  useEffect(() => {
    if (!userId) return;
    loadGlobalLeaderboard(userId, '');
    loadMyGlobalRank(userId);
  }, [userId, loadGlobalLeaderboard, loadMyGlobalRank]);

  // Cancel a pending debounced search on unmount (e.g. switching tabs) —
  // otherwise it fires against the shared store after this screen is gone,
  // and can race with a fresh unfiltered load if the user comes back before
  // the 400ms delay elapses.
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Debounced search — new search resets to page 0
  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (userId) loadGlobalLeaderboard(userId, text);
    }, 400);
  };

  const handleRefresh = () => {
    if (!userId) return;
    loadGlobalLeaderboard(userId, search);
    loadMyGlobalRank(userId);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleLoadMore = () => {
    if (userId && globalHasMore && !loadingGlobal) {
      loadMoreGlobal(userId, search);
    }
  };

  // Determine whether the pinned "Your Rank" card should show.
  // Show it when:
  //   • user has big-3 PRs (myGlobalRank is not null)
  //   • user is not already visible in the current result set
  //   • we're not actively searching (searching for others shouldn't show a pin)
  const myEntryVisible = globalEntries.some(e => e.is_me);
  const showPinnedRank = !!myGlobalRank && !myEntryVisible && !search;

  // The reference total for progress bars is always the #1 athlete's total.
  // Fall back to myGlobalRank when entries are empty (e.g. user is alone).
  const maxTotal = globalEntries.length > 0
    ? globalEntries[0].total_kg
    : (myGlobalRank?.total_kg ?? 1);

  const renderItem = useCallback(
    ({ item }: { item: GlobalLeaderboardEntry }) => (
      <GlobalEntryCard entry={item} maxTotal={maxTotal} />
    ),
    [maxTotal]
  );

  // JSX elements (not inline component types) so React reconciles instead of
  // remounting — remounting the header would dismiss the search keyboard.
  const listHeader = (
    <>
      {/* Search bar */}
      <View className="relative mt-4 mb-1 justify-center">
        <Search
          size={16}
          strokeWidth={1.8}
          color={Colors.muted}
          style={{ position: 'absolute', left: 14, zIndex: 1 }}
        />
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder={t('global.searchPlaceholder')}
          placeholderTextColor={Colors.muted}
          className="bg-surface rounded-[14px] border-[1.5px] border-default py-3 pl-[42px] pr-3.5 font-sans text-sm text-white"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loadingGlobal && !isFirstLoad && (
          <ActivityIndicator
            size="small"
            color={Colors.accent}
            style={{ position: 'absolute', right: 14 }}
          />
        )}
      </View>

      {/* Error state */}
      {!!globalError && !loadingGlobal && (
        <View className="items-center bg-[rgba(230,48,48,0.06)] rounded-2xl border border-[rgba(230,48,48,0.2)] py-7 px-5 gap-2 mt-4">
          <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-secondary">{t('global.loadError')}</Text>
          <Pressable
            onPress={handleRefresh}
            className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
          >
            <RefreshCw size={13} strokeWidth={2} color={Colors.primary} />
            <Text className="font-heading text-xs tracking-[2px] text-white">
              {t('global.retry')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Pinned "Your Rank" card — shown when user is outside the visible page */}
      {!isFirstLoad && showPinnedRank && (
        <View className="mb-1">
          <Text className="font-heading text-[10px] tracking-[3px] text-accent mb-1 mt-4">
            {t('global.yourGlobalRank')}
          </Text>
          <GlobalEntryCard entry={myGlobalRank!} maxTotal={maxTotal} />
        </View>
      )}

      {/* Unranked call-to-action when user genuinely has no big-3 PRs — gated
          on !myRankError so a failed fetch doesn't tell a ranked user
          they're "unranked" (see also the myRankError block below). */}
      {!isFirstLoad && !myGlobalRank && !loadingMyRank && !myRankError && !search && (
        <View className="items-center bg-surface rounded-2xl py-8 px-5 gap-2 mt-4 mb-1 border border-default">
          <Trophy size={26} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-lg tracking-[2px] text-white mt-1">
            {t('global.unrankedTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted text-center leading-5">
            {t('global.unrankedSub')}
          </Text>
        </View>
      )}

      {/* myGlobalRank fetch failed — distinct from genuinely unranked */}
      {!isFirstLoad && !myGlobalRank && !loadingMyRank && !!myRankError && !search && (
        <View className="items-center bg-[rgba(230,48,48,0.06)] rounded-2xl border border-[rgba(230,48,48,0.2)] py-7 px-5 gap-2 mt-4 mb-1">
          <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-secondary">{t('global.myRankLoadError')}</Text>
          <Pressable
            onPress={() => userId && loadMyGlobalRank(userId)}
            className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
          >
            <RefreshCw size={13} strokeWidth={2} color={Colors.primary} />
            <Text className="font-heading text-xs tracking-[2px] text-white">
              {t('global.retry')}
            </Text>
          </Pressable>
        </View>
      )}
    </>
  );

  const listEmpty = isFirstLoad ? (
    <>
      {[0, 1, 2, 3, 4].map(i => <GlobalEntrySkeleton key={i} />)}
    </>
  ) : (
    <>
      {/* No search results */}
      {!loadingGlobal && !globalError && !!search && (
        <View className="items-center bg-surface rounded-2xl py-12 px-5 gap-2 mt-1.5">
          <Search size={32} strokeWidth={1.4} color={Colors.muted} />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('global.noResultsTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted">{t('global.noResultsSub')}</Text>
        </View>
      )}

      {/* Empty leaderboard (no users have big-3 PRs yet) */}
      {!loadingGlobal && !globalError && !search && (
        <View className="items-center bg-surface rounded-2xl py-12 px-5 gap-2 mt-1.5">
          <Trophy size={32} strokeWidth={1.4} color={Colors.muted} />
          <Text className="font-heading text-lg tracking-[2px] text-white">
            {t('global.noAthletesTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted">{t('global.noAthletesSub')}</Text>
        </View>
      )}
    </>
  );

  const listFooter = (
    <>
      {/* Load more */}
      {!isFirstLoad && globalHasMore && globalEntries.length > 0 && (
        <Pressable
          onPress={handleLoadMore}
          className="items-center justify-center py-3.5 my-1 rounded-[14px] border-[1.5px] border-default bg-surface min-h-[46px]"
          disabled={loadingGlobal}
        >
          {loadingGlobal ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text className="font-heading text-xs tracking-[3px] text-white">
              {t('global.loadMore')}
            </Text>
          )}
        </Pressable>
      )}

      {/* Refresh button (shown at bottom when fully loaded) */}
      {!isFirstLoad && !globalHasMore && globalEntries.length > 0 && (
        <Pressable
          onPress={handleRefresh}
          className="flex-row items-center justify-center gap-1.5 py-2.5 mt-1"
          disabled={loadingGlobal}
        >
          <RefreshCw size={13} strokeWidth={2} color="#383838" />
          <Text className="font-heading text-[10px] tracking-[2px] text-[#383838]">
            {t('global.refresh')}
          </Text>
        </Pressable>
      )}

      <Text className="text-center pt-4 pb-2 font-heading text-[10px] text-[#383838] tracking-[2px]">
        {t('global.footerNote')}
      </Text>
    </>
  );

  return (
    <FlatList
      ref={listRef}
      data={isFirstLoad || globalError ? [] : globalEntries}
      keyExtractor={(entry) => entry.user_id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={listFooter}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      windowSize={7}
      maxToRenderPerBatch={8}
      initialNumToRender={8}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
});
