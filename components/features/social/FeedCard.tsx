import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Heart, MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { PRVideoPlayer } from '@/components/features/PRVideoPlayer';
import { formatDate, formatRelativeTime as formatRelativeTimeIntl } from '@/lib/i18n/format';
import type { FeedPost } from '@/types/social';
import { FriendAvatar } from './FriendAvatar';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return formatRelativeTimeIntl(date);
  return formatDate(date);
}

/** Skeleton placeholder shown while the first feed page loads. */
export function FeedSkeleton() {
  return (
    <View className="rounded-[20px] mb-3.5 overflow-hidden bg-[#1c1c1c] border-[1.5px] border-[#1e1e1e]">
      {/* Header skeleton */}
      <View className="flex-row items-center gap-3 px-3.5 pt-3.5 pb-3">
        <View className="w-[42px] h-[42px] rounded-full bg-[#242424]" />
        <View className="flex-1 gap-2">
          <View className="h-3 w-[45%] rounded-md bg-[#242424]" />
          <View className="h-2.5 w-[65%] rounded-md bg-[#1e1e1e]" />
        </View>
        <View className="w-10 h-6 rounded-lg bg-[#1e1e1e]" />
      </View>
      {/* Media skeleton — 4:5 matches the default before thumbnail detection */}
      <View className="bg-[#191919]" style={{ aspectRatio: 4 / 5 }} />
      {/* Footer skeleton */}
      <View className="flex-row items-center justify-between px-3.5 py-3.5">
        <View className="h-3.5 w-20 rounded-md bg-[#242424]" />
        <View className="h-[34px] w-[90px] rounded-xl bg-[#1e1e1e]" />
      </View>
    </View>
  );
}

/** The visual shown for a PR post with no attached video. */
function PRStatVisual({ post }: { post: FeedPost }) {
  const { t } = useTranslation('social');
  return (
    <View className="flex-1 overflow-hidden">
      <LinearGradient
        colors={['#141414', '#0d0808']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Left accent strip */}
      <LinearGradient
        colors={[Colors.accent, Colors.accentDark]}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Center content */}
      <View className="flex-1 items-center justify-center">
        <Text className="font-heading text-xs text-[#666] tracking-[3px] mb-1.5">
          {post.exercise_label.toUpperCase()}
        </Text>
        <View className="flex-row items-end gap-1">
          <Text className="font-heading text-[54px] text-white tracking-[2px] leading-[56px]">
            {post.value}
          </Text>
          <Text className="font-heading text-[22px] text-[#666] tracking-[2px] mb-1.5">
            {post.unit.toUpperCase()}
          </Text>
        </View>
      </View>
      {/* NEW PR badge */}
      <View className="absolute top-3 right-3 bg-[rgba(230,48,48,0.12)] border border-[rgba(230,48,48,0.30)] rounded-lg py-1.5 px-2.5">
        <Text className="font-heading text-[10px] text-accent tracking-[2px]">{t('newPr')}</Text>
      </View>
    </View>
  );
}

interface FeedCardProps {
  post: FeedPost;
  userId: string;
  isVideoActive: boolean;
  onVideoPlay: () => void;
  onLike: () => void;
}

export function FeedCard({ post, userId, isVideoActive, onVideoPlay, onLike }: FeedCardProps) {
  const { t } = useTranslation('social');
  const isMe = post.user_id === userId;
  const hasVideo = post.video?.status === 'ready';
  const isUploading = post.video?.status === 'uploading' && isMe;

  const displayName = post.author_name ?? post.author_username ?? t('athlete');
  const location = post.author_gym ?? t('gym');
  const timestamp = formatRelativeTime(post.created_at);

  // Dynamically derived from the thumbnail using Image.getSize.
  // Starts at 9:16 (tall portrait) so the card fills space while loading;
  // updates to the video's real ratio, clamped between 9:16 (max portrait)
  // and 16:9 (max landscape) so the card never exceeds those extremes.
  const [mediaRatio, setMediaRatio] = useState<number>(9 / 16);
  useEffect(() => {
    const thumb = post.video?.thumbnail_url;
    if (!thumb || !hasVideo) return;
    let cancelled = false;
    Image.getSize(
      thumb,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          const ratio = w / h;
          setMediaRatio(Math.min(Math.max(ratio, 9 / 16), 16 / 9));
        }
      },
      () => {} // leave default on error
    );
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.video?.thumbnail_url]);

  return (
    <View className="rounded-[20px] mb-3.5 overflow-hidden bg-[#1c1c1c] border-[1.5px] border-[#242424]">
      {/* ── Header: author info ── */}
      <View className="flex-row items-center gap-3 px-3.5 pt-3.5 pb-3">
        <FriendAvatar id={post.user_id} name={displayName} size={42} />
        <View className="flex-1">
          <Text className="font-sans-semibold text-sm text-white mb-0.5">{displayName}</Text>
          <View className="flex-row items-center gap-1">
            <MapPin size={10} strokeWidth={2} color="#555" />
            <Text className="font-sans text-[11px] text-[#555]">
              {location} · {timestamp}
            </Text>
          </View>
        </View>
        <View className="bg-[#232323] border border-[#2e2e2e] rounded-lg py-1 px-2">
          <Text className="font-heading text-[11px] text-[#606060] tracking-[1px]">
            {t('levelShort', { level: post.author_level })}
          </Text>
        </View>
      </View>

      {/* ── Media area — aspect ratio driven by video dimensions ── */}
      <View className="bg-black overflow-hidden" style={{ aspectRatio: hasVideo ? mediaRatio : 1 }}>
        {hasVideo ? (
          <PRVideoPlayer
            videoUrl={post.video!.video_url}
            thumbnailUrl={post.video!.thumbnail_url}
            status={post.video!.status}
            isOwn={isMe}
            isActive={isVideoActive}
            onPlayStart={onVideoPlay}
          />
        ) : (
          <PRStatVisual post={post} />
        )}

        {isUploading && (
          <View className="absolute top-2.5 left-3 flex-row items-center gap-1.5 bg-black/60 rounded-full py-[5px] px-2.5">
            <ActivityIndicator size="small" color="#555" style={{ transform: [{ scale: 0.75 }] }} />
            <Text className="font-heading text-[9px] text-[#666] tracking-[1.5px]">
              {t('videoUploading')}
            </Text>
          </View>
        )}

        {/* PR value overlay at bottom — only for video posts so it doesn't double with PRStatVisual */}
        {hasVideo && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.90)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 44 }}
            pointerEvents="none"
          >
            <Text className="font-heading text-[10px] text-[#bbb] tracking-[2.5px] mb-0.5">
              {post.exercise_label.toUpperCase()}
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-heading text-[32px] text-white tracking-[2px] leading-[34px]">
                {post.value}
              </Text>
              <Text className="font-heading text-base text-[#aaa]">{post.unit.toUpperCase()}</Text>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* ── Footer: likes + action ── */}
      <View className="flex-row items-center justify-between px-3.5 py-[13px]">
        <View className="flex-row items-center gap-1.5">
          <Flame size={16} strokeWidth={2} color={Colors.accent} />
          <Text className="font-heading text-lg text-white">{post.likes_count}</Text>
          <Text className="font-sans text-[11px] text-[#505050] tracking-[1px]">{t('likes')}</Text>
        </View>
        {!isMe ? (
          <Pressable
            onPress={onLike}
            className={`flex-row items-center gap-[7px] py-2.5 px-[18px] rounded-xl border-[1.5px] ${
              post.has_liked
                ? 'border-[rgba(230,48,48,0.50)] bg-[rgba(230,48,48,0.08)]'
                : 'border-[#2a2a2a] bg-[#242424]'
            }`}
          >
            <Heart
              size={13}
              strokeWidth={2}
              fill={post.has_liked ? Colors.accent : 'none'}
              color={post.has_liked ? Colors.accent : '#707070'}
            />
            <Text
              className={`font-heading text-xs tracking-[1px] ${
                post.has_liked ? 'text-accent' : 'text-[#707070]'
              }`}
            >
              {post.has_liked ? t('liked') : t('like')}
            </Text>
          </Pressable>
        ) : (
          <Text className="font-heading text-[11px] text-[#404040] tracking-[1px]">
            {t('yourPr')}
          </Text>
        )}
      </View>
    </View>
  );
}
