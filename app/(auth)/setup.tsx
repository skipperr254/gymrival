import { useEffect, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";
import { updateProfile } from "@/lib/api";
import { clearQuiz, loadQuiz, quizToProfileUpdate } from "@/lib/onboarding";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// Module level, so it carries i18n key paths rather than resolved strings.
const SEX_OPTIONS: { value: "male" | "female"; labelKey: string }[] = [
  { value: "male", labelKey: "setup.sexMale" },
  { value: "female", labelKey: "setup.sexFemale" },
];

function normaliseUsername(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export default function SetupScreen() {
  const { t } = useTranslation("auth");
  const [username, setUsername] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, setPendingProfileSetup, setPendingOnboardingPayoff } = useAuthStore();

  // The quiz ran before this account existed, so its answers are sitting in
  // AsyncStorage. Load them here and flush them with the rest of the profile
  // in one update — two writes would leave a half-applied profile if the
  // second failed.
  const [quizUpdate, setQuizUpdate] = useState<ReturnType<typeof quizToProfileUpdate>>({});
  useEffect(() => {
    loadQuiz().then((q) => setQuizUpdate(quizToProfileUpdate(q)));
  }, []);

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
    const ageNum = age.trim() ? parseInt(age.trim(), 10) : null;

    const { error } = await updateProfile(user.id, {
      username,
      ...(heightNum !== null && { height_cm: heightNum }),
      ...(weightNum !== null && { weight_kg: weightNum }),
      ...(ageNum !== null && !Number.isNaN(ageNum) && { age: ageNum }),
      ...(sex !== null && { sex }),
      ...quizUpdate,
    });

    setLoading(false);

    if (error) {
      if (error.toLowerCase().includes("unique") || error.toLowerCase().includes("duplicate")) {
        setError(t("setup.usernameTaken"));
      } else {
        setError(error);
      }
      return;
    }

    // Answers are on the profile now; the cache has done its job.
    clearQuiz();
    setPendingProfileSetup(false);
    // Hand over to the payoff screen rather than the tabs. The flag is what
    // stops the root layout's auth gate skipping straight past it.
    setPendingOnboardingPayoff(true);
    router.replace(Routes.planReady);
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
              {t("setup.title")}
            </Text>
            <Text className="font-sans text-[15px] text-secondary mt-3 leading-[22px]">
              {t("setup.subtitle")}
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Username */}
            <View>
              <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                {t("setup.usernameLabel")} <Text className="text-accent">*</Text>
              </Text>
              <View
                className={`bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] ${
                  username.length > 0
                    ? usernameValid
                      ? 'border-success'
                      : 'border-accent'
                    : 'border-elevated'
                }`}
              >
                <Text className="font-sans-medium text-[15px] text-secondary mr-0.5">@</Text>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder={t("setup.usernamePlaceholder")}
                  placeholderTextColor={Colors.hint}
                  selectionColor={Colors.accent}
                  className="flex-1 font-sans text-[15px] text-primary"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={20}
                />
              </View>
              <Text className="font-sans text-[12px] text-muted mt-1.5 ml-1">
                {t("setup.usernameHint")}
              </Text>
            </View>

            {/* Age + Sex — required by Mifflin-St Jeor. Collected here rather
                than on the separate nutrition-goals screen, which most users
                never opened: that is why calorie targets silently fell back
                to defaults before B4. */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  {t("setup.ageLabel")}
                </Text>
                <View className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] border-elevated">
                  <TextInput
                    value={age}
                    onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
                    placeholder={t("setup.agePlaceholder")}
                    placeholderTextColor={Colors.hint}
                    selectionColor={Colors.accent}
                    className="flex-1 font-sans text-[15px] text-primary"
                    keyboardType="number-pad"
                    returnKeyType="next"
                    maxLength={3}
                  />
                </View>
              </View>

              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  {t("setup.sexLabel")}
                </Text>
                <View className="flex-row gap-2">
                  {SEX_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSex(opt.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sex === opt.value }}
                      className={`flex-1 h-14 rounded-2xl items-center justify-center border-[1.5px] ${
                        sex === opt.value
                          ? "bg-[#241a1a] border-accent"
                          : "bg-elevated border-elevated"
                      }`}
                      style={({ pressed }) => pressed && { opacity: 0.8 }}
                    >
                      <Text
                        className={`font-sans-medium text-[14px] ${
                          sex === opt.value ? "text-primary" : "text-secondary"
                        }`}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Height + Weight side by side */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  {t("setup.heightLabel")}
                </Text>
                <View className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] border-elevated">
                  <TextInput
                    value={height}
                    onChangeText={(v) => setHeight(v.replace(/[^0-9.]/g, ""))}
                    placeholder={t("setup.heightPlaceholder")}
                    placeholderTextColor={Colors.hint}
                    selectionColor={Colors.accent}
                    className="flex-1 font-sans text-[15px] text-primary"
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                    maxLength={6}
                  />
                  <Text className="font-sans text-[13px] text-muted ml-1">cm</Text>
                </View>
              </View>

              <View className="flex-1">
                <Text className="font-sans-medium text-[11px] text-secondary tracking-[1.5px] mb-2 uppercase">
                  {t("setup.weightLabel")}
                </Text>
                <View className="bg-elevated rounded-2xl h-14 px-4 flex-row items-center border-[1.5px] border-elevated">
                  <TextInput
                    value={weight}
                    onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
                    placeholder={t("setup.weightPlaceholder")}
                    placeholderTextColor={Colors.hint}
                    selectionColor={Colors.accent}
                    className="flex-1 font-sans text-[15px] text-primary"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    maxLength={6}
                  />
                  <Text className="font-sans text-[13px] text-muted ml-1">kg</Text>
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
                {t("setup.submit")}
              </Text>
            )}
          </Pressable>

          {/* Skip */}
          <Pressable
            className="items-center mt-5"
            hitSlop={12}
            onPress={() => {
              clearQuiz();
              setPendingProfileSetup(false);
              router.replace(Routes.compete);
            }}
          >
            <Text className="font-sans text-[13px] text-muted">
              {t("setup.skip")}
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
});
