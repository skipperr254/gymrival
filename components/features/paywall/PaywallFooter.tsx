import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/constants/legal';

interface Props {
  /** False when there is no plan to buy — the CTA is removed, not dimmed. */
  showCta: boolean;
  busy: boolean;
  trialDays: number | null;
  termsLine: string;
  bottomInset: number;
  onPurchase: () => void;
  onRestore: () => void;
}

/** Paywall CTA, auto-renew terms, and the Restore / Terms / Privacy links. */
export function PaywallFooter({ showCta, busy, trialDays, termsLine, bottomInset, onPurchase, onRestore }: Props) {
  const { t } = useTranslation('paywall');

  return (
    <View
      className="px-5 pt-3 border-t border-elevated"
      style={{ paddingBottom: Math.max(bottomInset + 10, 20) }}
    >
      {/* No plan means nothing to buy. A dimmed-but-prominent CTA reads
          as "tap me" and does nothing, so the button is removed
          entirely — the empty state's Try again is the real action. */}
      {showCta && (
        <Pressable
          onPress={onPurchase}
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
        <Text className="font-sans text-[10px] text-ink-600 text-center leading-[14px] mt-2.5">
          {termsLine}
        </Text>
      )}

      {/* Restore, Terms and Privacy are App Review requirements, not
          decoration — a paywall missing any of them is a routine reject. */}
      <View className="flex-row items-center justify-center gap-5 mt-2.5">
        <Pressable onPress={onRestore} disabled={busy} hitSlop={8}>
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
  );
}

const styles = StyleSheet.create({
  cta: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
