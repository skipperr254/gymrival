import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { FeedPost } from '@/types/social';

/** The visual shown for a PR post with no attached video — full-bleed stat card. */
export function FeedStatVisual({ post }: { post: FeedPost }) {
  const { t } = useTranslation('social');
  return (
    <View className="flex-1 overflow-hidden">
      <LinearGradient
        colors={['#141414', '#0d0808']}
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
        <Text className="font-heading text-xs text-[#666] tracking-[3px] mb-1.5">
          {post.exercise_label.toUpperCase()}
        </Text>
        <View className="flex-row items-end gap-1">
          <Text className="font-heading text-[54px] text-white tracking-[2px] leading-[56px]">
            {post.value}
          </Text>
          <Text className="font-heading text-[22px] text-[#666] tracking-[2px] mb-1.5">
            {post.unit.toUpperCase()}
          </Text>
        </View>
      </View>
      {/* NEW PR badge */}
      <View className="absolute top-3 right-3 bg-[rgba(230,48,48,0.12)] border border-[rgba(230,48,48,0.30)] rounded-lg py-1.5 px-2.5">
        <Text className="font-heading text-[10px] text-accent tracking-[2px]">{t('newPr')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
});
