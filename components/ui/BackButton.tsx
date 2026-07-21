import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { rtlIconFlip } from '@/lib/i18n/rtl';

interface Props {
  /** Defaults to router.back() — pass only when a screen needs custom exit logic. */
  onPress?: () => void;
  color?: string;
}

/** Standard icon-only back chevron used at the top of every drill-down screen. */
export function BackButton({ onPress, color = Colors.accent }: Props) {
  const { t } = useTranslation('common');
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={10}
      className="w-9 h-9 items-center justify-center -ml-1.5"
      style={({ pressed }) => pressed && { opacity: 0.5 }}
      accessibilityRole="button"
      accessibilityLabel={t('accessibility.back')}
    >
      <ChevronLeft size={24} color={color} style={rtlIconFlip} />
    </Pressable>
  );
}
