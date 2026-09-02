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
 *
 * Hermes has the same broken-stub problem with Intl.Locale, and
 * @formatjs/intl-relativetimeformat's __addLocaleData (called when each
 * locale-data file below loads) internally does `new Intl.Locale(...)` to
 * resolve locale data. So Intl.Locale must be force-polyfilled first, or
 * loading the RTF locale data throws the same
 * "Cannot read property 'prototype' of undefined" error one layer deeper.
 *
 * Finally, InitializeRelativeTimeFormat (run on every `new
 * Intl.RelativeTimeFormat()`) internally constructs `new Intl.PluralRules()`
 * to pick the correct plural form ("1 day" vs "2 days"). Hermes/Android is
 * missing a working Intl.PluralRules, so without force-polyfilling it first
 * the RTF constructor throws "undefined is not a function" from deep inside
 * the memoized PluralRules factory. Order matters: Locale → PluralRules → RTF.
 *
 * Every require uses an explicit ".js" so it matches each package's "exports"
 * map exactly (the maps list ".../polyfill-force.js" and ".../locale-data/*"
 * with the extension); requiring the extensionless subpath makes Metro warn
 * about an "invalid package.json configuration" and fall back to file-based
 * resolution.
 */
if (Platform.OS !== "web") {
  require("@formatjs/intl-locale/polyfill-force.js");

  require("@formatjs/intl-pluralrules/polyfill-force.js");
  require("@formatjs/intl-pluralrules/locale-data/en.js");
  require("@formatjs/intl-pluralrules/locale-data/nl.js");
  require("@formatjs/intl-pluralrules/locale-data/es.js");
  require("@formatjs/intl-pluralrules/locale-data/de.js");
  require("@formatjs/intl-pluralrules/locale-data/pt.js");
  require("@formatjs/intl-pluralrules/locale-data/fr.js");
  require("@formatjs/intl-pluralrules/locale-data/ar.js");

  require("@formatjs/intl-relativetimeformat/polyfill-force.js");
  require("@formatjs/intl-relativetimeformat/locale-data/en.js");
  require("@formatjs/intl-relativetimeformat/locale-data/nl.js");
  require("@formatjs/intl-relativetimeformat/locale-data/es.js");
  require("@formatjs/intl-relativetimeformat/locale-data/de.js");
  require("@formatjs/intl-relativetimeformat/locale-data/pt.js");
  require("@formatjs/intl-relativetimeformat/locale-data/fr.js");
  require("@formatjs/intl-relativetimeformat/locale-data/ar.js");
}
