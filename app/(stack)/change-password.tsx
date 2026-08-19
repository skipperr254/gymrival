import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { DetailHeader } from '@/components/ui/DetailHeader';

export default function ChangePasswordScreen() {
  const { t } = useTranslation('profile');
  const { updatePassword } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmRef = useRef<TextInput>(null);

  const canSubmit = !loading && password.length >= 8 && confirmPassword.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (password !== confirmPassword) {
      setError(t('changePassword.passwordMismatch'));
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      Alert.alert(t('changePassword.errorTitle'), error);
      return;
    }
    Alert.alert(t('changePassword.successTitle'), t('changePassword.successMsg'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('changePassword.title')} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4">
            <Text className="font-heading text-[11px] tracking-[2px] text-[#505050] mb-2">
              {t('changePassword.newPasswordLabel')}
            </Text>
            <View className="bg-elevated rounded-xl px-4 flex-row items-center border border-default min-h-[50px]">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                placeholderTextColor={Colors.hint}
                selectionColor={Colors.accent}
                className="flex-1 font-sans text-[15px] text-primary"
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                autoFocus
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                {showPassword ? (
                  <EyeOff size={20} color={Colors.secondary} />
                ) : (
                  <Eye size={20} color={Colors.secondary} />
                )}
              </Pressable>
            </View>
            <Text className="font-sans text-[12px] text-muted mt-1.5 ml-1">
              {t('changePassword.passwordHint')}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="font-heading text-[11px] tracking-[2px] text-[#505050] mb-2">
              {t('changePassword.confirmPasswordLabel')}
            </Text>
            <View className="bg-elevated rounded-xl px-4 flex-row items-center border border-default min-h-[50px]">
              <TextInput
                ref={confirmRef}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                placeholderTextColor={Colors.hint}
                selectionColor={Colors.accent}
                className="flex-1 font-sans text-[15px] text-primary"
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
                {showConfirm ? (
                  <EyeOff size={20} color={Colors.secondary} />
                ) : (
                  <Eye size={20} color={Colors.secondary} />
                )}
              </Pressable>
            </View>
          </View>

          {error && (
            <Text className="font-sans text-[13px] text-accent mb-2 text-center">{error}</Text>
          )}

          <Pressable
            className="bg-accent rounded-2xl h-[52px] items-center justify-center mt-2"
            style={({ pressed }) => pressed && { opacity: 0.8 }}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text className="font-heading text-base text-primary tracking-[2px]">
                {t('changePassword.submit')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
});
