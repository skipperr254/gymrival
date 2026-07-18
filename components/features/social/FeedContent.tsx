import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { FeedCard, FeedSkeleton } from './FeedCard';

export function FeedContent() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const {
    feed,
    feedLoading,
    feedParticipantIds,
    loadFeed,
    toggleLike,
    subscribeToFeedEvents,
  } = useSocialStore();

  // Tracks which post's VideoView is currently mounted.
  // Only one VideoView is alive at a time — eliminates Android SurfaceView bleed.
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    loadFeed(userId);
  }, [userId, loadFeed]);

  // Realtime subscription — set up once participant IDs are known
  useEffect(() => {
    if (!userId || feedParticipantIds.length === 0) return;
    return subscribeToFeedEvents(userId, feedParticipantIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, feedParticipantIds.join(',')]);

  if (feedLoading && feed.length === 0) {
    return (
      <>
        <FeedSkeleton />
        <FeedSkeleton />
        <FeedSkeleton />
      </>
    );
  }

  if (!feedLoading && feed.length === 0) {
    return (
      <View className="items-center py-16 px-8">
        <View className="w-16 h-16 rounded-full bg-surface border border-default items-center justify-center mb-4">
          <Dumbbell size={28} strokeWidth={1.4} color="#404040" />
        </View>
        <Text className="font-heading text-lg tracking-[2px] text-white mb-2">
          {t('feedEmptyTitle')}
        </Text>
        <Text className="font-sans text-[13px] text-[#555] text-center leading-5">
          {t('feedEmptySubtitle')}
        </Text>
      </View>
    );
  }

  return (
    <>
      {feed.map(post => (
        <FeedCard
          key={post.id}
          post={post}
          userId={userId}
          isVideoActive={playingPostId === post.id}
          onVideoPlay={() => setPlayingPostId(post.id)}
          onLike={() => toggleLike(userId, post.id)}
        />
      ))}
      <Text className="text-center py-6 font-heading text-[10px] text-[#383838] tracking-[2px]">
        {t('allCaughtUp')}
      </Text>
    </>
  );
}
