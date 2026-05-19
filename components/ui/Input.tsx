import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface InputProps extends Pick<TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'autoFocus'
> {
  label?: string;
  error?: string;
  leftIcon?: IoniconName;
}

export function Input({
  label,
  error,
  leftIcon,
  secureTextEntry,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry === true;
  const hasError = Boolean(error);

  return (
    <View>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View style={[styles.container, hasError && styles.containerError]}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={Colors.secondary}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={Colors.hint}
          selectionColor={Colors.accent}
          style={[styles.input, leftIcon ? styles.inputWithIcon : undefined]}
        />

        {isPassword ? (
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.secondary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: Colors.secondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Colors.elevated,
  },
  containerError: {
    borderColor: Colors.danger,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.primary,
  },
  inputWithIcon: {
    flex: 1,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.danger,
    marginTop: 6,
  },
});
