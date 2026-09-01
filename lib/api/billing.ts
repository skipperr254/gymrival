import { supabase } from '@/lib/supabase';
import type { EntitlementSnapshot, SubscriptionStatus, PurchaseStore } from '@/lib/billing/types';

/** Shape of the caller's own `public.subscriptions` row (migration 044). */
interface SubscriptionRow {
  entitlement: string;
  status: SubscriptionStatus;
  product_id: string | null;
  store: PurchaseStore | null;
  current_period_end: string | null;
  will_renew: boolean;
  is_sandbox: boolean;
}

const SUBSCRIPTION_SELECT =
  'entitlement, status, product_id, store, current_period_end, will_renew, is_sandbox';

/**
 * Reads the server's entitlement record for a user.
 *
 * RLS restricts this to the caller's own row, and no INSERT/UPDATE grant exists
 * at all — only the billing webhook (service role) writes it. That's the whole
 * point: the client can observe its entitlement, never assert one.
 *
 * A missing row is not an error, it's the normal state of a free user.
 */
export async function fetchSubscription(
  userId: string
): Promise<{ data: EntitlementSnapshot | null; error: string | null }> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const row = data as SubscriptionRow;
  return {
    data: {
      tier: row.entitlement === 'pro' ? 'pro' : 'free',
      status: row.status,
      expiresAt: row.current_period_end,
      willRenew: row.will_renew,
      productId: row.product_id,
      store: row.store,
      isSandbox: row.is_sandbox,
    },
    error: null,
  };
}
