import { View, Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChallengeMetric } from '@/types/challenge';

const METRIC_OPTIONS: { labelKey: string; value: ChallengeMetric }[] = [
  { labelKey: 'metric.highestPr',    value: 'highest_pr'    },
  { labelKey: 'metric.mostImproved', value: 'most_improved' },
  { labelKey: 'metric.totalVolume',  value: 'total_volume'  },
];

/**
 * Three-way metric selector. Shared by the friend-challenge modal
 * (CreateChallengeModal) and the admin create-challenge form.
 */
export function MetricPicker({
  value,
  onChange,
}: {
  value: ChallengeMetric;
  onChange: (metric: ChallengeMetric) => void;
}) {
  const { t } = useTranslation('compete');
  return (
    <View className="flex-row gap-2">
      {METRIC_OPTIONS.map(opt => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-[10px] border-[1.5px] items-center justify-center ${
            value === opt.value
              ? 'border-accent bg-[rgba(230,48,48,0.1)]'
              : 'border-default bg-transparent'
          }`}
        >
          <Text
            className={`font-heading text-[10px] tracking-[1px] ${
              value === opt.value ? 'text-accent' : 'text-muted'
            }`}
          >
            {t(opt.labelKey).toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
