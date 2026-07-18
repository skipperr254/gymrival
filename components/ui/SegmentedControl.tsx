import { Pressable, Text, View } from 'react-native';

export interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ options, selectedIndex, onChange }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-elevated rounded-2xl p-1 gap-1">
      {options.map((option, index) => {
        const isActive = index === selectedIndex;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={`flex-1 py-2.5 items-center justify-center rounded-xl ${
              isActive ? 'bg-surface' : ''
            }`}
          >
            <Text
              className={`font-heading text-[13px] tracking-[1.5px] ${
                isActive ? 'text-primary' : 'text-muted'
              }`}
            >
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
