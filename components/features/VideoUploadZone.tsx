import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, Camera, X, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';

interface VideoAsset {
  uri: string;
  thumbnailUri: string;
  durationSec: number;
  fileSizeBytes: number;
}

interface Props {
  asset: VideoAsset | null;
  onVideoSelected: (asset: VideoAsset) => void;
  onVideoRemoved: () => void;
  disabled?: boolean;
}

const MAX_DURATION_SEC = 60;

export function VideoUploadZone({ asset, onVideoSelected, onVideoRemoved, disabled }: Props) {
  const { t } = useTranslation('logpr');
  const processAsset = useCallback(async (pickerAsset: ImagePicker.ImagePickerAsset) => {
    const videoUri = pickerAsset.uri;
    const rawDuration = pickerAsset.duration ?? 0;
    // expo-image-picker returns duration in milliseconds on some platforms
    const durationSec = rawDuration > 1000 ? Math.round(rawDuration / 1000) : Math.round(rawDuration);
    const fileSizeBytes = pickerAsset.fileSize ?? 0;

    // Generate thumbnail from first frame
    let thumbnailUri = '';
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 0,
        quality: 0.7,
      });
      thumbnailUri = thumb.uri;
    } catch {
      // Thumbnail failure is non-fatal — upload will proceed without one
    }

    onVideoSelected({ uri: videoUri, thumbnailUri, durationSec, fileSizeBytes });
  }, [onVideoSelected]);

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('video.permissionNeededTitle'), t('video.permissionLibraryMsg'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_DURATION_SEC,
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processAsset(result.assets[0]);
  }, [processAsset]);

  const recordFromCamera = useCallback(async () => {
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== 'granted') {
      Alert.alert(t('video.permissionNeededTitle'), t('video.permissionCameraMsg'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: MAX_DURATION_SEC,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await processAsset(result.assets[0]);
  }, [processAsset]);

  const showPickerOptions = useCallback(() => {
    if (disabled) return;
    Alert.alert(
      t('video.pickerTitle'),
      t('video.pickerMsg'),
      [
        { text: t('video.recordVideo'), onPress: recordFromCamera },
        { text: t('video.chooseFromLibrary'), onPress: pickFromLibrary },
        { text: t('video.cancel'), style: 'cancel' },
      ]
    );
  }, [disabled, pickFromLibrary, recordFromCamera]);

  if (asset) {
    return (
      <View style={styles.preview}>
        {asset.thumbnailUri ? (
          <Image source={{ uri: asset.thumbnailUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
            <Video size={28} strokeWidth={1.4} color="#444" />
          </View>
        )}
        {/* Overlay */}
        <View style={styles.previewOverlay}>
          {/* Duration badge */}
          <View style={styles.durationBadge}>
            <Clock size={10} strokeWidth={2} color="#ccc" />
            <Text style={styles.durationText}>{formatDuration(asset.durationSec)}</Text>
          </View>
          {/* Remove button */}
          <Pressable
            onPress={onVideoRemoved}
            style={styles.removeBtn}
            hitSlop={8}
          >
            <X size={14} strokeWidth={2.5} color="#fff" />
          </Pressable>
        </View>
        {/* Ready label */}
        <View style={styles.readyBadge}>
          <Text style={styles.readyBadgeText}>{t('video.readyLabel')}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={showPickerOptions}
      disabled={disabled}
      style={({ pressed }) => [
        styles.empty,
        pressed && !disabled && styles.emptyPressed,
        disabled && styles.emptyDisabled,
      ]}
    >
      <View style={styles.emptyIconRow}>
        <View style={styles.emptyIconWrap}>
          <Camera size={20} strokeWidth={1.6} color="#555" />
        </View>
        <View style={styles.emptyIconWrap}>
          <Video size={20} strokeWidth={1.4} color="#555" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{t('video.addProofTitle')}</Text>
      <Text style={styles.emptySub}>{t('video.addProofSub')}</Text>
    </Pressable>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  empty: {
    height: 130,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyPressed: {
    backgroundColor: '#1e1e1e',
    borderColor: '#3a3a3a',
  },
  emptyDisabled: {
    opacity: 0.4,
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    color: '#444',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#333',
  },
  preview: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0d0d0d',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  durationText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#ccc',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,204,68,0.85)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  readyBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#fff',
  },
});
