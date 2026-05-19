import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";

const CODE_LENGTH = 8;

export default function VerifyScreen() {
  const { email, type } = useLocalSearchParams<{
    email: string;
    type: "signup" | "recovery";
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);

  const { verifyOtp, resendOtp, setPendingPasswordReset } = useAuthStore();

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
    }
    // For "signup" type, onAuthStateChange fires → auth gate redirects to (tabs)
  };

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify(code);
    }
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
        <View style={styles.container}>
          {/* Back */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text className="font-heading text-[46px] text-primary tracking-[2px] leading-[50px]">
              CHECK YOUR{"\n"}EMAIL
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-[22px]">
              We sent a {CODE_LENGTH}-digit code to{"\n"}
              <Text className="font-sans-semibold text-primary">{email}</Text>
            </Text>
          </View>

          {/* Code boxes */}
          <Pressable
            style={styles.boxRow}
            onPress={() => inputRef.current?.focus()}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const char = code[i] ?? "";
              const isActive = i === code.length && code.length < CODE_LENGTH;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    { width: boxWidth },
                    isActive && styles.boxActive,
                    char !== "" && styles.boxFilled,
                    loading && styles.boxLoading,
                  ]}
                >
                  <Text style={styles.boxChar}>{char}</Text>
                  {isActive && !loading && <View style={styles.cursor} />}
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
            style={styles.hiddenInput}
            editable={!loading}
          />

          {/* Resend */}
          <View className="flex-row justify-center items-center gap-1 mt-8">
            <Text className="font-sans text-[14px] text-secondary">
              Didn't get a code?
            </Text>
            <Pressable
              hitSlop={8}
              onPress={handleResend}
              disabled={resendCooldown > 0}
            >
              <Text
                className="font-sans-semibold text-[14px]"
                style={{ color: resendCooldown > 0 ? Colors.muted : Colors.accent }}
              >
                {resendCooldown > 0 ? ` Resend in ${resendCooldown}s` : " Resend"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  back: {
    marginBottom: 36,
  },
  header: {
    marginBottom: 44,
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  box: {
    height: 58,
    borderRadius: 14,
    backgroundColor: Colors.elevated,
    borderWidth: 1.5,
    borderColor: Colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: {
    borderColor: Colors.accent,
  },
  boxFilled: {
    borderColor: Colors.primary + "33",
    backgroundColor: Colors.surface,
  },
  boxLoading: {
    opacity: 0.5,
  },
  boxChar: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 28,
    color: Colors.primary,
    lineHeight: 34,
  },
  cursor: {
    position: "absolute",
    bottom: 10,
    width: 2,
    height: 18,
    borderRadius: 1,
    backgroundColor: Colors.accent,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
    top: 0,
    left: 0,
  },
});
