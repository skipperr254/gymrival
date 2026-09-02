import * as ImagePicker from 'expo-image-picker';

export interface PickedAvatarAsset {
  uri: string;
  mimeType: string;
}

export type PickAvatarResult =
  | { status: 'picked'; asset: PickedAvatarAsset }
  | { status: 'permission_denied' }
  | { status: 'canceled' };

// The 'avatars' storage bucket only allows an exact-match MIME allow-list
// (image/jpeg, image/png, image/webp — see migration 037). On Android,
// expo-image-picker frequently returns an empty string (not undefined) for
// a library-picked/cropped asset's mimeType, which `??` doesn't catch and
// 'image/jpg' (missing the 'e') also shows up on some devices — both get
// rejected outright by the bucket's allow-list before any file is written.
function normalizeMimeType(mimeType: string | null | undefined): string {
  if (mimeType === 'image/jpg') return 'image/jpeg';
  return mimeType || 'image/jpeg';
}

function toResult(result: ImagePicker.ImagePickerResult): PickAvatarResult {
  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };
  const asset = result.assets[0];
  return {
    status: 'picked',
    asset: { uri: asset.uri, mimeType: normalizeMimeType(asset.mimeType) },
  };
}

/** Launches the device photo library scoped to images with a square crop for the avatar. */
export async function pickAvatarFromLibrary(): Promise<PickAvatarResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { status: 'permission_denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return toResult(result);
}

/** Launches the device camera scoped to a square photo crop for the avatar. */
export async function takeAvatarPhoto(): Promise<PickAvatarResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return { status: 'permission_denied' };

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  return toResult(result);
}
