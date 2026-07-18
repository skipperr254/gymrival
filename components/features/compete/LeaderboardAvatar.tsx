import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';

/** Medal colours for the top-3 ranks (gold / silver / bronze), shared across leaderboards. */
export const MEDAL_COLORS = ['#d4a017', '#909090', '#a0522d'];

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

function avatarColorIndex(id: string | number): number {
  if (typeof id === 'number') return Math.abs(id);
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Gradient initials avatar used throughout the Compete tab leaderboards. */
export function LeaderboardAvatar({ id, name, size = 42 }: { id: string | number; name: string; size?: number }) {
  const { t } = useTranslation('compete');
  const color    = AVATAR_PALETTE[avatarColorIndex(id) % AVATAR_PALETTE.length];
  const initials = name === 'You' ? t('you') : name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.3);

  return (
    <LinearGradient
      colors={[color, '#1a1a1a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color + '55',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ fontFamily: Fonts.display, fontSize, color: '#fff', letterSpacing: 1 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}
