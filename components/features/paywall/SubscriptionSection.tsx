import { useCallback, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Crown, CreditCard, RefreshCw, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { formatDate } from '@/lib/i18n/format';
import { getBillingProvider, isEntitled, showPaywall } from '@/lib/billing';
import { useAuthStore } from '@/store/useAuthStore';
import { useEntitlementStore } from '@/store/useEntitlementStore';
import { useEntitlement } from '@/hooks/useEntitlement';
import { SettingsRow } from '@/components/features/profile';

/**
 * The Subscription block in Settings.
 *
 * Restore Purchases and Manage Subscription are App Review requirements for
 * any app selling a subscription — they must be reachable from inside the app,
 * not only from the paywall.
 */
export function SubscriptionSection() {
  const { t } = useTranslation('paywall');
  const { isPro, subscription } = useEntitlement();
  const userId = useAuthStore((s) => s.user?.id);
  const setDeviceSnapshot = useEntitlementStore((s) => s.setDeviceSnapshot);
  const reconcile = useEntitlementStore((s) => s.reconcile);
  const [busy, setBusy] = useState(false);

  const handleRestore = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const snapshot = await getBillingProvider().restore();
      if (isEntitled(snapshot)) {
        setDeviceSnapshot(snapshot);
        if (userId) reconcile(userId);
        Alert.alert(t('restore.successTitle'), t('restore.successBody'));
      } else {
        Alert.alert(t('restore.noneTitle'), t('restore.noneBody'));
      }
    } catch (e) {
      Alert.alert(t('restore.failedTitle'), e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  }, [busy, setDeviceSnapshot, reconcile, userId, t]);

  // Hoisted out of JSX: the trigger tag is an analytics identifier, not copy,
  // but inline it trips the i18next no-literal-string rule.
  const handleUpgrade = useCallback(() => showPaywall({ trigger: 'settings' }), []);

  const handleManage = useCallback(async () => {
    try {
      await getBillingProvider().openManageSubscriptions();
    } catch {
      // The OS sheet failing to open isn't worth an error dialog; the user can
      // still reach it through Settings > Apple ID > Subscriptions.
    }
  }, []);

  // `status` is only null when there's no server row at all (a plain free user).
  const statusLabel = subscription?.status
    ? t(`subscription.status.${subscription.status}`, {
        defaultValue: t('subscription.status.active'),
      })
    : null;

  const dateLine = subscription?.expiresAt
    ? subscription.willRenew
      ? t('subscription.renewsOn', { date: formatDate(subscription.expiresAt) })
      : t('subscription.expiresOn', { date: formatDate(subscription.expiresAt) })
    : t('subscription.noExpiry');

  return (
    <View className="mt-6">
      <Text className="font-heading text-[11px] text-muted tracking-[2px] mb-2.5 px-1">
        {t('subscription.sectionTitle')}
      </Text>

      <View className="bg-surface rounded-[20px] overflow-hidden">
        {isPro ? (
          <>
            <View className="flex-row items-center gap-3 px-5 py-4">
              <View className="w-9 h-9 rounded-[10px] bg-[rgba(0,204,68,0.12)] items-center justify-center">
                <Crown size={17} color={Colors.success} />
              </View>
              <View className="flex-1">
                <Text className="font-sans-medium text-sm text-primary">
                  {t('subscription.proTitle')}
                </Text>
                <Text className="font-sans text-[11px] text-[#606060] mt-px">{dateLine}</Text>
              </View>
              {statusLabel && (
                <View className="bg-elevated rounded-full px-2.5 py-1">
                  <Text className="font-heading text-[9px] text-success tracking-[1px]">
                    {statusLabel}
                  </Text>
                </View>
              )}
            </View>

            {subscription?.status === 'billing_issue' && (
              <View className="px-5 pb-3">
                <Text className="font-sans text-[11px] text-warning leading-4">
                  {t('subscription.billingIssueBody')}
                </Text>
              </View>
            )}
            {subscription?.status === 'cancelled' && (
              <View className="px-5 pb-3">
                <Text className="font-sans text-[11px] text-[#808080] leading-4">
                  {t('subscription.cancelledBody')}
                </Text>
              </View>
            )}

            <SettingsRow
              icon={CreditCard}
              label={t('subscription.manage')}
              sub={t('subscription.manageSub')}
              iconColor={Colors.friend}
              onPress={handleManage}
            />
          </>
        ) : (
          <SettingsRow
            icon={Zap}
            label={t('subscription.upgrade')}
            sub={t('subscription.freeSub')}
            iconColor={Colors.accent}
            onPress={handleUpgrade}
            isFirst
          />
        )}

        <SettingsRow
          icon={RefreshCw}
          label={t('subscription.restore')}
          sub={t('subscription.restoreSub')}
          iconColor="#909090"
          onPress={handleRestore}
          disabled={busy}
        />
      </View>
    </View>
  );
}
