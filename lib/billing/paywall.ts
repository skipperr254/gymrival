import type { PaywallTrigger } from '@/constants/entitlements';

/**
 * A tiny registry that lets any module ask for the paywall without importing
 * the component that renders it.
 *
 * Why indirection rather than a plain import: the paywall must have exactly one
 * mount point, in the root layout. `app/(tabs)/_layout.tsx` documents at length
 * how UIKit silently refuses to present a second modal over a live one (it
 * leaves an invisible full-screen view that eats every touch, iOS only). The
 * paywall is summonable from inside LogPRSheet — itself a modal — so a locally
 * mounted <Modal> per call site would reproduce that bug immediately.
 *
 * Phase 2's PaywallProvider registers the real handler here. Until then this
 * is an intentional no-op: gates already compute and render correctly, they
 * just have nothing to open yet.
 */

export interface PaywallRequest {
  /** Which placement asked. Phase 5 reports conversion per trigger. */
  trigger: PaywallTrigger;
}

type PaywallHandler = (request: PaywallRequest) => void;

let handler: PaywallHandler | null = null;

/** Called by the single PaywallProvider mount. Returns an unregister function. */
export function registerPaywallHandler(fn: PaywallHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function isPaywallReady(): boolean {
  return handler !== null;
}

export function showPaywall(request: PaywallRequest): void {
  if (handler) {
    handler(request);
    return;
  }
  if (__DEV__) {
    // Loud in dev so a gate wired up before Phase 2 lands is obvious, silent in
    // production so a missing provider degrades to "the button does nothing"
    // rather than a crash.
    console.warn(
      `[billing] showPaywall("${request.trigger}") with no PaywallProvider mounted.`
    );
  }
}
