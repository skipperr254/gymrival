import { useCallback } from 'react';
import { useEntitlement } from '@/hooks/useEntitlement';
import { showPaywall } from '@/lib/billing/paywall';
import { FEATURE_TRIGGER, type PaywallTrigger, type ProFeature } from '@/constants/entitlements';

export interface Gate {
  /** Whether the user may use this feature. */
  allowed: boolean;
  /** Inverse of `allowed`, for the common `{locked && <Lock/>}` read. */
  locked: boolean;
  /** Opens the paywall tagged with this feature's trigger. */
  requestUpgrade: () => void;
  /**
   * Wraps an action: runs it when entitled, otherwise opens the paywall and
   * returns false. Lets a handler stay a single line —
   * `onPress={() => gate.run(publish)}`.
   */
  run: (action: () => void) => boolean;
}

/**
 * Reads a feature gate.
 *
 *   const publish = useProGate('publishPR');
 *   <Toggle disabled={publish.locked} onPress={() => publish.run(togglePublish)} />
 *
 * This is an *affordance*, not enforcement. Every feature named here is also
 * blocked server-side by an RLS policy or an RPC check, so a modified client
 * that forces `allowed` true still fails at the database. Keeping both honest
 * is the point of naming features in one file.
 */
export function useProGate(feature: ProFeature, triggerOverride?: PaywallTrigger): Gate {
  const { isPro } = useEntitlement();
  const trigger = triggerOverride ?? FEATURE_TRIGGER[feature];

  const requestUpgrade = useCallback(() => {
    showPaywall({ trigger });
  }, [trigger]);

  const run = useCallback(
    (action: () => void) => {
      if (isPro) {
        action();
        return true;
      }
      showPaywall({ trigger });
      return false;
    },
    [isPro, trigger]
  );

  return { allowed: isPro, locked: !isPro, requestUpgrade, run };
}
