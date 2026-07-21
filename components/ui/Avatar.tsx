import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts, AvatarPalette } from '@/constants/theme';

const SIZE_PRESETS = { sm: 32, md: 44, lg: 56, xl: 72 } as const;

export type AvatarSize = keyof typeof SIZE_PRESETS | number;

export interface AvatarProps {
  /** Display name — used both for initials and as the color-hash fallback key. */
  name: string;
  /** Stable identifier (user id) preferred for the color hash so it never changes if the name does. */
  userId?: string;
  /** Uploaded profile photo URL. When present, renders the photo instead of initials. */
  avatarUrl?: string | null;
  size?: AvatarSize;
  /** Shows a small green presence dot, bottom-right. */
  online?: boolean;
}

function hashToIndex(key: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

/** Deterministic on-brand color for a user's generated avatar. */
export function getAvatarColor(key: string): string {
  return AvatarPalette[hashToIndex(key, AvatarPalette.length)];
}

/** Google-style monogram: the first letter of the name, uppercased. */
function getInitial(name: string): string {
  const first = name.trim()[0];
  return first ? first.toUpperCase() : '?';
}

/**
 * The single avatar renderer used everywhere in the app. Shows the user's
 * uploaded photo when they have one; otherwise falls back to a deterministic
 * Google-style monogram avatar: a single first-letter over a flat, solid color
 * derived from userId (or name if no id is available), so every user gets a
 * distinct, stable avatar out of the box.
 */
export function Avatar({ name, userId, avatarUrl, size = 'md', online = false }: AvatarProps) {
  const diameter = typeof size === 'number' ? size : SIZE_PRESETS[size];
  // ~0.45 of the diameter fills the circle the way Google's monograms do —
  // noticeably larger than the old 0.32 so the letter reads as the focal point.
  const fontSize = Math.round(diameter * 0.45);

  return (
    <View style={{ width: diameter, height: diameter, flexShrink: 0 }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: diameter, height: diameter, borderRadius: diameter / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View
          style={{
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: getAvatarColor(userId ?? name),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: Fonts.display, fontSize, color: Colors.primary }}>
            {getInitial(name)}
          </Text>
        </View>
      )}
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: Colors.success,
            borderWidth: 2,
            borderColor: Colors.base,
          }}
        />
      )}
    </View>
  );
}
