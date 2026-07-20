import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import type { IoniconName } from './helpers';

export function DetailRow({
  icon,
  label,
  value,
  isFirst = false,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  isFirst?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        !isFirst ? 'border-t border-elevated' : ''
      }`}
    >
      <View className="w-9 h-9 rounded-[10px] bg-elevated items-center justify-center">
        <Ionicons name={icon} size={17} color='#909090' />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-heading text-[10px] text-[#505050] tracking-[1.5px] mb-0.5">
          {label}
        </Text>
        <Text className="font-sans text-sm text-primary font-medium">{value}</Text>
      </View>
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  sub,
  iconColor,
  onPress,
  isFirst = false,
}: {
  icon: IoniconName;
  label: string;
  sub: string;
  iconColor: string;
  onPress: () => void;
  isFirst?: boolean;
}) {
  const iconBg = iconColor + '18';
  return (
    <Pressable
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        !isFirst ? 'border-t border-elevated' : ''
      }`}
      style={({ pressed }) => pressed && { opacity: 0.65 }}
      onPress={onPress}
    >
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View className="flex-1 gap-px">
        <Text className="font-sans-medium text-sm text-primary">{label}</Text>
        <Text className="font-sans text-[11px] text-[#606060] mt-px">{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color='#404040' style={rtlIconFlip} />
    </Pressable>
  );
}
