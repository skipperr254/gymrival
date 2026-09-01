import { useEntitlementStore, selectIsPro, selectSource } from '@/store/useEntitlementStore';
import type { EntitlementSnapshot } from '@/lib/billing/types';

export interface Entitlement {
  isPro: boolean;
  tier: 'free' | 'pro';
  /** True until the server has answered once this session. */
  loading: boolean;
  /** Which input decided `isPro` — useful in the Settings/subscription screen. */
  source: 'server' | 'device' | 'cache' | 'none';
  /** The server's own record, for rendering renewal date / plan / status. */
  subscription: EntitlementSnapshot | null;
}

/**
 * The one hook screens use to ask about Pro. Never read `profile.is_pro` in a
 * component — that column is the server's RLS mirror, it lags a fresh purchase
 * by a webhook round-trip, and it isn't loaded on every screen.
 */
export function useEntitlement(): Entitlement {
  const isPro = useEntitlementStore(selectIsPro);
  const source = useEntitlementStore(selectSource);
  const resolved = useEntitlementStore((s) => s.resolved);
  const subscription = useEntitlementStore((s) => s.server);

  return {
    isPro,
    tier: isPro ? 'pro' : 'free',
    loading: !resolved,
    source,
    subscription,
  };
}
