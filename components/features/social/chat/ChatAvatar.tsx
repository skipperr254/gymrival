import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

/** Deterministic gradient initials avatar for the chat screen (header + bubbles). */
export function ChatAvatar({
  userId,
  name,
  size = 40,
  online = false,
}: {
  userId: string;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const charSum = [...userId.replace(/-/g, '').slice(0, 8)].reduce(
    (s, c) => s + c.charCodeAt(0),
    0
  );
  const color = AVATAR_PALETTE[charSum % AVATAR_PALETTE.length];
  const initials = name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.3);

  return (
    <View style={{ position: 'relative', flexShrink: 0 }}>
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
        }}
      >
        <Text style={{ fontFamily: Fonts.display, fontSize, color: '#fff', letterSpacing: 1 }}>
          {initials}
        </Text>
      </LinearGradient>
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
