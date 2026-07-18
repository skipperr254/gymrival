import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius } from '@/constants/theme';

export interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isActive = index === selectedIndex;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.elevated,
    borderRadius: Radius.card,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  optionActive: {
    backgroundColor: Colors.surface,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 1.5,
    color: Colors.muted,
  },
  labelActive: {
    color: Colors.primary,
  },
});
