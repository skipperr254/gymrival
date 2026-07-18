import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

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
        <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] uppercase mb-2">
          {label}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center bg-elevated rounded-2xl h-14 px-4 border-[1.5px] ${
          hasError ? 'border-danger' : 'border-elevated'
        }`}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={Colors.secondary}
            style={{ marginRight: 10 }}
          />
        ) : null}

        <TextInput
          {...rest}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={Colors.hint}
          selectionColor={Colors.accent}
          className="flex-1 font-sans text-[15px] text-primary"
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
        <Text className="font-sans text-[13px] text-danger mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
}
