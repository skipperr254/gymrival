import type { Offering } from '@/lib/billing';

/**
 * A stand-in offering for capturing App Store Connect's required review
 * screenshot, which is a picture of the purchase screen.
 *
 * This exists to break a chicken-and-egg: ASC holds a subscription in
 * "Missing Metadata" until the review screenshot is uploaded, and products in
 * that state are invisible to StoreKit — so the real paywall renders its
 * "Plans unavailable" state and there is nothing worth screenshotting.
 *
 * The figures mirror the real App Store configuration exactly (EUR 4.99 /
 * EUR 49.99, 7-day trial on both), so the screenshot shows the reviewer what
 * they will actually see.
 *
 * Reachable only from a `__DEV__` build, only by explicitly tapping the dev
 * button in the paywall's empty state. It is never a fallback — a release
 * build keeps showing the honest empty state, so fake prices cannot ship.
 */
export const DEV_PREVIEW_OFFERING: Offering = {
  id: 'default',
  defaultPlanId: '$rc_annual',
  plans: [
    {
      id: '$rc_annual',
      productId: 'gymrival_pro_yearly',
      title: 'Pro Annual',
      description: 'Unlock all Pro features, best value',
      period: 'yearly',
      priceString: '€49.99',
      priceAmountMicros: 49_990_000,
      currencyCode: 'EUR',
      trialDays: 7,
    },
    {
      id: '$rc_monthly',
      productId: 'gymrival_pro_monthly',
      title: 'Pro Monthly',
      description: 'Unlock all Pro features',
      period: 'monthly',
      priceString: '€4.99',
      priceAmountMicros: 4_990_000,
      currencyCode: 'EUR',
      trialDays: 7,
    },
  ],
};
