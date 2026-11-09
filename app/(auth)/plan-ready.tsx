import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Flame, Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { formatNumber } from '@/lib/i18n/format';
import { resolveTargets } from '@/lib/nutrition';
import { fetchProfile } from '@/lib/api';
import { showPaywall } from '@/lib/billing';
import { useAuthStore } from '@/store/useAuthStore';
import type { NutritionTargets } from '@/types/nutrition';

/**
 * The payoff. Shows the calorie and macro targets computed from what the user
 * just told us — their body, their goal, their training frequency.
 *
 * This screen is the reason the quiz comes before sign-up rather than after.
 * A trial offer that follows a real number derived from your own inputs
 * converts on a different curve than one that follows a logo.
 *
 * It also quietly fixes a real bug: before B4, `age` / `sex` /
 * `activity_level` / `diet_goal` were only collected on the separate
 * `nutrition-goals` screen, so anyone who never opened it silently ran on
 * default calorie targets forever.
 */

const MACROS = [
  { key: 'protein_g' as const, labelKey: 'plan.protein', color: '#4a9eff' },
  { key: 'carbs_g' as const, labelKey: 'plan.carbs', color: '#ffaa00' },
  { key: 'fat_g' as const, labelKey: 'plan.fat', color: '#00cc88' },
];

export default function PlanReadyScreen() {
  const { t } = useTranslation('onboarding');
  const userId = useAuthStore((s) => s.user?.id);
  const setPendingOnboardingPayoff = useAuthStore((s) => s.setPendingOnboardingPayoff);

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [loading, setLoading] = useState(true);

  // Read back from the server rather than recomputing from local form state:
  // whatever is on the profile is what every other screen will use, so this
  // shows the same number Nutrition will show tomorrow.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchProfile(userId).then(({ data }) => {
      if (cancelled) return;
      setTargets(data ? resolveTargets(data) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const finish = useMemo(
    () => () => {
      // Clear the gate first so the root layout's auth gate stops holding us
      // in the (auth) group, then hand off to the tabs.
      setPendingOnboardingPayoff(false);
      router.replace(Routes.compete);
    },
    [setPendingOnboardingPayoff]
  );

  const startTrial = () => {
    // Paywall trigger #1. Dismissible by design — the free tier is a product,
    // not a trap — and PaywallProvider caps automatic triggers at one per
    // session, so a user who says no is not asked again on this run.
    //
    // Navigate first, present after. Showing a modal while a route
    // transition is still running is the same class of problem as stacking
    // two modals on iOS, and runAfterInteractions is the supported way to
    // wait for the transition to settle.
    finish();
    InteractionManager.runAfterInteractions(() => showPaywall({ trigger: 'onboarding' }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text className="font-sans-semibold text-xs text-accent tracking-[3px] mb-3">
          {t('plan.tag')}
        </Text>
        <Text className="font-heading text-[44px] text-primary tracking-[1px] leading-[46px] mb-3">
          {t('plan.title')}
        </Text>
        <Text className="font-sans text-[14px] text-secondary leading-5 mb-8">
          {targets ? t('plan.subtitle') : t('plan.subtitleNoTargets')}
        </Text>

        {loading ? (
          <View className="items-center py-14">
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : targets ? (
          <>
            {/* Calories — the headline number */}
            <LinearGradient
              colors={['rgba(230,48,48,0.14)', 'rgba(230,48,48,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.calorieCard}
            >
              <View className="flex-row items-center gap-1.5 mb-1">
                <Flame size={14} strokeWidth={2} color={Colors.accent} />
                <Text className="font-heading text-[10px] tracking-[2.5px] text-accent">
                  {t('plan.dailyCalories')}
                </Text>
              </View>
              <View className="flex-row items-end gap-2">
                <Text className="font-heading text-[62px] text-primary leading-[64px]">
                  {formatNumber(targets.calories)}
                </Text>
                <Text className="font-heading text-lg text-[#888] pb-3">{t('plan.kcal')}</Text>
              </View>
            </LinearGradient>

            {/* Macro split */}
            <View className="flex-row gap-2.5 mt-3">
              {MACROS.map((m) => (
                <View key={m.key} className="flex-1 bg-surface rounded-2xl py-4 items-center gap-1">
                  <Text className="font-heading text-[26px] leading-7" style={{ color: m.color }}>
                    {formatNumber(targets[m.key])}
                  </Text>
                  <Text className="font-heading text-[9px] tracking-[1.5px] text-muted">
                    {t(m.labelKey)}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row items-start gap-2 bg-surface rounded-xl px-3.5 py-3 mt-3">
              <Target size={14} color={Colors.success} style={{ marginTop: 2 }} />
              <Text className="flex-1 font-sans text-[11px] text-[#808080] leading-4">
                {t('plan.editableNote')}
              </Text>
            </View>
          </>
        ) : (
          // Reached when setup was skipped — no body data, so no honest number
          // to show. Say so plainly rather than inventing a default.
          <View className="bg-surface rounded-2xl py-10 px-5 items-center gap-2">
            <Target size={26} strokeWidth={1.4} color="#333" />
            <Text className="font-heading text-lg tracking-[2px] text-primary mt-1">
              {t('plan.noTargetsTitle')}
            </Text>
            <Text className="font-sans text-[13px] text-muted text-center leading-5">
              {t('plan.noTargetsBody')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="px-5 pb-5 pt-2 gap-3">
        <Pressable
          onPress={startTrial}
          style={({ pressed }) => pressed && { opacity: 0.85 }}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            <Text className="font-heading text-[17px] text-primary tracking-[3px]">
              {t('plan.cta')}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={finish} hitSlop={10} className="items-center py-1">
          <Text className="font-sans text-[13px] text-muted">{t('plan.continueFree')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  calorieCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.22)',
  },
  cta: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
