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
  // "Monetization & Entitlements" section in AGENTS.md.
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
                'RevenueCat paywall templates are not used — the paywall is our own component (see AGENTS.md).',
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
  // Flags new hardcoded JSX copy so it doesn't sneak back in as the app
  // grows — see the "Internationalization Rules" section in AGENTS.md.
  // Warning-level only: the app has ~450+ pre-existing un-converted <Text>
  // sites in screens not yet migrated to i18next, and this is meant to stop
  // the count from growing, not to block the build on legacy code.
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
              'className', 'testID', 'style', 'name', 'icon', 'iconColor',
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
            ],
          },
          // '·' is a punctuation separator, '99+' a badge cap — not user copy
          words: { exclude: ['PR', 'PRs', 'XP', 'GYM', 'RIVAL', 'GYMRIVAL', 'GYM RIVAL', '99+', '·'] },
        },
      ],
    },
  },
]);
