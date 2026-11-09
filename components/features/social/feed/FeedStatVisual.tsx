import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Gradients } from '@/constants/theme';
import { getExerciseIcon } from '@/constants/exerciseIcons';
import type { FeedPost } from '@/types/social';

/** The visual shown for a PR post with no attached video — full-bleed stat card. */
export function FeedStatVisual({ post }: { post: FeedPost }) {
  const { t } = useTranslation('social');
  const ExIcon = getExerciseIcon(post.exercise_key);
  return (
    <View className="flex-1 overflow-hidden">
      <LinearGradient
        colors={Gradients.feedStat}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Left accent strip */}
      <LinearGradient
        colors={[Colors.accent, Colors.accentDark]}
        style={styles.accentStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Center content */}
      <View className="flex-1 items-center justify-center">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <ExIcon size={12} strokeWidth={2} color={Colors.ink600} />
          <Text className="font-heading text-xs text-ink-600 tracking-[3px]">
            {post.exercise_label.toUpperCase()}
          </Text>
        </View>
        <View className="flex-row items-end gap-1">
          <Text className="font-heading text-[54px] text-white tracking-[2px] leading-[56px]">
            {post.value}
          </Text>
          <Text className="font-heading text-[22px] text-ink-600 tracking-[2px] mb-1.5">
            {post.unit.toUpperCase()}
          </Text>
        </View>
      </View>
      {/* NEW PR badge */}
      <View className="absolute top-3 right-3 bg-accent/12 border border-accent/30 rounded-lg py-1.5 px-2.5">
        <Text className="font-heading text-[10px] text-accent tracking-[2px]">{t('newPr')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
});
