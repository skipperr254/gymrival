// Installs the crypto.getRandomValues polyfill. Already pulled in via
// lib/supabase -> lib/secureStorage, but imported explicitly so a future
// refactor of that chain cannot silently break id generation. Idempotent.
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { PaywallTrigger } from '@/constants/entitlements';

/**
 * Paywall funnel telemetry.
 *
 * Deliberately not an analytics SDK. One table (`paywall_events`, migration
 * 059) and these few functions, because the only question we need answered is
 * "which of the eight placements converts" — and the billing provider cannot
 * answer it: a purchase arrives with no memory of what prompted it.
 *
 * Two rules this module holds to:
 *
 *  1. **Never block the UI.** Every write is fire-and-forget. The paywall must
 *     not wait on a telemetry round-trip before showing a price.
 *  2. **Never throw.** A failed insert loses one data point. Letting it reject
 *     into a purchase handler would lose a sale, which is infinitely worse.
 */

export type PaywallEvent =
  | 'shown'
  | 'dismissed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'restore_completed'
  | 'restore_empty';

export interface PaywallEventContext {
  /** Groups every event from one presentation. See newImpressionId(). */
  impressionId: string;
  trigger: PaywallTrigger;
  planId?: string | null;
  productId?: string | null;
}

/**
 * A fresh id for one presentation of the paywall.
 *
 * This is what turns a pile of counters into a funnel: "shown" and its
 * outcome share an id, so conversion is measured per impression rather than
 * by dividing two independently drifting totals.
 */
export function newImpressionId(): string {
  // RFC 4122 v4, built from crypto.getRandomValues. `crypto.randomUUID` is
  // not part of the react-native-get-random-values polyfill, and the project
  // has no UUID dependency — this avoids adding one for a grouping key.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}

/**
 * Records a paywall event. Returns immediately; the write happens in the
 * background and its failure is swallowed on purpose.
 */
export function trackPaywall(event: PaywallEvent, ctx: PaywallEventContext): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      // The RLS policy requires user_id = auth.uid(); an anonymous write
      // would be rejected anyway, so skip it rather than log an error.
      if (!userId) return;

      await supabase.from('paywall_events').insert({
        impression_id: ctx.impressionId,
        user_id: userId,
        trigger: ctx.trigger,
        event,
        plan_id: ctx.planId ?? null,
        product_id: ctx.productId ?? null,
        platform: Platform.OS,
      });
    } catch {
      // Losing a data point is acceptable. Surfacing it to the user, or
      // rejecting into a purchase flow, is not.
    }
  })();
}
