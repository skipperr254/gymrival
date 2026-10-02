/**
 * Legal links shown on the paywall and in Settings.
 *
 * Apple requires a subscription paywall to link both Terms of Use and a
 * Privacy Policy, and that the same URLs appear in App Store Connect. Missing
 * either is a routine rejection, so these are wired as real links from day one
 * rather than added at submission time.
 *
 * TERMS_OF_USE_URL currently points at Apple's standard EULA, which is the
 * documented, review-acceptable default when an app has no custom terms.
 * Swap it for GymRival's own once published — this file is the only place
 * either URL appears.
 */

/** TODO: replace with GymRival's published privacy policy before submission. */
export const PRIVACY_POLICY_URL = 'https://gymrival.app/privacy';

/** Apple's standard EULA — valid for review until custom terms exist. */
export const TERMS_OF_USE_URL =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * True while PRIVACY_POLICY_URL is still the unpublished placeholder. The
 * paywall links it either way (the URL must be tappable for review), but this
 * lets a dev build warn instead of silently shipping a dead link.
 */
export const LEGAL_URLS_ARE_PLACEHOLDERS = PRIVACY_POLICY_URL.includes('gymrival.app');
