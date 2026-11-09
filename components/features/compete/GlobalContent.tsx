import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Trophy, Search, RefreshCw, AlertCircle, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import type { GlobalLeaderboardEntry } from '@/types/compete';
import { useProGate } from '@/hooks/useProGate';
import { FREE_LIMITS } from '@/constants/entitlements';
import { LockedBoardTeaser } from './LockedBoardTeaser';
import { GlobalEntryCard, GlobalEntrySkeleton } from './GlobalEntryCard';

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

  // Depth and search are Pro; the viewer's own rank stays free (that is the
  // point — they can see they are #847 but not who is above them).
  const depthGate = useProGate('leaderboardDepth');
  const searchGate = useProGate('leaderboardSearch');

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
        {searchGate.locked ? (
          // Not just disabled — a dead input invites tapping with no
          // explanation. This one says why and routes to the paywall.
          <Pressable
            onPress={searchGate.requestUpgrade}
            accessibilityRole="button"
            className="flex-row items-center bg-surface rounded-[14px] border-[1.5px] border-default py-3 pl-[42px] pr-3.5"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text className="flex-1 font-sans text-sm text-muted" numberOfLines={1}>
              {t('global.searchLocked')}
            </Text>
            <Lock size={14} strokeWidth={2} color={Colors.hint} />
          </Pressable>
        ) : (
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
        )}
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
        <View className="items-center bg-accent/6 rounded-2xl border border-accent/20 py-7 px-5 gap-2 mt-4">
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
          <Trophy size={26} strokeWidth={1.4} color={Colors.ink800} />
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
        <View className="items-center bg-accent/6 rounded-2xl border border-accent/20 py-7 px-5 gap-2 mt-4 mb-1">
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

  // The server returns at most FREE_LIMITS.globalLeaderboardRows to a free
  // viewer, so a full page is the signal that the board continues past it.
  const showLockedTeaser =
    depthGate.locked &&
    !isFirstLoad &&
    !globalError &&
    globalEntries.length >= FREE_LIMITS.globalLeaderboardRows;

  const listFooter = (
    <>
      {showLockedTeaser && <LockedBoardTeaser onUpgradePress={depthGate.requestUpgrade} />}

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
      {!isFirstLoad && !globalHasMore && globalEntries.length > 0 && !showLockedTeaser && (
        <Pressable
          onPress={handleRefresh}
          className="flex-row items-center justify-center gap-1.5 py-2.5 mt-1"
          disabled={loadingGlobal}
        >
          <RefreshCw size={13} strokeWidth={2} color={Colors.ink750} />
          <Text className="font-heading text-[10px] tracking-[2px] text-ink-750">
            {t('global.refresh')}
          </Text>
        </Pressable>
      )}

      <Text className="text-center pt-4 pb-2 font-heading text-[10px] text-ink-750 tracking-[2px]">
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
