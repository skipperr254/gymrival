/**
 * Shared native-stack transition config for the root-level `(stack)` group
 * (every drill-down/full-screen route pushed on top of the tab navigator).
 * iOS uses the true native-stack default push — the same transition UIKit
 * itself uses (parallax + dim on the outgoing screen, interactive
 * swipe-back) — so it matches native apps' feel exactly. Android has no
 * equivalent "default push" convention to lose, so it keeps an explicit
 * slide.
 */
import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Colors } from '@/constants/theme';

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: Colors.base },
  animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
};
