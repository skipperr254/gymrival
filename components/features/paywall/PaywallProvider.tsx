import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaywallTrigger } from '@/constants/entitlements';
import { registerPaywallHandler } from '@/lib/billing';
import { newImpressionId, trackPaywall } from '@/lib/analytics';
import { useEntitlementStore, selectIsPro } from '@/store/useEntitlementStore';
import { PaywallSheet } from './PaywallSheet';

/**
 * The app's one and only paywall mount.
 *
 * ## Why there is exactly one
 *
 * `app/(tabs)/_layout.tsx` documents at length how UIKit silently refuses to
 * present a second view controller over a live one: the request is dropped
 * with no error, RN still believes the modal is presented, and because these
 * sheets are transparent the result is an invisible full-screen view that eats
 * every touch. iOS only. The paywall is summonable from inside LogPRSheet and
 * ChatInputBar, so a `<Modal>` per call site would reproduce that immediately.
 *
 * ## The call-site contract
 *
 * From ordinary screen content (Profile card, Settings, a leaderboard row),
 * just call `showPaywall({ trigger })` — nothing else is open, it presents
 * straight away.
 *
 * **From inside another modal** (LogPRSheet step 2/3, any bottom sheet), close
 * that sheet first and call `showPaywall` from its `onClosed` callback, the
 * same way the FAB sequences LogSheet into LogPRSheet. This provider cannot
 * detect another modal from here; the sequencing has to come from the caller.
 */

/** Triggers the app fires on its own, rather than in response to a tap. */
const AUTOMATIC_TRIGGERS: ReadonlySet<PaywallTrigger> = new Set<PaywallTrigger>([
  'onboarding',
  'streak_milestone',
]);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [trigger, setTrigger] = useState<PaywallTrigger>('upgrade_card');
  // Minted here, where the decision to present is made, and passed down so
  // every event from this presentation shares it. That is what lets the
  // funnel measure conversion per impression instead of dividing two
  // independently drifting totals.
  const [impressionId, setImpressionId] = useState<string>('');
  const isPro = useEntitlementStore(selectIsPro);

  // Read through a ref inside the handler: the handler is registered once, and
  // capturing `isPro` in its closure would freeze it at mount.
  const isProRef = useRef(isPro);
  isProRef.current = isPro;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  /**
   * One automatic paywall per session. Feature-tap triggers are never
   * suppressed — the user asked for that feature — but the onboarding and
   * streak prompts must not stack up on someone who already said no.
   */
  const automaticShown = useRef(false);

  const handleRequest = useCallback(({ trigger: requested }: { trigger: PaywallTrigger }) => {
    // A gate that's gone stale (or a Pro user tapping an old affordance)
    // should never be shown a paywall for something they already own.
    if (isProRef.current) return;
    if (visibleRef.current) return;

    if (AUTOMATIC_TRIGGERS.has(requested)) {
      if (automaticShown.current) return;
      automaticShown.current = true;
    }

    const id = newImpressionId();
    setImpressionId(id);
    setTrigger(requested);
    setVisible(true);
    trackPaywall('shown', { impressionId: id, trigger: requested });
  }, []);

  useEffect(() => registerPaywallHandler(handleRequest), [handleRequest]);

  // Entitlement can arrive from somewhere else entirely while the sheet is
  // open — a restore on another screen, or the webhook landing mid-purchase.
  // Close rather than leave someone staring at a paywall for what they now own.
  useEffect(() => {
    if (isPro && visible) setVisible(false);
  }, [isPro, visible]);

  // Only a user-initiated close counts as a dismissal. The sheet also closes
  // on a successful purchase and on entitlement arriving from elsewhere;
  // logging those as dismissals would understate conversion.
  const handleClose = useCallback(
    (reason: 'user' | 'purchased' = 'user') => {
      if (reason === 'user') {
        trackPaywall('dismissed', { impressionId, trigger });
      }
      setVisible(false);
    },
    [impressionId, trigger]
  );

  return (
    <>
      {children}
      <PaywallSheet
        visible={visible}
        trigger={trigger}
        impressionId={impressionId}
        onClose={handleClose}
      />
    </>
  );
}
