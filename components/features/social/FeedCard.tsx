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
import { feedStyles } from './feedStyles';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return formatRelativeTimeIntl(date);
  return formatDate(date);
}

/** Skeleton placeholder shown while the first feed page loads. */
export function FeedSkeleton() {
  return (
    <View style={[feedStyles.card, { borderColor: '#1e1e1e' }]}>
      {/* Header skeleton */}
      <View style={feedStyles.cardHeader}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#242424' }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 12, width: '45%', borderRadius: 6, backgroundColor: '#242424' }} />
          <View style={{ height: 10, width: '65%', borderRadius: 5, backgroundColor: '#1e1e1e' }} />
        </View>
        <View style={{ width: 40, height: 24, borderRadius: 8, backgroundColor: '#1e1e1e' }} />
      </View>
      {/* Media skeleton — 4:5 matches the default before thumbnail detection */}
      <View style={[feedStyles.mediaArea, { aspectRatio: 4 / 5, backgroundColor: '#191919' }]} />
      {/* Footer skeleton */}
      <View style={feedStyles.cardFooter}>
        <View style={{ height: 14, width: 80, borderRadius: 6, backgroundColor: '#242424' }} />
        <View style={{ height: 34, width: 90, borderRadius: 12, backgroundColor: '#1e1e1e' }} />
      </View>
    </View>
  );
}

/** The visual shown for a PR post with no attached video. */
function PRStatVisual({ post }: { post: FeedPost }) {
  const { t } = useTranslation('social');
  return (
    <View style={feedStyles.statVisual}>
      <LinearGradient
        colors={['#141414', '#0d0808']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Left accent strip */}
      <LinearGradient
        colors={[Colors.accent, Colors.accentDark]}
        style={feedStyles.statAccentStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Center content */}
      <View style={feedStyles.statContent}>
        <Text style={feedStyles.statExercise}>{post.exercise_label.toUpperCase()}</Text>
        <View style={feedStyles.statValueWrap}>
          <Text style={feedStyles.statValueText}>{post.value}</Text>
          <Text style={feedStyles.statUnitText}>{post.unit.toUpperCase()}</Text>
        </View>
      </View>
      {/* NEW PR badge */}
      <View style={feedStyles.newPrTag}>
        <Text style={feedStyles.newPrTagText}>{t('newPr')}</Text>
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
    <View style={feedStyles.card}>
      {/* ── Header: author info ── */}
      <View style={feedStyles.cardHeader}>
        <FriendAvatar id={post.user_id} name={displayName} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={feedStyles.authorName}>{displayName}</Text>
          <View style={feedStyles.metaRow}>
            <MapPin size={10} strokeWidth={2} color="#555" />
            <Text style={feedStyles.metaText}>{location} · {timestamp}</Text>
          </View>
        </View>
        <View style={feedStyles.levelPill}>
          <Text style={feedStyles.levelPillText}>{t('levelShort', { level: post.author_level })}</Text>
        </View>
      </View>

      {/* ── Media area — aspect ratio driven by video dimensions ── */}
      <View style={[feedStyles.mediaArea, { aspectRatio: hasVideo ? mediaRatio : 1 }]}>
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
          <View style={feedStyles.uploadingBadge}>
            <ActivityIndicator size="small" color="#555" style={{ transform: [{ scale: 0.75 }] }} />
            <Text style={feedStyles.uploadingBadgeText}>{t('videoUploading')}</Text>
          </View>
        )}

        {/* PR value overlay at bottom — only for video posts so it doesn't double with PRStatVisual */}
        {hasVideo && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.90)']}
            style={feedStyles.prOverlay}
            pointerEvents="none"
          >
            <Text style={feedStyles.prExercise}>{post.exercise_label.toUpperCase()}</Text>
            <View style={feedStyles.prValueRow}>
              <Text style={feedStyles.prValue}>{post.value}</Text>
              <Text style={feedStyles.prUnit}>{post.unit.toUpperCase()}</Text>
            </View>
          </LinearGradient>
        )}
      </View>

      {/* ── Footer: likes + action ── */}
      <View style={feedStyles.cardFooter}>
        <View style={feedStyles.likesDisplay}>
          <Flame size={16} strokeWidth={2} color={Colors.accent} />
          <Text style={feedStyles.likesCount}>{post.likes_count}</Text>
          <Text style={feedStyles.likesLabel}>{t('likes')}</Text>
        </View>
        {!isMe ? (
          <Pressable
            onPress={onLike}
            style={[feedStyles.likeBtn, post.has_liked && feedStyles.likeBtnActive]}
          >
            <Heart
              size={13}
              strokeWidth={2}
              fill={post.has_liked ? Colors.accent : 'none'}
              color={post.has_liked ? Colors.accent : '#707070'}
            />
            <Text style={[feedStyles.likeBtnText, post.has_liked && feedStyles.likeBtnTextActive]}>
              {post.has_liked ? t('liked') : t('like')}
            </Text>
          </Pressable>
        ) : (
          <Text style={feedStyles.yourPrLabel}>{t('yourPr')}</Text>
        )}
      </View>
    </View>
  );
}
