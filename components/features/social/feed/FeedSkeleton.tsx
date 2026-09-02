import { View } from 'react-native';
import { DEFAULT_FEED_RATIO } from './feedMedia';

/**
 * Skeleton placeholder shown while the first feed page loads. Edge-to-edge and
 * sized at the same default ratio as a real post so content doesn't jump when
 * data arrives.
 */
export function FeedSkeleton() {
  return (
    <View className="mb-3 border-b border-subtle">
      {/* Author row */}
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <View className="w-9 h-9 rounded-full bg-[#242424]" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-[45%] rounded-md bg-[#242424]" />
          <View className="h-2.5 w-[65%] rounded-md bg-surface" />
        </View>
        <View className="w-10 h-6 rounded-lg bg-surface" />
      </View>
      {/* Media */}
      <View className="bg-[#191919]" style={{ aspectRatio: DEFAULT_FEED_RATIO }} />
      {/* Action row */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="h-3.5 w-20 rounded-md bg-[#242424]" />
        <View className="h-[34px] w-[90px] rounded-xl bg-surface" />
      </View>
    </View>
  );
}
