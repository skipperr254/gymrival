import {
  FREE_ENTITLEMENT,
  type BillingProvider,
  type EntitlementSnapshot,
  type Offering,
  type PurchaseOutcome,
} from './types';

/**
 * The adapter used wherever in-app purchases cannot physically work: Expo Go
 * (the RevenueCat SDK is JS mocks there), web, and Jest.
 *
 * It always resolves "free" and never throws. That matters — a dev running the
 * app in Expo Go to work on the nutrition screen should not hit a billing
 * crash, and the server is the entitlement authority anyway, so reporting free
 * here costs nothing: `useEntitlementStore` unions this with the server row.
 */
export const noopBillingProvider: BillingProvider = {
  async configure() {},
  async identify() {},
  async signOut() {},

  async getOfferings(): Promise<Offering[]> {
    return [];
  },

  async purchase(): Promise<PurchaseOutcome> {
    return {
      status: 'unavailable',
      message: 'In-app purchases are not available in this environment.',
    };
  },

  async restore(): Promise<EntitlementSnapshot> {
    return FREE_ENTITLEMENT;
  },

  async getEntitlements(): Promise<EntitlementSnapshot> {
    return FREE_ENTITLEMENT;
  },

  onEntitlementChange() {
    return () => {};
  },

  async openManageSubscriptions() {},
};
