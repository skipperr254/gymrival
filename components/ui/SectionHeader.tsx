import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

export interface SectionHeaderAction {
  label: string;
  onPress: () => void;
}

export interface SectionHeaderProps {
  label: string;
  action?: SectionHeaderAction;
}

export function SectionHeader({ label, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={10}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.primary,
    letterSpacing: 2,
  },
  action: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.accent,
  },
});
