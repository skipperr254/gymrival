import { useState } from "react";
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

export default function ForgotPasswordScreen() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { resetPasswordForEmail } = useAuthStore();

  const canSubmit = !loading && email.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const { error } = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push(
      `${Routes.verify}?email=${encodeURIComponent(email.trim())}&type=recovery`
    );
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
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-8"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>

          {/* Header */}
          <View className="mb-8">
            <Text className="font-heading text-[46px] text-primary tracking-[2px] leading-12.5">
              {t("forgotPassword.title")}
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-5.75">
              {t("forgotPassword.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <View>
            <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
              {t("forgotPassword.emailLabel")}
            </Text>
            <View
              className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
              style={styles.inputBorder}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t("forgotPassword.emailPlaceholder")}
                placeholderTextColor={Colors.hint}
                selectionColor={Colors.accent}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                autoFocus
              />
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
                {t("forgotPassword.submit")}
              </Text>
            )}
          </Pressable>

          {/* Back to sign in */}
          <View className="flex-row justify-center items-center mt-8 gap-1">
            <Text className="font-sans text-[14px] text-secondary">
              {t("forgotPassword.rememberPassword")}
            </Text>
            <Pressable
              onPress={() => router.replace(Routes.signIn)}
              hitSlop={8}
            >
              <Text className="font-sans-semibold text-[14px] text-accent">
                {" "}
                {t("forgotPassword.signInLink")}
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
