import { Pressable, Text, View } from 'react-native';

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
    <View className="flex-row items-center justify-between mb-3">
      <Text className="font-heading text-xl text-primary tracking-[2px]">
        {label.toUpperCase()}
      </Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={10}
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text className="font-sans-medium text-[13px] text-accent">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
