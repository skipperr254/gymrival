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
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const viewRef = useRef<VideoView>(null);

  const player = useVideoPlayer(status === 'ready' ? videoUrl : null, (p) => {
    p.muted = false;
    p.loop = false;
  });

  // Reset thumbnail overlay when source changes (e.g. status flips to ready)
  useEffect(() => {
    setShowThumbnail(true);
    setIsPlaying(false);
    if (player && status !== 'ready') {
      try { player.pause(); } catch { /* player may not be initialised */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, status]);

  const handleTogglePlay = useCallback(() => {
    if (status !== 'ready') return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
      setShowThumbnail(false);
    }
  }, [isPlaying, player, status]);

  const handleFullscreen = useCallback(() => {
    if (status !== 'ready') return;
    // Ensure video is playing when entering fullscreen
    if (!isPlaying) {
      player.play();
      setIsPlaying(true);
      setShowThumbnail(false);
    }
    viewRef.current?.enterFullscreen();
  }, [isPlaying, player, status]);

  if (status !== 'ready') return null;

  // ── Ready — show video player ─────────────────────────────────────────────────
  return (
    <Pressable
      onPress={handleTogglePlay}
      style={[styles.container, { height }]}
    >
      <VideoView
        ref={viewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen
      />

      {/* Thumbnail shown until first play */}
      {showThumbnail && thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* Dark fallback when no thumbnail and not yet playing */}
      {showThumbnail && !thumbnailUrl && (
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
    // Non-zero borderRadius forces Android to create a hardware compositing
    // layer, which prevents the native VideoView surface from bleeding outside
    // its bounds into adjacent cards in a ScrollView.
    borderRadius: 0.001,
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
