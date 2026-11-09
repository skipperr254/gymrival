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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Gradients } from '@/constants/theme';
import type { PaywallTrigger } from '@/constants/entitlements';
import { getBillingProvider, isEntitled, type Offering, type Plan } from '@/lib/billing';
import { trackPaywall } from '@/lib/api/analytics';
import { useAuthStore } from '@/store/useAuthStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { PlanCard } from './PlanCard';
import { PaywallFeatureList, TRIGGER_FEATURE } from './PaywallFeatureList';
import { PaywallFooter } from './PaywallFooter';
import { DEV_PREVIEW_OFFERING } from './devPreviewOffering';
import { pricePerMonth, preferredPlan, savingsVsMonthly } from './pricing';

const SHEET_HEIGHT = Dimensions.get('window').height;
const DISMISS_CONFIRM_TIMEOUT_MS = 400;

interface Props {
  visible: boolean;
  trigger: PaywallTrigger;
  /** Minted by PaywallProvider; ties every event to this one presentation. */
  impressionId: string;
  /** `purchased` suppresses the dismissal event — a sale is not a dismissal. */
  onClose: (reason?: 'user' | 'purchased') => void;
  onClosed?: () => void;
  /**
   * A purchase or restore just granted Pro. The sheet closes itself right
   * after; the caller shows the confirmation from `onClosed`, because an Alert
   * raised over a modal that's mid-dismiss can be dropped by UIKit.
   */
  onUnlocked?: (via: 'purchase' | 'restore') => void;
}

export function PaywallSheet({ visible, trigger, impressionId, onClose, onClosed, onUnlocked }: Props) {
  const { t, i18n } = useTranslation('paywall');
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id);
  const setDeviceSnapshot = useEntitlementStore((s) => s.setDeviceSnapshot);
  const reconcile = useEntitlementStore((s) => s.reconcile);

  // Every user-initiated close goes through this. Wiring `onClose` straight
  // into onRequestClose/onPress would hand React Native's event object in as
  // `reason`, which is truthy but never 'user' — dismissals would silently
  // stop being recorded. The compiler caught it; the wrapper keeps it caught.
  const dismiss = useCallback(() => onClose('user'), [onClose]);

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
    const ctx = {
      impressionId,
      trigger,
      planId: selectedPlan.id,
      productId: selectedPlan.productId,
    };
    trackPaywall('purchase_started', ctx);
    try {
      const outcome = await getBillingProvider().purchase(selectedPlan.id);
      if (outcome.status === 'purchased') {
        trackPaywall('purchase_completed', ctx);
        // Don't wait on the webhook: ask the server to pull from the provider
        // so `profiles.is_pro` (what every RLS policy reads) catches up now.
        if (userId) reconcile(userId);
        if (isEntitled(outcome.entitlement)) {
          setDeviceSnapshot(outcome.entitlement);
          onUnlocked?.('purchase');
          onClose('purchased');
        } else {
          // The store charged them but the receipt doesn't carry the `pro`
          // entitlement (product not attached to it in the dashboard, or the
          // SDK not caught up). Closing silently would look like we took the
          // money and gave nothing — keep the sheet open so Restore is right
          // there; reconcile above may still flip them to Pro and auto-close.
          Alert.alert(t('purchase.notActiveTitle'), t('purchase.notActiveBody'));
        }
      } else if (outcome.status === 'pending') {
        Alert.alert(t('purchase.pendingTitle'), t('purchase.pendingBody'));
      } else if (outcome.status === 'unavailable') {
        trackPaywall('purchase_failed', ctx);
        Alert.alert(t('purchase.failedTitle'), t('purchase.unavailable'));
      } else if (outcome.status === 'error') {
        trackPaywall('purchase_failed', ctx);
        Alert.alert(t('purchase.failedTitle'), outcome.message);
      } else {
        // Backed out of the store sheet. Not an error, but worth separating
        // from a failure: a high cancel rate is a pricing signal, a high
        // failure rate is a bug.
        trackPaywall('purchase_cancelled', ctx);
      }
    } finally {
      setBusy(false);
    }
  }, [selectedPlan, busy, setDeviceSnapshot, reconcile, userId, onUnlocked, onClose, t, impressionId, trigger]);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const snapshot = await getBillingProvider().restore();
      if (isEntitled(snapshot)) {
        trackPaywall('restore_completed', { impressionId, trigger });
        setDeviceSnapshot(snapshot);
        if (userId) reconcile(userId);
        onUnlocked?.('restore');
        onClose('purchased');
      } else {
        trackPaywall('restore_empty', { impressionId, trigger });
        Alert.alert(t('restore.noneTitle'), t('restore.noneBody'));
      }
    } catch (e) {
      Alert.alert(t('restore.failedTitle'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  }, [busy, setDeviceSnapshot, reconcile, userId, onUnlocked, onClose, t, impressionId, trigger]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const contextualFeature = TRIGGER_FEATURE[trigger];

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
      onRequestClose={dismiss}
      onDismiss={reportClosed}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View
          className="bg-base rounded-t-3xl overflow-hidden"
          style={{ maxHeight: SHEET_HEIGHT * 0.92, transform: [{ translateY }] }}
        >
          <LinearGradient
            colors={Gradients.paywallHeader}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.header}
          >
            <View className="w-10 h-1 rounded-full bg-elevated self-center mb-4" />
            <Pressable
              onPress={dismiss}
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
              <PaywallFeatureList contextualFeature={contextualFeature} />

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
                      <Text className="font-sans text-[10px] text-ink-650 underline">
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

          <PaywallFooter
            showCta={!!selectedPlan}
            busy={busy}
            trialDays={trialDays}
            termsLine={termsLine}
            bottomInset={insets.bottom}
            onPurchase={handlePurchase}
            onRestore={handleRestore}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 12, paddingBottom: 18, paddingHorizontal: 20 },
  closeBtn: { position: 'absolute', top: 14, right: 16, padding: 4 },
});
