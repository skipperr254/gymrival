import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useSocialStore } from '@/store/useSocialStore';
import { FeedPostCard, FeedSkeleton, SocialHeader } from '@/components/features/social';
import { ErrorState } from '@/components/ui';
import type { FeedPost } from '@/types/social';

export default function SocialScreen() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const feed = useSocialStore((s) => s.feed);
  const feedLoading = useSocialStore((s) => s.feedLoading);
  const feedError = useSocialStore((s) => s.feedError);
  const feedLoadingMore = useSocialStore((s) => s.feedLoadingMore);
  const feedHasMore = useSocialStore((s) => s.feedHasMore);
  const feedParticipantIds = useSocialStore((s) => s.feedParticipantIds);
  const loadFeed = useSocialStore((s) => s.loadFeed);
  const loadMoreFeed = useSocialStore((s) => s.loadMoreFeed);
  const toggleLike = useSocialStore((s) => s.toggleLike);
  const deleteFeedPost = useSocialStore((s) => s.deleteFeedPost);
  const subscribeToFeedEvents = useSocialStore((s) => s.subscribeToFeedEvents);
  const loadRequests = useSocialStore((s) => s.loadRequests);
  const subscribeToFriendEvents = useSocialStore((s) => s.subscribeToFriendEvents);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const subscribeToInbox = useChatStore((s) => s.subscribeToInbox);

  const [refreshing, setRefreshing] = useState(false);

  // The single post whose video is allowed to autoplay (and the only mounted
  // VideoView surface — see FeedVideo for the Android SurfaceView rationale).
  const [activePostId, setActivePostId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    loadFeed(userId);
  }, [userId, loadFeed]);

  // Feed realtime — once participant IDs are known
  useEffect(() => {
    if (!userId || feedParticipantIds.length === 0) return;
    return subscribeToFeedEvents(userId, feedParticipantIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, feedParticipantIds.join(',')]);

  // Header badge data (unread messages + pending friend requests) is loaded
  // and subscribed on focus: the pushed Messages/Friends screens take over the
  // singleton inbox/friend channels while open, so the feed re-subscribes when
  // the user comes back. On blur, deactivate the video so its surface unmounts.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadConversations(userId);
      loadRequests(userId);
      const unsubInbox = subscribeToInbox(userId);
      const unsubFriends = subscribeToFriendEvents(userId);
      return () => {
        unsubInbox();
        unsubFriends();
        setActivePostId(null);
      };
      // Store actions are stable Zustand functions
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  // Viewability → autoplay. Both config and callback must be identity-stable
  // for the lifetime of the FlatList, hence the ref.
  const viewabilityPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 60, minimumViewTime: 150 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken<FeedPost>[] }) => {
        const firstVideo = viewableItems.find((v) => v.item?.video?.status === 'ready');
        setActivePostId(firstVideo?.item.id ?? null);
      },
    },
  ]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadFeed(userId);
    setRefreshing(false);
  }, [userId, loadFeed]);

  const handleToggleLike = useCallback(
    (postId: string) => {
      if (userId) toggleLike(userId, postId);
    },
    [userId, toggleLike]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const { error } = await deleteFeedPost(userId, postId);
      if (error) Alert.alert(t('deletePr.errorTitle'), t('deletePr.errorMsg'));
    },
    [userId, deleteFeedPost, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <FeedPostCard
        post={item}
        userId={userId}
        isActive={item.id === activePostId}
        onToggleLike={handleToggleLike}
        onDelete={handleDeletePost}
      />
    ),
    [userId, activePostId, handleToggleLike, handleDeletePost]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <SocialHeader />

      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        viewabilityConfigCallbackPairs={viewabilityPairs.current}
        windowSize={5}
        maxToRenderPerBatch={4}
        initialNumToRender={3}
        removeClippedSubviews={Platform.OS === 'android'}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        onEndReached={() => userId && loadMoreFeed(userId)}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          feedLoading ? (
            <View>
              <FeedSkeleton />
              <FeedSkeleton />
              <FeedSkeleton />
            </View>
          ) : feedError ? (
            <View className="px-4">
              <ErrorState
                message={t('loadErrorFeed')}
                retryLabel={t('retry')}
                onRetry={() => userId && loadFeed(userId)}
              />
            </View>
          ) : (
            <View className="items-center py-16 px-8">
              <View className="w-16 h-16 rounded-full bg-surface border border-default items-center justify-center mb-4">
                <Dumbbell size={28} strokeWidth={1.4} color={Colors.hint} />
              </View>
              <Text className="font-heading text-lg tracking-[2px] text-white mb-2">
                {t('feedEmptyTitle')}
              </Text>
              <Text className="font-sans text-[13px] text-muted text-center leading-5">
                {t('feedEmptySubtitle')}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          feed.length === 0 ? null : feedLoadingMore ? (
            <View className="py-6">
              <ActivityIndicator color={Colors.accent} />
            </View>
          ) : !feedHasMore ? (
            <Text className="text-center py-6 font-heading text-[10px] text-[#383838] tracking-[2px]">
              {t('allCaughtUp')}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.base },
  listContent: { paddingTop: 4, paddingBottom: 96 },
});
