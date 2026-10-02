import { View, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface DurationOption {
  labelKey: string;
  days: number;
}

/**
 * Row of duration presets (days). The friend-challenge modal
 * (CreateChallengeModal) uses a 4-option day-count set; the admin
 * create-challenge form uses 2 (Weekly / Monthly) — both pass their own
 * `options` so the underlying picker UI stays in one place.
 */
export function DurationPicker({
  options,
  value,
  onChange,
}: {
  options: DurationOption[];
  value: number;
  onChange: (days: number) => void;
}) {
  const { t } = useTranslation('compete');
  return (
    <View className="flex-row gap-2">
      {options.map(opt => (
        <Pressable
          key={opt.days}
          onPress={() => onChange(opt.days)}
          className={`flex-1 py-2 px-3 rounded-[10px] border-[1.5px] items-center justify-center ${
            value === opt.days
              ? 'border-accent bg-[rgba(230,48,48,0.1)]'
              : 'border-default bg-transparent'
          }`}
        >
          <Text
            className={`font-heading text-[10px] tracking-[1px] ${
              value === opt.days ? 'text-accent' : 'text-muted'
            }`}
          >
            {t(opt.labelKey).toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
