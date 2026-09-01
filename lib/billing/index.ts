import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { noopBillingProvider } from './noop';
import type { BillingProvider } from './types';

export * from './types';
export { showPaywall, registerPaywallHandler, isPaywallReady } from './paywall';

let cached: BillingProvider | null = null;

function selectProvider(): BillingProvider {
  // No StoreKit / Play Billing to talk to.
  if (Platform.OS === 'web') return noopBillingProvider;

  // Expo Go: `react-native-purchases` runs in a mock mode that can't complete a
  // real purchase, and the native module isn't in the Expo Go binary at all.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return noopBillingProvider;
  }

  // Phase 1 returns the RevenueCat adapter here. Until then every environment
  // resolves free from the device side and the server row is the only source
  // of Pro — which is exactly how the grandfathered `manual` grants work.
  return noopBillingProvider;
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
