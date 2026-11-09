import { View, Text } from 'react-native';
import {
  Trophy,
  Video,
  MessageCircle,
  ListOrdered,
  Search,
  Swords,
  Check,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { PaywallTrigger, ProFeature } from '@/constants/entitlements';

// Module-level, so it stores i18n key paths and resolves them with t() at
// render time — same pattern as TABS in the compete screen.
const FEATURES: { key: ProFeature; icon: LucideIcon }[] = [
  { key: 'publishPR', icon: Trophy },
  { key: 'prVideo', icon: Video },
  { key: 'sendMessage', icon: MessageCircle },
  { key: 'leaderboardDepth', icon: ListOrdered },
  { key: 'leaderboardSearch', icon: Search },
  { key: 'createChallenge', icon: Swords },
];

/** Which feature the user just reached for, so its row leads the list. */
export const TRIGGER_FEATURE: Partial<Record<PaywallTrigger, ProFeature>> = {
  publish_pr: 'publishPR',
  pr_video: 'prVideo',
  chat_reply: 'sendMessage',
  leaderboard_depth: 'leaderboardDepth',
  create_challenge: 'createChallenge',
};

/** What Pro unlocks, leading with the feature the user just reached for. */
export function PaywallFeatureList({ contextualFeature }: { contextualFeature?: ProFeature }) {
  const { t } = useTranslation('paywall');
  const orderedFeatures = contextualFeature
    ? [
        ...FEATURES.filter((f) => f.key === contextualFeature),
        ...FEATURES.filter((f) => f.key !== contextualFeature),
      ]
    : FEATURES;

  return (
    <>
      {orderedFeatures.map((f) => (
        <View key={f.key} className="flex-row items-center gap-3 mb-3">
          <View className="w-9 h-9 rounded-[10px] bg-accent/12 items-center justify-center">
            <f.icon size={17} color={Colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-sm text-primary">
              {t(`features.${f.key}.title`)}
            </Text>
            <Text className="font-sans text-[11px] text-ink-550 mt-px">
              {t(`features.${f.key}.sub`)}
            </Text>
          </View>
        </View>
      ))}

      <View className="flex-row items-start gap-2 bg-surface rounded-xl px-3.5 py-3 mt-1 mb-5">
        <Check size={14} color={Colors.success} style={{ marginTop: 2 }} />
        <Text className="flex-1 font-sans text-[11px] text-ink-500 leading-4">
          {t('freeNote')}
        </Text>
      </View>
    </>
  );
}
