import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

/** Shared back-row + title header for the Social sub-screens (Messages, Friends). */
export function SocialSubHeader({ title }: { title: string }) {
  const { t } = useTranslation('social');
  return (
    <View>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        className="flex-row items-center gap-1.5 px-4 pt-3 pb-1.5"
        hitSlop={8}
      >
        <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
        <Text className="font-heading text-[13px] text-accent tracking-[1px]">
          {t('backToSocial')}
        </Text>
      </Pressable>
      <Text className="font-heading text-white tracking-[4px] text-[26px] leading-8 px-4 pb-2.5">
        {title}
      </Text>
    </View>
  );
}
