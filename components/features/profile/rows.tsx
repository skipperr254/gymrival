import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IoniconName } from './helpers';
import { styles } from './styles';

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
    <View style={[styles.detailRow, !isFirst && styles.rowBorder]}>
      <View style={styles.detailIconBox}>
        <Ionicons name={icon} size={17} color='#909090' />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
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
      style={({ pressed }) => [
        styles.settingsRow,
        !isFirst && styles.rowBorder,
        pressed && { opacity: 0.65 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingsIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsLabel}>{label}</Text>
        <Text style={styles.settingsSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color='#404040' />
    </Pressable>
  );
}
