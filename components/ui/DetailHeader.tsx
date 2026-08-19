import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { BackButton } from './BackButton';

export type DetailHeaderProps = {
  /** Plain-text title, centered. Omit and use `children` for custom center content (e.g. an avatar row). */
  title?: string;
  /** Custom center content in place of `title` — controls its own alignment. */
  children?: ReactNode;
  /** Optional right-aligned slot (e.g. notifications' "mark all" action). */
  right?: ReactNode;
  /** Forwarded to BackButton — defaults to router.back(). */
  onBack?: () => void;
};

/**
 * Shared back-button + title header for every drill-down ("stacked") screen,
 * with the separator that keeps it visually distinct from the content below.
 * Use this instead of hand-rolling a header row so every pushed screen looks
 * and behaves identically.
 */
export function DetailHeader({ title, children, right, onBack }: DetailHeaderProps) {
  return (
    <View
      className="flex-row items-center px-4 py-3.5"
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault }}
    >
      <BackButton onPress={onBack} />
      <View className="flex-1 px-2">
        {children ?? (
          <Text
            className="text-center font-heading text-xl text-primary tracking-[2px]"
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
      <View className="items-end" style={{ minWidth: 36 }}>
        {right}
      </View>
    </View>
  );
}
