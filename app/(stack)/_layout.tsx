import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

/**
 * Every drill-down / full-screen route pushed on top of the tab navigator
 * lives here as a sibling of `(tabs)`, not nested inside any one tab's own
 * stack. That's what makes the push transition natively cover (and, on
 * pop, reveal) the ENTIRE tab navigator — including the tab bar — in a
 * single native transaction, the same way `hidesBottomBarWhenPushed` works
 * on iOS. See CustomTabBar for the corresponding simplification.
 */
export default function StackGroupLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
