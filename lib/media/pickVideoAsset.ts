import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';

export interface PickedVideoAsset {
  uri: string;
  thumbnailUri: string;
  durationSec: number;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
}

export type PickVideoResult =
  | { status: 'picked'; asset: PickedVideoAsset }
  | { status: 'permission_denied' }
  | { status: 'canceled' };

const MAX_DURATION_SEC = 60;

async function processPickerAsset(
  pickerAsset: ImagePicker.ImagePickerAsset
): Promise<PickedVideoAsset> {
  const videoUri = pickerAsset.uri;
  const rawDuration = pickerAsset.duration ?? 0;
  // expo-image-picker returns duration in milliseconds on some platforms
  const durationSec = rawDuration > 1000 ? Math.round(rawDuration / 1000) : Math.round(rawDuration);
  const fileSizeBytes = pickerAsset.fileSize ?? 0;

  // Generate thumbnail from first frame. The rendered frame's dimensions
  // respect rotation metadata, unlike the picker's container dimensions on
  // some Android encoders — so prefer them for the video's width/height.
  let thumbnailUri = '';
  let width: number | null = pickerAsset.width || null;
  let height: number | null = pickerAsset.height || null;
  try {
    const thumb = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0, quality: 0.7 });
    thumbnailUri = thumb.uri;
    if (thumb.width && thumb.height) {
      width = thumb.width;
      height = thumb.height;
    }
  } catch {
    // Thumbnail failure is non-fatal — upload will proceed without one
  }

  return { uri: videoUri, thumbnailUri, durationSec, fileSizeBytes, width, height };
}

/** Launches the device photo library scoped to videos and processes the pick. */
export async function pickVideoFromLibrary(): Promise<PickVideoResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { status: 'permission_denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: MAX_DURATION_SEC,
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
  return { status: 'picked', asset: await processPickerAsset(result.assets[0]) };
}

/** Launches the device camera scoped to video recording and processes the result. */
export async function recordVideoFromCamera(): Promise<PickVideoResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return { status: 'permission_denied' };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: MAX_DURATION_SEC,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
  return { status: 'picked', asset: await processPickerAsset(result.assets[0]) };
}
