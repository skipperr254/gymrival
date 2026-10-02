import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
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
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/legal';
import type { PaywallTrigger, ProFeature } from '@/constants/entitlements';
import { getBillingProvider, isEntitled, type Offering, type Plan } from '@/lib/billing';
import { useAuthStore } from '@/store/useAuthStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { PlanCard } from './PlanCard';
import { DEV_PREVIEW_OFFERING } from './devPreviewOffering';
import { pricePerMonth, preferredPlan, savingsVsMonthly } from './pricing';

const SHEET_HEIGHT = Dimensions.get('window').height;
const DISMISS_CONFIRM_TIMEOUT_MS = 400;

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
const TRIGGER_FEATURE: Partial<Record<PaywallTrigger, ProFeature>> = {
  publish_pr: 'publishPR',
  pr_video: 'prVideo',
  chat_reply: 'sendMessage',
  leaderboard_depth: 'leaderboardDepth',
  create_challenge: 'createChallenge',
};

interface Props {
  visible: boolean;
  trigger: PaywallTrigger;
  onClose: () => void;
  onClosed?: () => void;
}

export function PaywallSheet({ visible, trigger, onClose, onClosed }: Props) {
  const { t, i18n } = useTranslation('paywall');
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const setDeviceSnapshot = useEntitlementStore((s) => s.setDeviceSnapshot);
  const reconcile = useEntitlementStore((s) => s.reconcile);

  const [offering, setOffering] = useState<Offering | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ── Sheet animation + dismissal confirmation ──────────────────────────────
  // Mirrors components/ui/LogSheet.tsx. The paywall is reachable from inside
  // other modals, so getting the open→closed handshake right matters more here
  // than anywhere else — see the UIKit note in app/(tabs)/_layout.tsx.
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const visibleRef = useRef(visible);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const closeReported = useRef(true);
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reportClosed = useCallback(() => {
    clearTimeout(dismissTimeout.current);
    if (closeReported.current) return;
    closeReported.current = true;
    onClosedRef.current?.();
  }, []);

  useEffect(() => () => clearTimeout(dismissTimeout.current), []);

  useEffect(() => {
    visibleRef.current = visible;
    if (visible) {
      closeReported.current = false;
      clearTimeout(dismissTimeout.current);
      setMounted(true);
      translateY.setValue(SHEET_HEIGHT);
      const raf = requestAnimationFrame(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(raf);
    }

    if (closeReported.current) return;

    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 240,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (visibleRef.current) return;
      setMounted(false);
      if (Platform.OS === 'ios') {
        dismissTimeout.current = setTimeout(reportClosed, DISMISS_CONFIRM_TIMEOUT_MS);
      } else {
        reportClosed();
      }
    });
  }, [visible, translateY, reportClosed]);

  // ── Offerings ─────────────────────────────────────────────────────────────
  const loadOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const offerings = await getBillingProvider().getOfferings();
      // getOfferings() sorts the provider's current offering first.
      const current = offerings[0] ?? null;
      setOffering(current);
      setSelectedPlanId(
        current ? (preferredPlan(current.plans, current.defaultPlanId)?.id ?? null) : null
      );
    } catch {
      setOffering(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) loadOfferings();
  }, [visible, loadOfferings]);

  /**
   * Dev-only: render the sheet with stand-in plans so the App Store Connect
   * review screenshot can be captured before the real products leave
   * "Missing Metadata". Explicitly opt-in — never a fallback — so a release
   * build always shows the honest empty state. See devPreviewOffering.ts.
   */
  const showPreviewPlans = useCallback(() => {
    if (!__DEV__) return;
    setOffering(DEV_PREVIEW_OFFERING);
    setSelectedPlanId(DEV_PREVIEW_OFFERING.defaultPlanId);
  }, []);

  const plans = offering?.plans ?? [];
  const monthlyPlan = plans.find((p) => p.period === 'monthly');
  const selectedPlan: Plan | undefined =
    plans.find((p) => p.id === selectedPlanId) ?? plans[0];

  // ── Purchase / restore ────────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    if (!selectedPlan || busy) return;
    setBusy(true);
    try {
      const outcome = await getBillingProvider().purchase(selectedPlan.id);
      if (outcome.status === 'purchased') {
        setDeviceSnapshot(outcome.entitlement);
        // Don't wait on the webhook: ask the server to pull from the provider
        // so `profiles.is_pro` (what every RLS policy reads) catches up now.
        if (userId) reconcile(userId);
        onClose();
      } else if (outcome.status === 'pending') {
        Alert.alert(t('purchase.pendingTitle'), t('purchase.pendingBody'));
      } else if (outcome.status === 'unavailable') {
        Alert.alert(t('purchase.failedTitle'), t('purchase.unavailable'));
      } else if (outcome.status === 'error') {
        Alert.alert(t('purchase.failedTitle'), outcome.message);
      }
      // 'cancelled' is the user backing out of the store sheet — say nothing.
    } finally {
      setBusy(false);
    }
  }, [selectedPlan, busy, setDeviceSnapshot, reconcile, userId, onClose, t]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const snapshot = await getBillingProvider().restore();
      if (isEntitled(snapshot)) {
        setDeviceSnapshot(snapshot);
        if (userId) reconcile(userId);
        Alert.alert(t('restore.successTitle'), t('restore.successBody'));
        onClose();
      } else {
        Alert.alert(t('restore.noneTitle'), t('restore.noneBody'));
      }
    } catch (e) {
      Alert.alert(t('restore.failedTitle'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  }, [busy, setDeviceSnapshot, reconcile, userId, onClose, t]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const contextualFeature = TRIGGER_FEATURE[trigger];
  const orderedFeatures = contextualFeature
    ? [
        ...FEATURES.filter((f) => f.key === contextualFeature),
        ...FEATURES.filter((f) => f.key !== contextualFeature),
      ]
    : FEATURES;

  const trialDays = selectedPlan?.trialDays ?? null;
  const periodLabel = t(`period.${selectedPlan?.period ?? 'unknown'}`, {
    defaultValue: t('period.unknown'),
  });
  const termsLine =
    selectedPlan == null
      ? ''
      : trialDays
        ? t('terms.withTrial', {
            count: trialDays,
            price: selectedPlan.priceString,
            period: periodLabel,
          })
        : t('terms.noTrial', { price: selectedPlan.priceString, period: periodLabel });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={reportClosed}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          className="bg-[#141414] rounded-t-3xl overflow-hidden"
          style={{ maxHeight: SHEET_HEIGHT * 0.92, transform: [{ translateY }] }}
        >
          <LinearGradient
            colors={['#2a1414', '#141414']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.header}
          >
            <View className="w-10 h-1 rounded-full bg-elevated self-center mb-4" />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <X size={20} color={Colors.secondary} />
            </Pressable>

            <Text className="font-heading text-[32px] text-primary tracking-[4px] text-center">
              {t('title')}
            </Text>
            <Text className="font-sans text-[13px] text-secondary text-center mt-1.5 px-6">
              {contextualFeature
                ? t('contextual', { feature: t(`features.${contextualFeature}.title`) })
                : t('subtitle')}
            </Text>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View className="px-5 pt-4">
              {orderedFeatures.map((f) => (
                <View key={f.key} className="flex-row items-center gap-3 mb-3">
                  <View className="w-9 h-9 rounded-[10px] bg-[rgba(230,48,48,0.12)] items-center justify-center">
                    <f.icon size={17} color={Colors.accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-sm text-primary">
                      {t(`features.${f.key}.title`)}
                    </Text>
                    <Text className="font-sans text-[11px] text-[#707070] mt-px">
                      {t(`features.${f.key}.sub`)}
                    </Text>
                  </View>
                </View>
              ))}

              <View className="flex-row items-start gap-2 bg-surface rounded-xl px-3.5 py-3 mt-1 mb-5">
                <Check size={14} color={Colors.success} style={{ marginTop: 2 }} />
                <Text className="flex-1 font-sans text-[11px] text-[#808080] leading-4">
                  {t('freeNote')}
                </Text>
              </View>

              {loading ? (
                <View className="items-center py-8 gap-3">
                  <ActivityIndicator color={Colors.accent} />
                  <Text className="font-sans text-xs text-muted">{t('loading')}</Text>
                </View>
              ) : plans.length === 0 ? (
                <View className="items-center py-6 gap-2">
                  <Text className="font-heading text-base text-primary tracking-[1.5px]">
                    {t('empty.title')}
                  </Text>
                  <Text className="font-sans text-xs text-muted text-center px-4">
                    {t('empty.body')}
                  </Text>
                  <Pressable
                    onPress={loadOfferings}
                    className="mt-2 bg-elevated rounded-xl px-5 py-2.5"
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                  >
                    <Text className="font-heading text-xs text-primary tracking-[2px]">
                      {t('empty.retry')}
                    </Text>
                  </Pressable>
                  {__DEV__ && (
                    <Pressable
                      onPress={showPreviewPlans}
                      className="mt-1 px-5 py-2"
                      style={({ pressed }) => pressed && { opacity: 0.6 }}
                    >
                      {/* eslint-disable-next-line i18next/no-literal-string --
                          dev-only affordance for capturing the ASC review
                          screenshot; never rendered in a release build. */}
                      <Text className="font-sans text-[10px] text-[#505050] underline">
                        dev: preview plans
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={plan.id === selectedPlan?.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                    savingsPercent={savingsVsMonthly(plan, monthlyPlan)}
                    pricePerMonth={pricePerMonth(plan, i18n.language)}
                    highlighted={plan.id === offering?.defaultPlanId && plans.length > 1}
                  />
                ))
              )}
            </View>
          </ScrollView>

          <View
            className="px-5 pt-3 border-t border-elevated"
            style={{ paddingBottom: Math.max(insets.bottom + 10, 20) }}
          >
            {/* No plan means nothing to buy. A dimmed-but-prominent CTA reads
                as "tap me" and does nothing, so the button is removed
                entirely — the empty state's Try again is the real action. */}
            {selectedPlan && (
              <Pressable
                onPress={handlePurchase}
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [(pressed || busy) && { opacity: 0.7 }]}
              >
                <LinearGradient
                  colors={[Colors.accent, Colors.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cta}
                >
                  {busy ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text className="font-heading text-[15px] text-primary tracking-[3px]">
                      {trialDays
                        ? t('cta.startTrial', { count: trialDays })
                        : t('cta.subscribe')}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            )}

            {!!termsLine && (
              <Text className="font-sans text-[10px] text-[#606060] text-center leading-[14px] mt-2.5">
                {termsLine}
              </Text>
            )}

            {/* Restore, Terms and Privacy are App Review requirements, not
                decoration — a paywall missing any of them is a routine reject. */}
            <View className="flex-row items-center justify-center gap-5 mt-2.5">
              <Pressable onPress={handleRestore} disabled={busy} hitSlop={8}>
                <Text className="font-sans text-[11px] text-secondary underline">
                  {t('links.restore')}
                </Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(TERMS_OF_USE_URL)} hitSlop={8}>
                <Text className="font-sans text-[11px] text-secondary underline">
                  {t('links.terms')}
                </Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
                <Text className="font-sans text-[11px] text-secondary underline">
                  {t('links.privacy')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 18, paddingHorizontal: 20 },
  closeBtn: { position: 'absolute', top: 14, right: 16, padding: 4 },
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
