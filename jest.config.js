/**
 * Jest configuration for GymRival.
 *
 * Uses the `jest-expo` preset so Expo/React Native native modules are mocked
 * out of the box. Path alias `@/` is mapped to the project root to match
 * tsconfig. Keep unit tests colocated under `__tests__/` (logic-first — pure
 * functions and stores; component/render tests can be added later).
 */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
};
