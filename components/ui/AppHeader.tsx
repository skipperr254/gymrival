import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type AppHeaderProps = {
  /** Optional right-aligned slot (icon buttons, etc). Omit for a brand-only header. */
  right?: ReactNode;
};

/**
 * Shared top-of-screen brand header. Renders the "GYM RIVAL" wordmark at a
 * fixed size/position so it never shifts between the Compete, Social, Train,
 * and Profile tab roots. Always render this outside any ScrollView/FlatList
 * so it stays planted while the content beneath it scrolls.
 */
export function AppHeader({ right }: AppHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
      <Text className="font-heading text-white tracking-[4px] text-[26px] leading-7">
        GYM RIVAL
      </Text>
      {right ? <View className="flex-row items-center gap-2.5">{right}</View> : null}
    </View>
  );
}
