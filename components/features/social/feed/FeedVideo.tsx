import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Clock, Maximize2, Volume2, VolumeX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSocialStore } from '@/store/useSocialStore';

interface Props {
  /** Used as expo-image recyclingKey so thumbnails don't flash stale content */
  postId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  /**
   * True when this post is the feed's single active video (most visible on
   * screen). Only the active card loads a video source and mounts a VideoView
   * surface — one SurfaceView at a time is the only reliable fix for Android's
   * SurfaceView bleeding behind sibling views, and it caps player memory.
   */
  isActive: boolean;
}

// Configured once, on the first unmute — NOT at startup or during muted
// autoplay. Activating a playback audio session pauses the user's background
// music, so it must only happen when they actually ask for sound. With this
// set, unmuted videos are audible even with the iOS ringer switch off.
let audioSessionConfigured = false;
function enableAudioInSilentMode() {
  if (audioSessionConfigured) return;
  audioSessionConfigured = true;
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
    audioSessionConfigured = false; // retry on the next unmute
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FeedVideo({ postId, videoUrl, thumbnailUrl, durationSec, isActive }: Props) {
  const { t } = useTranslation('social');
  const viewRef = useRef<VideoView>(null);

  // Global feed mute (Instagram-style): read from the store here rather than
  // via props so toggling never re-renders the surrounding list rows.
  const feedMuted = useSocialStore((s) => s.feedMuted);
  const setFeedMuted = useSocialStore((s) => s.setFeedMuted);

  // The poster is shown only until the video renders its first frame. After
  // that it never returns for this activation, so any pause (fullscreen
  // dismiss, app background) freezes on the current frame instead of snapping
  // back to the thumbnail. Deactivation unmounts the surface and resets this,
  // so the poster correctly returns the next time the card becomes active.
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);

  const player = useVideoPlayer(isActive ? videoUrl : null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    try {
      player.muted = feedMuted;
    } catch {
      // Player may be mid-replace; the setup callback re-applies mute state
    }
  }, [feedMuted, player]);

  useEffect(() => {
    if (isActive) {
      try {
        player.play();
      } catch {
        // Player may not be initialised yet — playback starts once ready
      }
    } else {
      setFirstFrameRendered(false);
    }
  }, [isActive, player]);

  const handleTap = () => {
    if (!isActive) return;
    if (feedMuted) enableAudioInSilentMode();
    setFeedMuted(!feedMuted);
  };

  const handleFullscreen = () => {
    viewRef.current?.enterFullscreen();
  };

  return (
    <Pressable
      onPress={handleTap}
      accessibilityRole="button"
      accessibilityLabel={feedMuted ? t('soundOn') : t('soundOff')}
      className="flex-1 bg-black overflow-hidden"
    >
      {isActive && (
        <VideoView
          ref={viewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: true }}
          onFirstFrameRender={() => setFirstFrameRendered(true)}
        />
      )}

      {/* Poster — visible until the first video frame renders */}
      {!firstFrameRendered &&
        (thumbnailUrl ? (
          <ExpoImage
            source={{ uri: thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={postId}
            transition={100}
          />
        ) : (
          <View className="absolute inset-0 bg-[#080808]" />
        ))}

      {/* Duration badge — only meaningful while the poster is up */}
      {!firstFrameRendered && durationSec != null && durationSec > 0 && (
        <View className="absolute top-2.5 left-2.5 flex-row items-center gap-1 bg-black/60 rounded-full py-1 px-2">
          <Clock size={10} strokeWidth={2} color="#ccc" />
          <Text className="font-heading text-[11px] text-[#ccc]">
            {formatDuration(durationSec)}
          </Text>
        </View>
      )}

      {/* Fullscreen — top-right */}
      {isActive && (
        <Pressable
          onPress={handleFullscreen}
          accessibilityRole="button"
          className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-lg bg-black/50 border border-white/10 items-center justify-center"
          hitSlop={14}
        >
          <Maximize2 size={13} strokeWidth={2} color="rgba(255,255,255,0.7)" />
        </Pressable>
      )}

      {/* Mute badge — bottom-right, mirrors the global mute state */}
      {isActive && firstFrameRendered && (
        <View
          className="absolute bottom-2.5 right-2.5 w-[30px] h-[30px] rounded-full bg-black/60 border border-white/10 items-center justify-center"
          pointerEvents="none"
        >
          {feedMuted ? (
            <VolumeX size={14} strokeWidth={2} color="rgba(255,255,255,0.75)" />
          ) : (
            <Volume2 size={14} strokeWidth={2} color="#fff" />
          )}
        </View>
      )}
    </Pressable>
  );
}
