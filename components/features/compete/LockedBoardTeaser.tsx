import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, withAlpha } from '@/constants/theme';
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
            <View className="bg-elevated rounded-md w-7 h-4" />
            <View className="bg-elevated w-10.5 h-10.5 rounded-[21px]" />
            <View className="flex-1 gap-1.5">
              <View className="bg-elevated rounded-md h-3.25 w-[55%]" />
              <View className="bg-elevated rounded-md h-2.5 w-[35%]" />
            </View>
            <View className="bg-elevated rounded-md w-12 h-6" />
          </View>
        ))}
      </View>

      {/* The ask, sitting over the fade. */}
      <View className="items-center -mt-[86px] px-4">
        <LinearGradient
          colors={[withAlpha(Colors.base, 0), Colors.base, Colors.base]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ width: '100%', paddingTop: 44, paddingBottom: 4, alignItems: 'center' }}
        >
          <View className="w-10 h-10 rounded-full bg-accent/12 items-center justify-center mb-2.5">
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
