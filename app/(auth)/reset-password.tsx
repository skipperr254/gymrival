import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";

export default function ResetPasswordScreen() {
  const { t } = useTranslation("auth");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmRef = useRef<TextInput>(null);

  const { updatePassword, setPendingPasswordReset } = useAuthStore();

  const canSubmit =
    !loading && password.length >= 8 && confirmPassword.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    setPendingPasswordReset(false);
    router.replace(Routes.compete);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View className="mb-10">
            <Text className="font-heading text-[22px] text-primary tracking-[4px]">
              GYM<Text className="text-accent">RIVAL</Text>
            </Text>
          </View>

          {/* Header */}
          <View className="mb-8">
            <Text className="font-heading text-[46px] text-primary tracking-[2px] leading-12.5">
              {t("resetPassword.title")}
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-5.75">
              {t("resetPassword.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* New Password */}
            <View>
              <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                {t("resetPassword.newPasswordLabel")}
              </Text>
              <View className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] border-elevated">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  className="flex-1 font-sans text-[15px] text-primary"
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  autoFocus
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.secondary}
                  />
                </Pressable>
              </View>
              <Text className="font-sans text-[12px] text-muted mt-1.5 ml-1">
                {t("resetPassword.passwordHint")}
              </Text>
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                {t("resetPassword.confirmPasswordLabel")}
              </Text>
              <View className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] border-elevated">
                <TextInput
                  ref={confirmRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  className="flex-1 font-sans text-[15px] text-primary"
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={10}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.secondary}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Error */}
          {error && (
            <Text className="font-sans text-[13px] text-accent mt-4 text-center">
              {error}
            </Text>
          )}

          {/* CTA */}
          <Pressable
            className="bg-accent rounded-2xl h-14 items-center justify-center mt-8"
            style={({ pressed }) =>
              pressed ? { backgroundColor: Colors.accentDark } : undefined
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text className="font-heading text-xl text-primary tracking-[3px]">
                {t("resetPassword.submit")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
