import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Dumbbell, Activity, Target, Trophy, Search, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { formatNumber } from '@/lib/i18n/format';
import type { GlobalLeaderboardEntry } from '@/types/compete';
import { LeaderboardAvatar, MEDAL_COLORS } from './LeaderboardAvatar';
import { gStyles } from './styles';

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
  { key: 'bench_pr'    as const, labelKey: 'global.statBench', Icon: Dumbbell },
  { key: 'squat_pr'    as const, labelKey: 'global.statSquat', Icon: Activity },
  { key: 'deadlift_pr' as const, labelKey: 'global.statDead',  Icon: Target   },
] as const;

/** Skeleton placeholder rendered while the first page is loading. */
function GlobalEntrySkeleton() {
  return (
    <View style={[gStyles.card, gStyles.cardOther, gStyles.skeletonCard]}>
      <View style={gStyles.topRow}>
        <View style={[gStyles.skeletonBlock, { width: 28, height: 18 }]} />
        <View style={[gStyles.skeletonBlock, { width: 42, height: 42, borderRadius: 21 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[gStyles.skeletonBlock, { height: 13, width: '60%' }]} />
          <View style={[gStyles.skeletonBlock, { height: 10, width: '40%' }]} />
        </View>
        <View style={[gStyles.skeletonBlock, { width: 48, height: 26 }]} />
      </View>
      <View style={gStyles.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[gStyles.statBox, gStyles.skeletonBlock, { height: 50 }]} />
        ))}
      </View>
    </View>
  );
}

/** A single global leaderboard card. */
function GlobalEntryCard({
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
  const totalColor  = rankIndex === 0 ? (isMe ? '#000' : Colors.accent) : isMe ? '#333' : '#fff';
  const flag        = toFlagEmoji(entry.country_code);

  return (
    <View style={[gStyles.card, isMe ? gStyles.cardMe : gStyles.cardOther]}>
      <View style={gStyles.topRow}>
        <View style={gStyles.rankBox}>
          {rankIndex < 3 ? (
            <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[rankIndex]} />
          ) : (
            <Text style={gStyles.rankNum}>#{rank}</Text>
          )}
        </View>

        <LeaderboardAvatar id={entry.user_id} name={displayName} size={42} />

        <View style={gStyles.infoCol}>
          <View style={gStyles.nameRow}>
            <Text style={[gStyles.name, isMe && gStyles.nameMe]} numberOfLines={1}>
              {displayName.toUpperCase()}
            </Text>
            {!!flag && <Text style={gStyles.flagText}>{flag}</Text>}
            {isMe && <Text style={gStyles.youTag}>{t('you')}</Text>}
          </View>
          <Text style={[gStyles.sub, isMe && gStyles.subMe]} numberOfLines={1}>
            {entry.username ? `${entry.username} · ` : ''}{t('lvl', { level: entry.level })}
          </Text>
        </View>

        <View style={gStyles.totalBox}>
          <Text style={[gStyles.totalVal, { color: totalColor }]}>{formatNumber(total)}</Text>
          <Text style={[gStyles.totalLabel, isMe && gStyles.totalLabelMe]}>{t('global.totalKg')}</Text>
        </View>
      </View>

      <View style={gStyles.statsRow}>
        {GLOBAL_STAT_BOXES.map(s => {
          const StatIcon = s.Icon;
          return (
            <View key={s.key} style={[gStyles.statBox, isMe && gStyles.statBoxMe]}>
              <StatIcon size={12} strokeWidth={1.8} color={isMe ? '#888' : '#555'} />
              <Text style={[gStyles.statVal, isMe && gStyles.statValMe]}>
                {entry[s.key] > 0 ? formatNumber(entry[s.key]) : '–'}
              </Text>
              <Text style={[gStyles.statLabel, isMe && gStyles.statLabelMe]}>{t(s.labelKey)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[gStyles.barTrack, isMe && gStyles.barTrackMe]}>
        {isMe ? (
          <View style={[gStyles.barFillMe, { width: pct }]} />
        ) : (
          <LinearGradient
            colors={['#e63030', '#ff6b6b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[gStyles.barFillOther, { width: pct }]}
          />
        )}
      </View>
    </View>
  );
}

export function GlobalContent({ onRefreshScrollView }: { onRefreshScrollView?: () => void }) {
  const { t } = useTranslation('compete');
  const { user } = useAuthStore();
  const {
    globalEntries,
    myGlobalRank,
    loadingGlobal,
    loadingMyRank,
    globalHasMore,
    globalError,
    loadGlobalLeaderboard,
    loadMoreGlobal,
    loadMyGlobalRank,
  } = useCompeteStore();

  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstLoad = globalEntries.length === 0 && loadingGlobal;

  // Initial load
  useEffect(() => {
    if (!user?.id) return;
    loadGlobalLeaderboard(user.id, '');
    loadMyGlobalRank(user.id);
  }, [user?.id, loadGlobalLeaderboard, loadMyGlobalRank]);

  // Debounced search — new search resets to page 0
  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (user?.id) loadGlobalLeaderboard(user.id, text);
    }, 400);
  };

  const handleRefresh = () => {
    if (!user?.id) return;
    loadGlobalLeaderboard(user.id, search);
    loadMyGlobalRank(user.id);
    onRefreshScrollView?.();
  };

  const handleLoadMore = () => {
    if (user?.id && globalHasMore && !loadingGlobal) {
      loadMoreGlobal(user.id, search);
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

  return (
    <>
      {/* Search bar */}
      <View style={gStyles.searchWrap}>
        <Search size={16} strokeWidth={1.8} color="#555" style={gStyles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder={t('global.searchPlaceholder')}
          placeholderTextColor="#555"
          style={gStyles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loadingGlobal && !isFirstLoad && (
          <ActivityIndicator
            size="small"
            color={Colors.accent}
            style={gStyles.searchSpinner}
          />
        )}
      </View>

      {/* Error state */}
      {!!globalError && !loadingGlobal && (
        <View style={gStyles.errorCard}>
          <AlertCircle size={22} strokeWidth={1.6} color="#e63030" />
          <Text style={gStyles.errorText}>{t('global.loadError')}</Text>
          <Pressable onPress={handleRefresh} style={gStyles.retryBtn}>
            <RefreshCw size={13} strokeWidth={2} color="#fff" />
            <Text style={gStyles.retryText}>{t('global.retry')}</Text>
          </Pressable>
        </View>
      )}

      {/* Skeleton while first page loads */}
      {isFirstLoad && (
        <>
          {[0, 1, 2, 3, 4].map(i => <GlobalEntrySkeleton key={i} />)}
        </>
      )}

      {/* Pinned "Your Rank" card — shown when user is outside the visible page */}
      {!isFirstLoad && showPinnedRank && (
        <View style={gStyles.pinnedWrap}>
          <Text style={gStyles.pinnedLabel}>{t('global.yourGlobalRank')}</Text>
          <GlobalEntryCard entry={myGlobalRank!} maxTotal={maxTotal} />
        </View>
      )}

      {/* Unranked call-to-action when user has no big-3 PRs */}
      {!isFirstLoad && !myGlobalRank && !loadingMyRank && !search && (
        <View style={gStyles.unrankedCard}>
          <Trophy size={26} strokeWidth={1.4} color="#333" />
          <Text style={gStyles.unrankedTitle}>{t('global.unrankedTitle')}</Text>
          <Text style={gStyles.unrankedSub}>{t('global.unrankedSub')}</Text>
        </View>
      )}

      {/* Leaderboard entries */}
      {!isFirstLoad && !globalError && globalEntries.map(entry => (
        <GlobalEntryCard key={entry.user_id} entry={entry} maxTotal={maxTotal} />
      ))}

      {/* No search results */}
      {!isFirstLoad && !loadingGlobal && !globalError && globalEntries.length === 0 && !!search && (
        <View style={gStyles.emptyCard}>
          <Search size={32} strokeWidth={1.4} color="#555" />
          <Text style={gStyles.emptyTitle}>{t('global.noResultsTitle')}</Text>
          <Text style={gStyles.emptySub}>{t('global.noResultsSub')}</Text>
        </View>
      )}

      {/* Empty leaderboard (no users have big-3 PRs yet) */}
      {!isFirstLoad && !loadingGlobal && !globalError && globalEntries.length === 0 && !search && (
        <View style={gStyles.emptyCard}>
          <Trophy size={32} strokeWidth={1.4} color="#555" />
          <Text style={gStyles.emptyTitle}>{t('global.noAthletesTitle')}</Text>
          <Text style={gStyles.emptySub}>{t('global.noAthletesSub')}</Text>
        </View>
      )}

      {/* Load more */}
      {!isFirstLoad && globalHasMore && globalEntries.length > 0 && (
        <Pressable onPress={handleLoadMore} style={gStyles.loadMoreBtn} disabled={loadingGlobal}>
          {loadingGlobal ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={gStyles.loadMoreText}>{t('global.loadMore')}</Text>
          )}
        </Pressable>
      )}

      {/* Refresh button (shown at bottom when fully loaded) */}
      {!isFirstLoad && !globalHasMore && globalEntries.length > 0 && (
        <Pressable onPress={handleRefresh} style={gStyles.refreshBtn} disabled={loadingGlobal}>
          <RefreshCw size={13} strokeWidth={2} color="#383838" />
          <Text style={gStyles.refreshText}>{t('global.refresh')}</Text>
        </Pressable>
      )}

      <Text style={gStyles.footerNote}>{t('global.footerNote')}</Text>
    </>
  );
}
