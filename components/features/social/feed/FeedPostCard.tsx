import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Heart, MapPin, VideoOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { formatDate, formatRelativeTime as formatRelativeTimeIntl } from '@/lib/i18n/format';
import { deletePRVideoFiles, uploadPRVideo } from '@/lib/api';
import {
  pickVideoFromLibrary,
  recordVideoFromCamera,
  type PickVideoResult,
} from '@/lib/media/pickVideoAsset';
import type { FeedPost } from '@/types/social';
import { Avatar } from '@/components/ui/Avatar';
import { FeedStatVisual } from './FeedStatVisual';
import { FeedVideo } from './FeedVideo';
import { DEFAULT_FEED_RATIO, MAX_FEED_RATIO, MIN_FEED_RATIO, clampFeedRatio } from './feedMedia';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return formatRelativeTimeIntl(date);
  return formatDate(date);
}

interface FeedPostCardProps {
  post: FeedPost;
  userId: string;
  /** True when this post owns the feed's single autoplay video slot */
  isActive: boolean;
  onToggleLike: (postId: string) => void;
}

function FeedPostCardInner({ post, userId, isActive, onToggleLike }: FeedPostCardProps) {
  const { t } = useTranslation('social');
  const isMe = post.user_id === userId;
  const hasVideo = post.video?.status === 'ready';
  const isUploading = post.video?.status === 'uploading' && isMe;
  const isFailed = post.video?.status === 'failed' && isMe;

  const displayName = post.author_name ?? post.author_username ?? t('athlete');
  const location = post.author_gym ?? t('gym');
  const timestamp = formatRelativeTime(post.created_at);

  const [retryingVideo, setRetryingVideo] = useState(false);

  const runVideoPick = useCallback(
    async (
      picker: () => Promise<PickVideoResult>,
      permissionMsgKey: 'permissionLibraryMsg' | 'permissionCameraMsg'
    ) => {
      const result = await picker();
      if (result.status === 'permission_denied') {
        Alert.alert(t('logpr:video.permissionNeededTitle'), t(`logpr:video.${permissionMsgKey}`));
        return;
      }
      if (result.status !== 'picked') return;

      setRetryingVideo(true);
      if (post.video) {
        await deletePRVideoFiles(userId, post.id, post.video.video_path, post.video.thumbnail_path);
      }
      await uploadPRVideo(
        userId,
        post.id,
        result.asset.uri,
        result.asset.thumbnailUri || null,
        result.asset.durationSec,
        result.asset.fileSizeBytes,
        result.asset.width,
        result.asset.height
      );
      setRetryingVideo(false);
    },
    [post.id, post.video, userId, t]
  );

  const handleRetryVideo = useCallback(() => {
    if (retryingVideo) return;
    Alert.alert(t('logpr:video.pickerTitle'), t('logpr:video.pickerMsg'), [
      { text: t('logpr:video.recordVideo'), onPress: () => runVideoPick(recordVideoFromCamera, 'permissionCameraMsg') },
      { text: t('logpr:video.chooseFromLibrary'), onPress: () => runVideoPick(pickVideoFromLibrary, 'permissionLibraryMsg') },
      { text: t('logpr:video.cancel'), style: 'cancel' },
    ]);
  }, [retryingVideo, runVideoPick, t]);

  // Preferred: stored video dimensions (captured at upload). Legacy rows have
  // null dimensions — fall back to measuring the thumbnail so old landscape
  // clips aren't center-cropped into 4:5.
  const storedRatio = hasVideo
    ? clampFeedRatio(post.video?.video_width, post.video?.video_height)
    : null;
  const [legacyRatio, setLegacyRatio] = useState<number | null>(null);
  useEffect(() => {
    const thumb = post.video?.thumbnail_url;
    if (storedRatio !== null || !hasVideo || !thumb) return;
    let cancelled = false;
    Image.getSize(
      thumb,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setLegacyRatio(Math.min(Math.max(w / h, MIN_FEED_RATIO), MAX_FEED_RATIO));
        }
      },
      () => {} // keep default on error
    );
    return () => {
      cancelled = true;
    };
  }, [post.video?.thumbnail_url, storedRatio, hasVideo]);

  const mediaRatio = hasVideo ? (storedRatio ?? legacyRatio ?? DEFAULT_FEED_RATIO) : 1;

  return (
    <View className="mb-3 border-b border-subtle">
      {/* ── Author row ── */}
      <View className="flex-row items-center gap-3 px-4 py-2.5">
        <Avatar userId={post.user_id} name={displayName} avatarUrl={post.author_avatar_url} size={36} />
        <View className="flex-1">
          <Text className="font-sans-semibold text-sm text-white mb-0.5">{displayName}</Text>
          <View className="flex-row items-center gap-1">
            <MapPin size={10} strokeWidth={2} color={Colors.muted} />
            <Text className="font-sans text-[11px] text-muted">
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

      {/* ── Media — full-bleed, height driven by clamped aspect ratio ── */}
      <View className="bg-black overflow-hidden" style={{ aspectRatio: mediaRatio }}>
        {hasVideo ? (
          <FeedVideo
            postId={post.id}
            videoUrl={post.video!.video_url}
            thumbnailUrl={post.video!.thumbnail_url}
            durationSec={post.video!.duration_sec}
            isActive={isActive}
          />
        ) : (
          <FeedStatVisual post={post} />
        )}

        {isUploading && (
          <View className="absolute top-2.5 left-3 flex-row items-center gap-1.5 bg-black/60 rounded-full py-[5px] px-2.5">
            <ActivityIndicator size="small" color={Colors.muted} style={styles.uploadSpinner} />
            <Text className="font-heading text-[9px] text-[#666] tracking-[1.5px]">
              {t('videoUploading')}
            </Text>
          </View>
        )}

        {isFailed && (
          <Pressable
            onPress={handleRetryVideo}
            disabled={retryingVideo}
            className="absolute top-2.5 left-3 flex-row items-center gap-1.5 bg-black/60 rounded-full py-[5px] px-2.5"
            style={({ pressed }) => pressed && !retryingVideo && { opacity: 0.7 }}
          >
            {retryingVideo ? (
              <ActivityIndicator size="small" color="#666" style={styles.uploadSpinner} />
            ) : (
              <VideoOff size={11} strokeWidth={2} color="#666" />
            )}
            <Text className="font-heading text-[9px] text-[#666] tracking-[1.5px]">
              {retryingVideo ? t('videoUploading') : `${t('videoFailed')} · ${t('retry')}`}
            </Text>
          </Pressable>
        )}

        {/* PR value overlay — video posts only, so it doesn't double with FeedStatVisual */}
        {hasVideo && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.90)']}
            style={styles.valueOverlay}
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

      {/* ── Action row ── */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-1.5">
          <Flame size={16} strokeWidth={2} color={Colors.accent} />
          <Text className="font-heading text-lg text-white">{post.likes_count}</Text>
          <Text className="font-sans text-[11px] text-[#505050] tracking-[1px]">{t('likes')}</Text>
        </View>
        {!isMe ? (
          <Pressable
            onPress={() => onToggleLike(post.id)}
            className={`flex-row items-center gap-[7px] py-2 px-4 rounded-xl border-[1.5px] ${
              post.has_liked
                ? 'border-[rgba(230,48,48,0.50)] bg-[rgba(230,48,48,0.08)]'
                : 'border-default bg-[#242424]'
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
          <Text className="font-heading text-[11px] text-hint tracking-[1px]">
            {t('yourPr')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  uploadSpinner: { transform: [{ scale: 0.75 }] },
  valueOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 44,
  },
});

/**
 * Memoized so a change of the feed's active video id only re-renders the two
 * affected rows (the newly active and previously active posts).
 */
export const FeedPostCard = React.memo(FeedPostCardInner);
