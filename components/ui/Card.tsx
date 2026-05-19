import { StyleProp, View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: Radius.card,
          padding: Spacing.cardPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
