/**
 * Shared native-stack transition config. Android's native-stack default
 * animation is a fade/scale that reads as a "flash" compared to iOS's native
 * slide — force the same slide-from-right on both platforms so drill-down
 * navigation feels intentional everywhere in the app.
 */
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Colors } from '@/constants/theme';

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: Colors.base },
  animation: 'slide_from_right',
};
