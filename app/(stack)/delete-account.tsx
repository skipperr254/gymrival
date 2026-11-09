import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, CreditCard } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { useAuthStore } from '@/store/useAuthStore';
import { useEntitlement } from '@/hooks/useEntitlement';
import { getBillingProvider } from '@/lib/billing';
import { deleteAccount } from '@/lib/api/account';

const DELETED_ITEMS = ['profile', 'prs', 'social', 'training'] as const;

/**
 * In-app account deletion (App Store guideline 5.1.1(v)). Deletes the account
 * and everything in it via the delete-account edge function, then signs out;
 * the root auth gate takes the user to the splash screen.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation('profile');
  const signOut = useAuthStore((s) => s.signOut);
  const { subscription } = useEntitlement();
  const [deleting, setDeleting] = useState(false);

  // A store subscription keeps billing after the account is gone; only the
  // user can cancel it, so Apple requires telling them before deleting.
  const hasStoreSubscription =
    !!subscription?.willRenew &&
    (subscription.store === 'app_store' || subscription.store === 'play_store');

  const runDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      setDeleting(false);
      Alert.alert(t('deleteAccount.errorTitle'), t('deleteAccount.errorBody'));
      return;
    }
    // The server session is gone; signOut falls back to clearing it locally
    // and resets every store. The auth gate then replaces to the splash.
    await signOut();
  };

  const confirm = () => {
    Alert.alert(t('deleteAccount.confirmTitle'), t('deleteAccount.confirmBody'), [
      { text: t('deleteAccount.cancel'), style: 'cancel' },
      { text: t('deleteAccount.confirmDelete'), style: 'destructive', onPress: runDelete },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top', 'bottom']}>
      <DetailHeader title={t('deleteAccount.title')} />

      <ScrollView contentContainerClassName="px-4 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-full bg-accent/10 items-center justify-center mb-4">
            <AlertTriangle size={26} color={Colors.accent} />
          </View>
          <Text className="font-heading text-2xl text-primary tracking-[2px] text-center">
            {t('deleteAccount.heading')}
          </Text>
          <Text className="font-sans text-sm text-secondary text-center mt-2 leading-5">
            {t('deleteAccount.body')}
          </Text>
        </View>

        <View className="bg-surface rounded-[20px] p-4 gap-3">
          {DELETED_ITEMS.map((item) => (
            <View key={item} className="flex-row items-start gap-3">
              <View className="w-1.5 h-1.5 rounded-full bg-accent mt-2" />
              <Text className="flex-1 font-sans text-sm text-secondary leading-5">
                {t(`deleteAccount.items.${item}`)}
              </Text>
            </View>
          ))}
        </View>

        {hasStoreSubscription && (
          <View className="bg-surface rounded-[20px] p-4 mt-4 border border-warning/30">
            <Text className="font-sans-semibold text-sm text-warning mb-1.5">
              {t('deleteAccount.subscriptionTitle')}
            </Text>
            <Text className="font-sans text-sm text-secondary leading-5 mb-3">
              {t('deleteAccount.subscriptionBody')}
            </Text>
            <Pressable
              className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-elevated"
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={() => getBillingProvider().openManageSubscriptions().catch(() => {})}
            >
              <CreditCard size={16} color={Colors.primary} />
              <Text className="font-heading text-sm text-primary tracking-[2px]">
                {t('deleteAccount.manageSubscription')}
              </Text>
            </Pressable>
          </View>
        )}

        <Pressable
          className="flex-row items-center justify-center py-4 rounded-2xl bg-accent mt-8 min-h-[52px]"
          style={({ pressed }) => (pressed || deleting) && { opacity: 0.7 }}
          onPress={confirm}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text className="font-heading text-base text-primary tracking-[3px]">
              {t('deleteAccount.button')}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
