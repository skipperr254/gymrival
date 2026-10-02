import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { noopBillingProvider } from './noop';
import { getRevenueCatApiKey, revenueCatBillingProvider } from './revenuecat';
import type { BillingProvider } from './types';

export * from './types';
export { showPaywall, registerPaywallHandler, isPaywallReady } from './paywall';

let cached: BillingProvider | null = null;

function selectProvider(): BillingProvider {
  // No StoreKit / Play Billing to talk to.
  if (Platform.OS === 'web') return noopBillingProvider;

  // Expo Go: the native module isn't in the Expo Go binary, so the SDK runs
  // in a "preview mode" that can't complete a real purchase.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return noopBillingProvider;
  }

  // No public SDK key for this platform means billing isn't set up here yet —
  // today that's Android, which lights up by setting one env var. Resolving to
  // no-op (rather than configuring with an empty key and crashing) keeps the
  // server row as the only source of Pro, exactly like the grandfathered
  // `manual` grants.
  if (!getRevenueCatApiKey()) {
    if (__DEV__) {
      console.warn(
        `[billing] No RevenueCat SDK key for ${Platform.OS} — using the no-op provider. ` +
          `Set EXPO_PUBLIC_REVENUECAT_${Platform.OS.toUpperCase()}_KEY to enable purchases.`
      );
    }
    return noopBillingProvider;
  }

  return revenueCatBillingProvider;
}

/**
 * The app's only entry point to billing. Memoized: adapters hold SDK
 * configuration state, so handing out a second instance would re-configure the
 * SDK and drop any listener already attached.
 */
export function getBillingProvider(): BillingProvider {
  if (!cached) cached = selectProvider();
  return cached;
}

/** Test seam — lets a unit test install a fake without touching the factory. */
export function __setBillingProviderForTests(provider: BillingProvider | null): void {
  cached = provider;
}
