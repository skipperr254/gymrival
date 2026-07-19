import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/theme";
import { pickerLanguages, type LanguageCode } from "@/lib/i18n/languages";
import { useAuthStore } from "@/store/useAuthStore";
import { updateLanguage } from "@/lib/api";

export default function LanguageScreen() {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuthStore();
  const languages = pickerLanguages();
  // Re-entrancy guard — without it, tapping two different languages in
  // quick succession could let two updateLanguage() calls resolve out of
  // order, leaving the DB on a language different from the one displayed.
  const [switching, setSwitching] = useState(false);

  const handleSelect = async (code: LanguageCode) => {
    if (code === i18n.language || switching) return;
    const previousLanguage = i18n.language;
    setSwitching(true);
    await i18n.changeLanguage(code);
    if (user?.id) {
      const { error } = await updateLanguage(user.id, code);
      if (error) {
        // profiles.language is the documented cross-device source of truth
        // once explicitly set — leaving the UI on the new language while the
        // write failed meant this device silently drifted from what every
        // other device (and the next cold start's sync) would show. Revert
        // instead of pretending the switch succeeded.
        await i18n.changeLanguage(previousLanguage);
        Alert.alert(t("settings.languageErrorTitle"), t("settings.languageErrorSub"));
      }
    }
    setSwitching(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top"]}>
      <View
        className="flex-row items-center px-4 py-3.5"
        style={{
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: Colors.borderDefault,
        }}
      >
        <Pressable
          className="w-9 h-9 items-center justify-center"
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </Pressable>
        <Text className="flex-1 text-center font-heading text-xl text-primary tracking-[2px] -ml-9">
          {t("settings.language").toUpperCase()}
        </Text>
        <View className="w-9" />
      </View>

      <Text className="font-sans text-[13px] text-muted px-4 pt-4 pb-1">
        {t("settings.languageAuto")}
      </Text>

      <View className="px-4 pt-2 gap-3">
        {languages.map((lang) => {
          const isActive = lang.code === i18n.language;
          return (
            <Pressable
              key={lang.code}
              className={`card-elevated flex-row items-center justify-between ${
                isActive ? 'border-[1.5px] border-accent' : ''
              } ${switching ? 'opacity-60' : ''}`}
              onPress={() => handleSelect(lang.code)}
              disabled={switching}
            >
              <Text className="font-sans-medium text-base text-primary">
                {lang.nativeName}
              </Text>
              {isActive && switching ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                isActive && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
                )
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
