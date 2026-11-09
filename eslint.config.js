// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // The billing SDK may only be imported by its adapter. Every other module
  // talks to `lib/billing` through the provider-agnostic `BillingProvider`
  // interface, so swapping vendors stays a one-file change — see the
  // "Monetization" section in CLAUDE.md.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['lib/billing/revenuecat.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native-purchases',
              message:
                'Only lib/billing/revenuecat.ts may import the RevenueCat SDK. Use getBillingProvider() from @/lib/billing.',
            },
            {
              name: 'react-native-purchases-ui',
              message:
                'RevenueCat paywall templates are not used — the paywall is our own component (see CLAUDE.md).',
            },
          ],
          patterns: [
            {
              group: ['react-native-purchases/*', '@revenuecat/*'],
              message: 'Only lib/billing/revenuecat.ts may import the RevenueCat SDK.',
            },
          ],
        },
      ],
    },
  },
  // Flags hardcoded user-facing copy in JSX — see the "Internationalization"
  // section in CLAUDE.md. The exclusions below are tuned so that every warning
  // is a real untranslated string: identifiers passed to setters/handlers,
  // Intl option objects, numerals and punctuation are not copy.
  {
    files: ['app/**/*.tsx', 'components/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'warn',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            exclude: [
              'className', '[a-zA-Z]*ClassName', 'testID', 'style', 'name', 'icon', 'iconColor',
              'color', 'source', 'keyboardType', 'autoCapitalize', 'autoComplete',
              'returnKeyType', 'accessibilityRole', 'resizeMode', 'behavior',
              'key', 'href', 'pathname', 'contentContainerStyle', 'edges',
              // react-native-svg technical attributes — not user copy
              'id', 'x1', 'y1', 'x2', 'y2', 'offset', 'stopOpacity', 'fill',
              'strokeLinejoin', 'strokeLinecap', 'textAnchor', 'animationType',
              'placeholderTextColor', 'keyboardShouldPersistTaps', 'size',
              'pointerEvents', 'contentFit', 'resizeMode', 'cachePolicy',
              // expo-linear-gradient color stops — not user copy
              'colors',
              // i18n key paths and enum values, not copy
              'labelKey', 'initialMealType',
              // Event handlers: literals passed inside them are enum values
              // (setScope('global')); user-facing copy there goes through t().
              'on[A-Z][A-Za-z]*',
            ],
          },
          // Setting `words.exclude` replaces the plugin defaults, so the first
          // two entries restore them: ASCII digits/punctuation (placeholders
          // like "0", badge caps like "9+") and ALL-CAPS tokens (PR, XP, the
          // GYMRIVAL wordmark). Then non-ASCII separators and unit labels
          // (units are metric-only and untranslated by design).
          words: {
            exclude: ['[0-9!-/:-@[-`{-~]+', '[A-Z_ -]+', 'PRs', '[·–—]', '(kg|cm|g|kcal)'],
          },
          // Literal args to state setters and handlers are enum values, not copy.
          callees: {
            exclude: ['i18n(ext)?', 't', 'require', 'String', 'set[A-Za-z]*', 'handle[A-Z][A-Za-z]*'],
          },
          // Intl.DateTimeFormat options and local row-config keys.
          'object-properties': {
            exclude: ['[A-Z_-]+', 'year', 'month', 'day', 'weekday', 'key', 'ph'],
          },
        },
      ],
    },
  },
]);
