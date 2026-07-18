import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'ghost' | 'icon';

export interface ButtonProps {
  variant?: ButtonVariant;
  label?: string;
  icon?: IoniconName;
  iconSize?: number;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  label,
  icon,
  iconSize = 20,
  onPress,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'icon') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        className="w-11 h-11 rounded-2xl bg-elevated items-center justify-center"
        style={({ pressed }) => [
          pressed && { opacity: 0.7 },
          isDisabled && { opacity: 0.4 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : icon ? (
          <Ionicons name={icon} size={iconSize} color={Colors.accent} />
        ) : null}
      </Pressable>
    );
  }

  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      className="h-14 flex-row items-center justify-center gap-2 rounded-2xl"
      style={({ pressed }) => [
        isGhost ? styles.ghost : styles.primary,
        pressed && (isGhost ? { opacity: 0.7 } : { backgroundColor: Colors.accentDark }),
        isDisabled && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isGhost ? Colors.accent : Colors.primary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isGhost ? Colors.accent : Colors.primary}
            />
          )}
          {label ? (
            <Text style={[styles.label, isGhost ? styles.labelGhost : styles.labelPrimary]}>
              {label.toUpperCase()}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
  },
  labelPrimary: {
    color: Colors.primary,
  },
  labelGhost: {
    color: Colors.accent,
  },
});
