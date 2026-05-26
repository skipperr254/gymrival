import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Play, Maximize2 } from 'lucide-react-native';
import type { PRVideoStatus } from '@/types/pr';

interface Props {
  videoUrl: string;
  thumbnailUrl: string | null;
  status: PRVideoStatus;
  /** True when the post belongs to the current viewer — shows upload states */
  isOwn: boolean;
  height?: number;
}

export function PRVideoPlayer({
  videoUrl,
  thumbnailUrl,
  status,
  isOwn,
  height = 200,
}: Props) {
  // videoMounted guards whether the native VideoView surface exists.
  // We defer mounting it until the user taps play — multiple mounted VideoViews
  // cause Android SurfaceView to render all videos on a single shared hardware
  // layer behind the UI, making cards appear as "windows" into the same surface.
  const [videoMounted, setVideoMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const viewRef = useRef<VideoView>(null);
  // Used to enter fullscreen as soon as VideoView mounts (on first-tap fullscreen)
  const pendingFullscreenRef = useRef(false);

  const player = useVideoPlayer(status === 'ready' ? videoUrl : null, (p) => {
    p.muted = false;
    p.loop = false;
  });

  // Reset state when the video source changes (e.g. status flips to ready)
  useEffect(() => {
    setVideoMounted(false);
    setIsPlaying(false);
    pendingFullscreenRef.current = false;
    if (player && status !== 'ready') {
      try { player.pause(); } catch { /* player may not be initialised yet */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, status]);

  // After VideoView mounts, start playback and handle any pending fullscreen request
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
      // First tap: mount the native surface and start playing
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
  }, [videoMounted, isPlaying, player, status]);

  const handleFullscreen = useCallback(() => {
    if (status !== 'ready') return;
    if (!videoMounted) {
      pendingFullscreenRef.current = true;
      setVideoMounted(true);
      setIsPlaying(true);
      return;
    }
    if (!isPlaying) {
      player.play();
      setIsPlaying(true);
    }
    viewRef.current?.enterFullscreen();
  }, [videoMounted, isPlaying, player, status]);

  if (status !== 'ready') return null;

  return (
    <Pressable
      onPress={handleTogglePlay}
      style={[styles.container, { height }]}
    >
      {/* Native VideoView surface — only mounted after first tap to avoid SurfaceView bleed */}
      {videoMounted && (
        <VideoView
          ref={viewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen
        />
      )}

      {/* Thumbnail / dark placeholder shown before first play */}
      {!isPlaying && thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {!isPlaying && !thumbnailUrl && (
        <View style={[StyleSheet.absoluteFill, styles.placeholderBg]} />
      )}

      {/* Play button — visible when paused */}
      {!isPlaying && (
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Play size={22} fill="#fff" strokeWidth={0} color="#fff" />
          </View>
        </View>
      )}

      {/* Fullscreen button — top-right corner */}
      <Pressable
        onPress={handleFullscreen}
        style={styles.fullscreenBtn}
        hitSlop={12}
      >
        <Maximize2 size={14} strokeWidth={2} color="#fff" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    overflow: 'hidden',
    borderRadius: 1,
  },
  placeholderBg: {
    backgroundColor: '#0d0d0d',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
