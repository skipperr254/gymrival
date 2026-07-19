/* eslint-disable @typescript-eslint/no-require-imports -- conditional native-only
   polyfill load; must run synchronously before Intl.RelativeTimeFormat is
   first used, so a dynamic import() (async) or static import (unconditional)
   won't work here. */
import { Platform } from "react-native";

/**
 * Hermes defines Intl.RelativeTimeFormat as a constructor but its
 * implementation is broken on Android — calling `new Intl.RelativeTimeFormat()`
 * throws "Cannot read property 'prototype' of undefined"
 * (facebook/react-native#42914). Because the constructor exists, FormatJS's
 * default `shouldPolyfill()` check believes the platform already supports it
 * and skips patching, so we must force-install regardless of feature
 * detection. Browsers (web target) have a correct native implementation, so
 * this only runs on native platforms.
 */
if (Platform.OS !== "web") {
  require("@formatjs/intl-relativetimeformat/polyfill-force");
  require("@formatjs/intl-relativetimeformat/locale-data/en");
  require("@formatjs/intl-relativetimeformat/locale-data/nl");
  require("@formatjs/intl-relativetimeformat/locale-data/es");
  require("@formatjs/intl-relativetimeformat/locale-data/de");
  require("@formatjs/intl-relativetimeformat/locale-data/pt");
  require("@formatjs/intl-relativetimeformat/locale-data/fr");
  require("@formatjs/intl-relativetimeformat/locale-data/ar");
}
