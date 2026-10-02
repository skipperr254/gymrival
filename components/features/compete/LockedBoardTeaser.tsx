import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { FREE_LIMITS } from '@/constants/entitlements';

/**
 * What a free viewer sees below the top {@link FREE_LIMITS.globalLeaderboardRows}
 * of the global board.
 *
 * The placeholder rows contain no data — they are empty shapes. The server
 * clamps the query (migration 057), so rows past the cap were never sent to
 * the device and there is nothing here to un-blur or inspect.
 *
 * Rendered as dimmed skeletons rather than a real blur: `expo-blur` is not a
 * dependency of this project and a teaser is not worth adding one for.
 */
export function LockedBoardTeaser({ onUpgradePress }: { onUpgradePress: () => void }) {
  const { t } = useTranslation('compete');

  return (
    <View className="mt-1">
      {/* Ghost rows, fading out — suggests the board continues past the cap. */}
      <View className="gap-2.5" pointerEvents="none">
        {[0.5, 0.3, 0.16].map((opacity, i) => (
          <View
            key={i}
            className="rounded-2xl py-3.5 px-4 bg-surface border border-default flex-row items-center gap-3"
            style={{ opacity }}
          >
            <View className="bg-elevated rounded-md" style={{ width: 28, height: 16 }} />
            <View className="bg-elevated" style={{ width: 42, height: 42, borderRadius: 21 }} />
            <View className="flex-1 gap-1.5">
              <View className="bg-elevated rounded-md" style={{ height: 13, width: '55%' }} />
              <View className="bg-elevated rounded-md" style={{ height: 10, width: '35%' }} />
            </View>
            <View className="bg-elevated rounded-md" style={{ width: 48, height: 24 }} />
          </View>
        ))}
      </View>

      {/* The ask, sitting over the fade. */}
      <View className="items-center -mt-[86px] px-4">
        <LinearGradient
          colors={['rgba(20,20,20,0)', '#141414', '#141414']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: '100%', paddingTop: 44, paddingBottom: 4, alignItems: 'center' }}
        >
          <View className="w-10 h-10 rounded-full bg-[rgba(230,48,48,0.12)] items-center justify-center mb-2.5">
            <Lock size={18} strokeWidth={2} color={Colors.accent} />
          </View>
          <Text className="font-heading text-[17px] tracking-[2px] text-primary text-center">
            {t('global.lockedTitle')}
          </Text>
          <Text className="font-sans text-[12px] text-muted text-center mt-1 mb-3.5 px-6 leading-[17px]">
            {t('global.lockedSub', { count: FREE_LIMITS.globalLeaderboardRows })}
          </Text>
          <Pressable
            onPress={onUpgradePress}
            accessibilityRole="button"
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28 }}
            >
              <Text className="font-heading text-[13px] tracking-[2.5px] text-primary">
                {t('global.lockedCta')}
              </Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}
