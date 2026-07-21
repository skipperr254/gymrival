import { Text, View } from 'react-native';
import { BackButton } from '@/components/ui/BackButton';

/** Shared back-row + title header for the Social sub-screens (Messages, Friends). */
export function SocialSubHeader({ title }: { title: string }) {
  return (
    <View>
      <View className="px-4 pt-3">
        <BackButton />
      </View>
      <Text className="font-heading text-white tracking-[4px] text-[26px] leading-8 px-4 pb-2.5 pt-1">
        {title}
      </Text>
    </View>
  );
}
