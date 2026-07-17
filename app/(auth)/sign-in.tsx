import { Routes } from "@/constants/routes";
import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const { signIn } = useAuthStore();

  const canSubmit = !loading && email.trim().length > 0 && password.length >= 8;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error, emailNotConfirmed } = await signIn(
      email.trim(),
      password
    );
    setLoading(false);
    if (error) {
      if (emailNotConfirmed) {
        // Navigate to verify so the user can confirm their email
        router.push(
          `${Routes.verify}?email=${encodeURIComponent(email.trim())}&type=signup`
        );
        return;
      }
      setError(error);
    }
    // On success the auth gate in _layout.tsx handles navigation
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
              {t("signIn.title")}
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-5.75">
              {t("signIn.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Email */}
            <View>
              <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                {t("signIn.emailLabel")}
              </Text>
              <View
                className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
                style={styles.inputBorder}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("signIn.emailPlaceholder")}
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] uppercase">
                  {t("signIn.passwordLabel")}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push(Routes.forgotPassword)}
                >
                  <Text className="font-sans-medium text-[12px] text-accent">
                    {t("signIn.forgotPassword")}
                  </Text>
                </Pressable>
              </View>
              <View
                className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
                style={styles.inputBorder}
              >
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("signIn.passwordPlaceholder")}
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  style={[styles.input, { flex: 1 }]}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
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
                {t("signIn.submit")}
              </Text>
            )}
          </Pressable>

          {/* Sign up link */}
          <View className="flex-row justify-center items-center mt-8 gap-1">
            <Text className="font-sans text-[14px] text-secondary">
              {t("signIn.noAccount")}
            </Text>
            <Pressable
              onPress={() => router.replace(Routes.signUp)}
              hitSlop={8}
            >
              <Text className="font-sans-semibold text-[14px] text-accent">
                {" "}
                {t("signIn.signUpLink")}
              </Text>
            </Pressable>
          </View>
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
  inputBorder: {
    borderWidth: 1.5,
    borderColor: Colors.elevated,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: Colors.primary,
  },
});
