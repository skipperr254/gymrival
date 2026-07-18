import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";

const CODE_LENGTH = 8;

export default function VerifyScreen() {
  const { t } = useTranslation("auth");
  const { email, type } = useLocalSearchParams<{
    email: string;
    type: "signup" | "recovery";
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);

  const { verifyOtp, resendOtp, setPendingPasswordReset, setPendingProfileSetup } = useAuthStore();

  const { width: screenWidth } = useWindowDimensions();
  // 40px side padding (20 each side) + gaps between boxes
  const BOX_GAP = 8;
  const boxWidth = Math.floor(
    (screenWidth - 40 - (CODE_LENGTH - 1) * BOX_GAP) / CODE_LENGTH
  );

  // Focus keyboard on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = (text: string) => {
    setError(null);
    setCode(text.replace(/\D/g, "").slice(0, CODE_LENGTH));
  };

  const handleVerify = async (token: string) => {
    if (token.length < CODE_LENGTH || loading) return;
    setLoading(true);
    setError(null);

    const { error } = await verifyOtp(email!, token, type!);
    setLoading(false);

    if (error) {
      setError(error);
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    if (type === "recovery") {
      setPendingPasswordReset(true);
      router.replace(Routes.resetPassword);
    } else {
      setPendingProfileSetup(true);
      router.replace(Routes.setup);
    }
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify(code);
    }
    // handleVerify is recreated each render but calling it with stale values is fine
    // here since `code` is the only thing that matters and drives this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    const { error } = await resendOtp(email, type!);
    if (error) {
      setError(error);
    } else {
      setResendCooldown(60);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 px-5 pt-4 pb-10">
          {/* Back */}
          <Pressable onPress={() => router.back()} hitSlop={12} className="mb-9">
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>

          {/* Header */}
          <View className="mb-11">
            <Text className="font-heading text-[46px] text-primary tracking-[2px] leading-[50px]">
              {t("verify.title")}
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-[22px]">
              {t("verify.subtitle", { count: CODE_LENGTH })}
              {"\n"}
              <Text className="font-sans-semibold text-primary">{email}</Text>
            </Text>
          </View>

          {/* Code boxes */}
          <Pressable
            className="flex-row justify-center gap-2"
            onPress={() => inputRef.current?.focus()}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const char = code[i] ?? "";
              const isActive = i === code.length && code.length < CODE_LENGTH;
              return (
                <View
                  key={i}
                  className={`h-[58px] rounded-[14px] bg-elevated border-[1.5px] items-center justify-center ${
                    isActive
                      ? "border-accent"
                      : char !== ""
                        ? "border-white/20 bg-surface"
                        : "border-elevated"
                  } ${loading ? "opacity-50" : ""}`}
                  style={{ width: boxWidth }}
                >
                  <Text className="font-heading text-primary text-[28px] leading-[34px]">
                    {char}
                  </Text>
                  {isActive && !loading && (
                    <View className="absolute bottom-[10px] w-0.5 h-[18px] rounded-[1px] bg-accent" />
                  )}
                </View>
              );
            })}
          </Pressable>

          {/* Loading indicator */}
          {loading && (
            <View className="items-center mt-4">
              <ActivityIndicator color={Colors.accent} />
            </View>
          )}

          {/* Error */}
          {error && !loading && (
            <Text className="font-sans text-[13px] text-accent text-center mt-4">
              {error}
            </Text>
          )}

          {/* Hidden real input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            caretHidden
            className="absolute opacity-0 w-px h-px top-0 left-0"
            editable={!loading}
          />

          {/* Resend */}
          <View className="flex-row justify-center items-center gap-1 mt-8">
            <Text className="font-sans text-[14px] text-secondary">
              {t("verify.noCode")}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={handleResend}
              disabled={resendCooldown > 0}
            >
              <Text
                className={`font-sans-semibold text-[14px] ${
                  resendCooldown > 0 ? "text-muted" : "text-accent"
                }`}
              >
                {" "}
                {resendCooldown > 0
                  ? t("verify.resendIn", { seconds: resendCooldown })
                  : t("verify.resend")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
