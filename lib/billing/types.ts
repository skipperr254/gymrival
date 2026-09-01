/**
 * The billing boundary.
 *
 * Nothing above `lib/billing/` ever sees a vendor type. The app talks in the
 * shapes declared here; exactly one adapter file translates them to and from a
 * provider SDK. Swapping RevenueCat for Adapty, Superwall or raw StoreKit means
 * writing one new implementation of `BillingProvider` and flipping the factory
 * in `lib/billing/index.ts` — no screen, store, schema or RLS change.
 *
 * Rule enforced by convention (and, from Phase 1, by an ESLint
 * `no-restricted-imports` rule): `lib/billing/<vendor>.ts` is the only file in
 * the repo allowed to import the vendor SDK.
 */

/** What a user is entitled to. Mirrors `subscriptions.entitlement` server-side. */
export type EntitlementTier = 'free' | 'pro';

/**
 * Lifecycle of a paid entitlement. Matches the CHECK constraint on
 * `subscriptions.status` (migration 044) one-for-one.
 *
 * Note that `cancelled` does NOT mean "no access" — auto-renew is off but the
 * user paid through `expiresAt`. Use {@link isEntitled}, never a status check.
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'grace'
  | 'billing_issue'
  | 'cancelled'
  | 'expired';

export type PurchaseStore = 'app_store' | 'play_store' | 'promo' | 'manual';

/** Where a snapshot came from — see the union in `useEntitlementStore`. */
export type EntitlementSource = 'server' | 'device' | 'cache' | 'none';

export interface EntitlementSnapshot {
  tier: EntitlementTier;
  status: SubscriptionStatus | null;
  /** ISO timestamp. `null` = never expires (a manual/comped grant). */
  expiresAt: string | null;
  willRenew: boolean;
  productId: string | null;
  store: PurchaseStore | null;
  isSandbox: boolean;
}

export const FREE_ENTITLEMENT: EntitlementSnapshot = {
  tier: 'free',
  status: null,
  expiresAt: null,
  willRenew: false,
  productId: null,
  store: null,
  isSandbox: false,
};

/**
 * The one place "does this grant access right now" is decided client-side.
 * Deliberately identical to `public.subscription_is_active()` in migration 044 —
 * if you change one, change the other.
 */
export function isEntitled(snapshot: EntitlementSnapshot | null): boolean {
  if (!snapshot || snapshot.tier !== 'pro') return false;
  if (snapshot.status === 'expired') return false;
  if (snapshot.expiresAt && new Date(snapshot.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

export type BillingPeriod =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'lifetime'
  | 'unknown';

export interface Plan {
  /** Provider-side package identifier — what you hand back to `purchase()`. */
  id: string;
  productId: string;
  title: string;
  description: string | null;
  period: BillingPeriod;
  /**
   * Already localized and currency-formatted by the store. Render this
   * verbatim; never hardcode or reformat a price. Changing prices in the
   * provider dashboard then flows through without an app build.
   */
  priceString: string;
  priceAmountMicros: number | null;
  currencyCode: string | null;
  /** Introductory free-trial length in days, if the plan offers one. */
  trialDays: number | null;
}

export interface Offering {
  id: string;
  plans: Plan[];
  /** The plan the paywall should preselect (typically the annual one). */
  defaultPlanId: string | null;
}

export type PurchaseOutcome =
  | { status: 'purchased'; entitlement: EntitlementSnapshot }
  /** User backed out of the store sheet. Not an error — never show a message. */
  | { status: 'cancelled' }
  /** Deferred/pending approval (Play "slow card", iOS Ask to Buy). */
  | { status: 'pending' }
  /** Billing isn't available at all here (Expo Go, web, simulator). */
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string; code?: string };

/**
 * The entire surface the app is allowed to use. Nine methods — that is the
 * whole cost of changing billing vendors on the client side.
 */
export interface BillingProvider {
  /** Called once at app start. `userId` is null when signed out. */
  configure(userId: string | null): Promise<void>;
  /** On sign-in. Aliases the device to our Supabase uuid so webhook payloads carry it. */
  identify(userId: string): Promise<void>;
  /** On sign-out. Returns the SDK to an anonymous id. */
  signOut(): Promise<void>;

  getOfferings(): Promise<Offering[]>;
  purchase(planId: string): Promise<PurchaseOutcome>;
  /** "Restore Purchases" — required by App Review, not optional. */
  restore(): Promise<EntitlementSnapshot>;
  getEntitlements(): Promise<EntitlementSnapshot>;

  /** Push updates from the SDK's own listener. Returns an unsubscribe. */
  onEntitlementChange(cb: (snapshot: EntitlementSnapshot) => void): () => void;

  /** Deep-links to the OS subscription management screen. Also App Review required. */
  openManageSubscriptions(): Promise<void>;
}
