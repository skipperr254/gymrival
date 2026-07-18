import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Play, Maximize2 } from 'lucide-react-native';
import type { PRVideoStatus } from '@/types/pr';

interface Props {
  videoUrl: string;
  thumbnailUrl: string | null;
  status: PRVideoStatus;
  isOwn: boolean;
  /** Controlled by the parent feed: when false the VideoView surface is unmounted,
   *  preventing Android SurfaceView from bleeding into sibling cards. */
  isActive: boolean;
  /** Called when the user initiates playback — parent should set this card as the only active one */
  onPlayStart: () => void;
}

export function PRVideoPlayer({
  videoUrl,
  thumbnailUrl,
  status,
  isOwn: _isOwn,
  isActive,
  onPlayStart,
}: Props) {
  const [videoMounted, setVideoMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const viewRef = useRef<VideoView>(null);
  const pendingFullscreenRef = useRef(false);

  const player = useVideoPlayer(status === 'ready' ? videoUrl : null, (p) => {
    p.muted = false;
    p.loop = false;
  });

  // Reset when the video source or status changes
  useEffect(() => {
    setVideoMounted(false);
    setIsPlaying(false);
    pendingFullscreenRef.current = false;
    if (player && status !== 'ready') {
      try { player.pause(); } catch { /* player may not be initialised yet */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, status]);

  // When another card takes over, pause and unmount this VideoView surface.
  // Keeping a single SurfaceView active at a time is the only reliable fix
  // for Android's SurfaceView bleeding behind sibling React Native views.
  useEffect(() => {
    if (!isActive && videoMounted) {
      try { player.pause(); } catch { /* ignore */ }
      setVideoMounted(false);
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Start playback after the VideoView surface mounts
  useEffect(() => {
    if (!videoMounted) return;
    player.play();
    if (pendingFullscreenRef.current) {
      pendingFullscreenRef.current = false;
      viewRef.current?.enterFullscreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoMounted]);

  const handleTogglePlay = useCallback(() => {
    if (status !== 'ready') return;
    if (!videoMounted) {
      // First tap: notify parent (deactivates any other playing card), then mount
      onPlayStart();
      setVideoMounted(true);
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [videoMounted, isPlaying, player, status, onPlayStart]);

  const handleFullscreen = useCallback(() => {
    if (status !== 'ready') return;
    if (!videoMounted) {
      pendingFullscreenRef.current = true;
      onPlayStart();
      setVideoMounted(true);
      setIsPlaying(true);
      return;
    }
    if (!isPlaying) {
      player.play();
      setIsPlaying(true);
    }
    viewRef.current?.enterFullscreen();
  }, [videoMounted, isPlaying, player, status, onPlayStart]);

  if (status !== 'ready') return null;

  return (
    <Pressable onPress={handleTogglePlay} className="flex-1 bg-black overflow-hidden">
      {/* VideoView is only mounted when this card is the active one AND the user
          has tapped play. A single mounted SurfaceView at any time eliminates the
          Android bleed-through artifact. */}
      {videoMounted && isActive && (
        <VideoView
          ref={viewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen
        />
      )}

      {/* Thumbnail shown before first play. The container's aspectRatio is already
          sized to match the video (set by FeedCard via Image.getSize), so "cover"
          fills it edge-to-edge with no black bars. */}
      {!isPlaying && thumbnailUrl ? (
        <ExpoImage
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : !isPlaying ? (
        <View className="absolute inset-0 bg-[#080808]" />
      ) : null}

      {/* Play button — visible when paused */}
      {!isPlaying && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View className="w-[60px] h-[60px] rounded-full bg-black/60 border-2 border-white/25 items-center justify-center">
            <Play size={22} fill="#fff" strokeWidth={0} color="#fff" />
          </View>
        </View>
      )}

      {/* Fullscreen button — top-right */}
      <Pressable
        onPress={handleFullscreen}
        className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-lg bg-black/50 border border-white/10 items-center justify-center"
        hitSlop={14}
      >
        <Maximize2 size={13} strokeWidth={2} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </Pressable>
  );
}
