import { View } from 'react-native';
import { Spacing } from '@/constants/theme';

export interface BottomSpacerProps {
  height?: number;
}

export function BottomSpacer({ height = Spacing.tabBarHeight + 16 }: BottomSpacerProps) {
  return <View style={{ height }} />;
}
