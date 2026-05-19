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
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";
import { updateProfile } from "@/lib/api";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function normaliseUsername(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export default function SetupScreen() {
  const [username, setUsername] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, setPendingProfileSetup } = useAuthStore();

  const usernameValid = USERNAME_REGEX.test(username);
  const canSubmit = !loading && usernameValid;

  const handleUsernameChange = (text: string) => {
    setError(null);
    setUsername(normaliseUsername(text));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setError(null);
    setLoading(true);

    const heightNum = height.trim() ? parseFloat(height.trim()) : null;
    const weightNum = weight.trim() ? parseFloat(weight.trim()) : null;

    const { error } = await updateProfile(user.id, {
      username,
      ...(heightNum !== null && { height_cm: heightNum }),
      ...(weightNum !== null && { weight_kg: weightNum }),
    });

    setLoading(false);

    if (error) {
      if (error.toLowerCase().includes("unique") || error.toLowerCase().includes("duplicate")) {
        setError("That username is taken. Try another.");
      } else {
        setError(error);
      }
      return;
    }

    setPendingProfileSetup(false);
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
            <Text className="font-heading text-[46px] text-primary tracking-[2px] leading-[50px]">
              ALMOST{"\n"}THERE
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-[22px]">
              Choose your username — this is how your rivals will know you.
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Username */}
            <View>
              <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                Username <Text className="text-accent">*</Text>
              </Text>
              <View
                className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
                style={[
                  styles.inputBorder,
                  username.length > 0 && (usernameValid ? styles.inputValid : styles.inputError),
                ]}
              >
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="yourhandle"
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={20}
                />
              </View>
              <Text className="font-sans text-[12px] text-muted mt-1.5 ml-1">
                3–20 characters. Letters, numbers, underscores only.
              </Text>
            </View>

            {/* Height + Weight side by side */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  Height{" "}
                  <Text className="text-muted normal-case" style={{ fontSize: 11 }}>
                    (cm, optional)
                  </Text>
                </Text>
                <View
                  className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
                  style={styles.inputBorder}
                >
                  <TextInput
                    value={height}
                    onChangeText={(t) => setHeight(t.replace(/[^0-9.]/g, ""))}
                    placeholder="175"
                    placeholderTextColor={Colors.hint}
                    selectionColor={Colors.accent}
                    style={styles.input}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    maxLength={6}
                  />
                  <Text style={styles.unit}>cm</Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  Weight{" "}
                  <Text className="text-muted normal-case" style={{ fontSize: 11 }}>
                    (kg, optional)
                  </Text>
                </Text>
                <View
                  className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center"
                  style={styles.inputBorder}
                >
                  <TextInput
                    value={weight}
                    onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))}
                    placeholder="80"
                    placeholderTextColor={Colors.hint}
                    selectionColor={Colors.accent}
                    style={styles.input}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    maxLength={6}
                  />
                  <Text style={styles.unit}>kg</Text>
                </View>
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
              <Text
                className="font-heading text-xl text-primary tracking-[3px]"
                style={!canSubmit ? { opacity: 0.4 } : undefined}
              >
                {"LET'S GO"}
              </Text>
            )}
          </Pressable>

          {/* Skip */}
          <Pressable
            className="items-center mt-5"
            hitSlop={12}
            onPress={() => {
              setPendingProfileSetup(false);
              router.replace(Routes.compete);
            }}
          >
            <Text className="font-sans text-[13px] text-muted">
              Skip for now
            </Text>
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
  inputBorder: {
    borderWidth: 1.5,
    borderColor: Colors.elevated,
  },
  inputValid: {
    borderColor: Colors.success,
  },
  inputError: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: Colors.primary,
  },
  atSign: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: Colors.secondary,
    marginRight: 2,
  },
  unit: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.muted,
    marginLeft: 4,
  },
});
