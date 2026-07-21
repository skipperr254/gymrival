import { View, Text, Pressable, Switch } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import { Colors } from '@/constants/theme';

export function DetailRow({
  icon: Icon,
  label,
  value,
  isFirst = false,
}: {
  icon: LucideIcon;
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
        <Icon size={17} color='#909090' />
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
  icon: Icon,
  label,
  sub,
  iconColor,
  onPress,
  isFirst = false,
  disabled = false,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  iconColor: string;
  onPress: () => void;
  isFirst?: boolean;
  /** Renders the row non-interactive and dimmed — for a feature that's built into the UI but has no working backend yet. */
  disabled?: boolean;
  /** Short pill shown in place of the chevron, e.g. "Coming soon". Only meaningful when disabled. */
  badge?: string;
}) {
  const iconBg = iconColor + '18';
  return (
    <Pressable
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        !isFirst ? 'border-t border-elevated' : ''
      } ${disabled ? 'opacity-50' : ''}`}
      style={({ pressed }) => pressed && !disabled && { opacity: 0.65 }}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={17} color={iconColor} />
      </View>
      <View className="flex-1 gap-px">
        <Text className="font-sans-medium text-sm text-primary">{label}</Text>
        <Text className="font-sans text-[11px] text-[#606060] mt-px">{sub}</Text>
      </View>
      {disabled && badge ? (
        <View className="bg-elevated rounded-full px-2.5 py-1">
          <Text className="font-heading text-[9px] text-secondary tracking-[1px]">{badge}</Text>
        </View>
      ) : (
        <ChevronRight size={18} color={Colors.hint} style={rtlIconFlip} />
      )}
    </Pressable>
  );
}

export function SettingsToggleRow({
  icon: Icon,
  label,
  sub,
  iconColor,
  value,
  onValueChange,
  isFirst = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  iconColor: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isFirst?: boolean;
  disabled?: boolean;
}) {
  const iconBg = iconColor + '18';
  return (
    <View
      className={`flex-row items-center gap-3 px-5 py-3.5 ${
        !isFirst ? 'border-t border-elevated' : ''
      }`}
    >
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={17} color={iconColor} />
      </View>
      <View className="flex-1 gap-px">
        <Text className="font-sans-medium text-sm text-primary">{label}</Text>
        <Text className="font-sans text-[11px] text-[#606060] mt-px">{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.elevated, true: Colors.accent }}
        thumbColor={Colors.primary}
        ios_backgroundColor={Colors.elevated}
      />
    </View>
  );
}
