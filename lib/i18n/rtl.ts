import { I18nManager } from "react-native";
import { isRTLLanguage } from "./languages";

/**
 * Aligns the native layout direction with the given language. Returns true
 * when the direction changed — the new direction only takes effect once the
 * JS bundle is reloaded (reloadAppAsync), so callers must reload after a
 * `true` result. forceRTL persists natively, so subsequent cold starts boot
 * directly in the right direction and this becomes a no-op.
 *
 * Note: in Expo Go the preference can be reset between sessions; dev-client
 * and EAS builds (with extra.supportsRTL in app.json) honor it fully.
 */
export function applyLayoutDirection(languageCode: string): boolean {
  const shouldBeRTL = isRTLLanguage(languageCode);
  if (shouldBeRTL === I18nManager.isRTL) return false;
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true;
}

/**
 * Mirrors a directional icon glyph (chevrons, arrows) in RTL. RN mirrors
 * flexbox layout automatically, but icon-font glyphs keep their drawn
 * direction — a "back" chevron must point right in an RTL layout.
 * Safe to compute at module load: the native side fixes isRTL before JS runs.
 */
export const rtlIconFlip = I18nManager.isRTL
  ? ({ transform: [{ scaleX: -1 }] } as const)
  : undefined;
