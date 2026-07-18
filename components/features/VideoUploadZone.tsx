import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Video, Camera, X, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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
      <View className="h-40 rounded-2xl overflow-hidden bg-[#0d0d0d]">
        {asset.thumbnailUri ? (
          <Image source={{ uri: asset.thumbnailUri }} className="absolute inset-0" resizeMode="cover" />
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-[#111]">
            <Video size={28} strokeWidth={1.4} color="#444" />
          </View>
        )}
        {/* Overlay */}
        <View className="absolute inset-0 flex-row justify-between items-start p-2.5 bg-black/25">
          {/* Duration badge */}
          <View className="flex-row items-center gap-1 bg-black/70 rounded-full py-1 px-2">
            <Clock size={10} strokeWidth={2} color="#ccc" />
            <Text className="font-heading text-[11px] text-[#ccc]">{formatDuration(asset.durationSec)}</Text>
          </View>
          {/* Remove button */}
          <Pressable
            onPress={onVideoRemoved}
            className="w-7 h-7 rounded-full bg-black/70 items-center justify-center"
            hitSlop={8}
          >
            <X size={14} strokeWidth={2.5} color="#fff" />
          </Pressable>
        </View>
        {/* Ready label */}
        <View className="absolute bottom-2.5 left-2.5 bg-[rgba(0,204,68,0.85)] rounded-full py-1 px-2.5">
          <Text className="font-heading text-[9px] tracking-[1.5px] text-white">
            {t('video.readyLabel')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={showPickerOptions}
      disabled={disabled}
      className={`h-[130px] rounded-2xl border-[1.5px] border-dashed bg-[#161616] items-center justify-center gap-1.5 ${
        disabled ? 'opacity-40' : ''
      }`}
      style={({ pressed }) =>
        pressed && !disabled ? { backgroundColor: '#1e1e1e', borderColor: '#3a3a3a' } : undefined
      }
    >
      <View className="flex-row gap-3 mb-1">
        <View className="w-10 h-10 rounded-xl bg-[#1e1e1e] items-center justify-center">
          <Camera size={20} strokeWidth={1.6} color="#555" />
        </View>
        <View className="w-10 h-10 rounded-xl bg-[#1e1e1e] items-center justify-center">
          <Video size={20} strokeWidth={1.4} color="#555" />
        </View>
      </View>
      <Text className="font-heading text-[11px] tracking-[2px] text-[#444]">
        {t('video.addProofTitle')}
      </Text>
      <Text className="font-sans text-[10px] text-[#333]">{t('video.addProofSub')}</Text>
    </Pressable>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
