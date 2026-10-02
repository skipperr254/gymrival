/**
 * RevenueCat adapter — THE ONLY FILE IN THE REPO THAT MAY IMPORT
 * `react-native-purchases`. Enforced by `no-restricted-imports` in
 * eslint.config.js.
 *
 * Everything the SDK hands back is translated to the shapes in ./types before
 * it leaves this file. If RevenueCat is ever swapped out, this file is replaced
 * and nothing else on the client changes.
 */
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import {
  FREE_ENTITLEMENT,
  type BillingPeriod,
  type BillingProvider,
  type EntitlementSnapshot,
  type Offering,
  type Plan,
  type PurchaseOutcome,
  type PurchaseStore,
  type SubscriptionStatus,
} from './types';

/** The RevenueCat entitlement identifier. Must match the dashboard exactly. */
export const ENTITLEMENT_ID = 'pro';

/**
 * Public SDK keys — safe to ship in the bundle by design (they can only read
 * offerings and make purchases the store itself authorizes; they cannot grant
 * entitlements). Provided per platform so Android can be lit up later by
 * setting one env var, with no code change.
 */
export function getRevenueCatApiKey(): string | null {
  const key = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  return key && key.trim().length > 0 ? key.trim() : null;
}

// ── SDK → our types ──────────────────────────────────────────────────────────

function mapStore(store: PurchasesEntitlementInfo['store']): PurchaseStore | null {
  switch (store) {
    case 'APP_STORE':
    case 'MAC_APP_STORE':
      return 'app_store';
    case 'PLAY_STORE':
      return 'play_store';
    case 'PROMOTIONAL':
      return 'promo';
    default:
      return null;
  }
}

/**
 * Derives our lifecycle status from RevenueCat's entitlement flags. The order
 * matters: an expired entitlement is expired regardless of the other flags,
 * and a billing issue outranks "cancelled" because the store is still trying
 * to charge them.
 */
function mapStatus(ent: PurchasesEntitlementInfo): SubscriptionStatus {
  if (!ent.isActive) return 'expired';
  if (ent.billingIssueDetectedAt) return 'billing_issue';
  if (ent.periodType === 'TRIAL') return 'trialing';
  if (!ent.willRenew || ent.unsubscribeDetectedAt) return 'cancelled';
  return 'active';
}

export function mapCustomerInfo(info: CustomerInfo): EntitlementSnapshot {
  // `active` only lists currently-valid entitlements; `all` includes lapsed
  // ones, which we still want so a just-expired subscriber renders as
  // "expired" rather than as if they'd never subscribed.
  const ent = info.entitlements.active[ENTITLEMENT_ID] ?? info.entitlements.all[ENTITLEMENT_ID];
  if (!ent) return FREE_ENTITLEMENT;

  return {
    tier: 'pro',
    status: mapStatus(ent),
    expiresAt: ent.expirationDate,
    willRenew: ent.willRenew,
    productId: ent.productIdentifier,
    store: mapStore(ent.store),
    isSandbox: ent.isSandbox,
  };
}

function mapPeriod(pkg: PurchasesPackage): BillingPeriod {
  switch (pkg.packageType) {
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'THREE_MONTH':
      return 'quarterly';
    case 'ANNUAL':
      return 'yearly';
    case 'LIFETIME':
      return 'lifetime';
    default:
      return 'unknown';
  }
}

/** Free-trial length in days, or null when the product has no free intro period. */
function trialDays(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const units = intro.periodNumberOfUnits * intro.cycles;
  switch (intro.periodUnit) {
    case 'DAY':
      return units;
    case 'WEEK':
      return units * 7;
    case 'MONTH':
      return units * 30;
    case 'YEAR':
      return units * 365;
    default:
      return null;
  }
}

function mapPlan(pkg: PurchasesPackage): Plan {
  const p = pkg.product;
  return {
    id: pkg.identifier,
    productId: p.identifier,
    title: p.title,
    description: p.description || null,
    period: mapPeriod(pkg),
    priceString: p.priceString,
    priceAmountMicros: Math.round(p.price * 1_000_000),
    currencyCode: p.currencyCode ?? null,
    trialDays: trialDays(pkg),
  };
}

function mapOffering(offering: PurchasesOffering): Offering {
  const plans = offering.availablePackages.map(mapPlan);
  // Annual is the pushed option on the paywall; fall back to whatever the
  // offering lists first so a monthly-only offering still preselects a plan.
  const defaultPlanId = offering.annual?.identifier ?? plans[0]?.id ?? null;
  return { id: offering.identifier, plans, defaultPlanId };
}

function isPurchasesError(e: unknown): e is PurchasesError {
  return typeof e === 'object' && e !== null && 'code' in e && 'message' in e;
}

// ── The adapter ──────────────────────────────────────────────────────────────

let configured = false;
// Keyed by package id so purchase(planId) can find the SDK object again
// without the caller holding a vendor type.
const packageCache = new Map<string, PurchasesPackage>();

async function ensureConfigured(userId: string | null): Promise<boolean> {
  if (configured) return true;
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  // Passing appUserID at configure time (rather than logIn afterwards) means
  // a signed-in cold start never creates a throwaway anonymous customer first.
  Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
  return true;
}

export const revenueCatBillingProvider: BillingProvider = {
  async configure(userId) {
    await ensureConfigured(userId);
  },

  /**
   * Aliases the device to the Supabase uuid so every webhook payload carries
   * it as `app_user_id`. Skip this and RevenueCat reports an `$RCAnonymousID`
   * that maps to no row in our database.
   */
  async identify(userId) {
    if (!(await ensureConfigured(userId))) return;
    const current = await Purchases.getAppUserID();
    if (current !== userId) await Purchases.logIn(userId);
  },

  async signOut() {
    if (!configured) return;
    // logOut() throws if the current user is already anonymous.
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  },

  async getOfferings() {
    if (!configured) return [];
    const offerings = await Purchases.getOfferings();
    packageCache.clear();
    const list = Object.values(offerings.all);
    for (const offering of list) {
      for (const pkg of offering.availablePackages) packageCache.set(pkg.identifier, pkg);
    }
    // `current` first so the paywall can take `[0]` and get the dashboard's
    // active offering.
    const mapped = list.map(mapOffering);
    const currentId = offerings.current?.identifier;
    return mapped.sort((a, b) => (a.id === currentId ? -1 : b.id === currentId ? 1 : 0));
  },

  async purchase(planId): Promise<PurchaseOutcome> {
    if (!configured) {
      return { status: 'unavailable', message: 'Billing is not configured.' };
    }
    let pkg = packageCache.get(planId);
    if (!pkg) {
      await this.getOfferings();
      pkg = packageCache.get(planId);
    }
    if (!pkg) return { status: 'error', message: `Unknown plan "${planId}".` };

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return { status: 'purchased', entitlement: mapCustomerInfo(customerInfo) };
    } catch (e) {
      if (isPurchasesError(e)) {
        if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || e.userCancelled) {
          return { status: 'cancelled' };
        }
        if (e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
          return { status: 'pending' };
        }
        return { status: 'error', message: e.message, code: e.readableErrorCode };
      }
      return { status: 'error', message: e instanceof Error ? e.message : 'Purchase failed.' };
    }
  },

  async restore() {
    if (!configured) return FREE_ENTITLEMENT;
    return mapCustomerInfo(await Purchases.restorePurchases());
  },

  async getEntitlements() {
    if (!configured) return FREE_ENTITLEMENT;
    return mapCustomerInfo(await Purchases.getCustomerInfo());
  },

  onEntitlementChange(cb) {
    // Listener registration is JS-side in the SDK and does not require
    // configure() to have run first, so this is safe to call in any order.
    const listener = (info: CustomerInfo) => cb(mapCustomerInfo(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  },

  async openManageSubscriptions() {
    if (!configured) return;
    await Purchases.showManageSubscriptions();
  },
};
