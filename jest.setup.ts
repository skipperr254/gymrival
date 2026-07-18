/**
 * Global Jest setup. Runs after the test framework is installed but before
 * each test file. Individual test files mock `@/lib/i18n` where they need
 * deterministic translation output, so no global i18n init is required here.
 * This file is the place to register shared mocks as the suite grows.
 */
export {};
