import { StyleSheet, Text, View } from 'react-native';
import { Fonts } from '@/constants/theme';

const AVATAR_COLORS = [
  '#e63030',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#0ea5e9',
  '#f97316',
];

const SIZE_MAP = {
  sm: { diameter: 32, fontSize: 12 },
  md: { diameter: 44, fontSize: 16 },
  lg: { diameter: 56, fontSize: 20 },
  xl: { diameter: 72, fontSize: 24 },
} as const;

export type AvatarSize = keyof typeof SIZE_MAP;

export interface AvatarProps {
  name: string;
  userId?: string;
  size?: AvatarSize;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getColor(userId: string): string {
  return AVATAR_COLORS[hashString(userId) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function Avatar({ name, userId, size = 'md' }: AvatarProps) {
  const { diameter, fontSize } = SIZE_MAP[size];
  const bgColor = getColor(userId ?? name);
  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        { width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: Fonts.display,
    color: '#ffffff',
    letterSpacing: 1,
  },
});
