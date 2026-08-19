import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle } from "lucide-react-native";
import { reloadAppAsync } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { Colors } from "@/constants/theme";
import { pickerLanguages, type LanguageCode } from "@/lib/i18n/languages";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n/languageDetector";
import { applyLayoutDirection } from "@/lib/i18n/rtl";
import { DetailHeader } from "@/components/ui/DetailHeader";
import { useAuthStore } from "@/store/useAuthStore";
import { updateLanguage } from "@/lib/api";

export default function LanguageScreen() {
  const { t, i18n } = useTranslation("common");
  const { user } = useAuthStore();
  const languages = pickerLanguages();
  // Covers the persist-then-reload window: guards double-taps and shows the
  // full-screen loading overlay until reloadAppAsync tears the JS tree down.
  const [switching, setSwitching] = useState(false);

  // Instead of switching i18n in place (which re-renders every mounted
  // screen at once and still leaves locale-captured state stale), persist
  // the choice and reload the JS bundle — the language detector picks it up
  // at boot and the whole app starts in the new language. Persisting comes
  // first: nothing has changed yet if the write fails, so there is no
  // in-place switch to revert.
  const applyLanguage = async (code: LanguageCode) => {
    setSwitching(true);
    if (user?.id) {
      const { error } = await updateLanguage(user.id, code);
      if (error) {
        setSwitching(false);
        Alert.alert(t("settings.languageErrorTitle"), t("settings.languageErrorSub"));
        return;
      }
    }
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Best-effort: for signed-in users the profiles.language sync in the
      // root layout still applies the saved choice after the reload.
    }
    // Flip the native layout direction when crossing the LTR/RTL boundary —
    // it only takes effect on the reload we're about to do anyway.
    applyLayoutDirection(code);
    await reloadAppAsync("language-changed");
  };

  const handleSelect = (code: LanguageCode) => {
    if (code === i18n.language || switching) return;
    const target = languages.find((l) => l.code === code);
    Alert.alert(
      t("settings.languageConfirmTitle"),
      t("settings.languageConfirmSub", { language: target?.nativeName ?? code }),
      [
        { text: t("actions.cancel"), style: "cancel" },
        { text: t("settings.languageConfirmCta"), onPress: () => applyLanguage(code) },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={["top"]}>
      <DetailHeader title={t("settings.language").toUpperCase()} />

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
              {isActive && (
                <CheckCircle size={22} color={Colors.accent} />
              )}
            </Pressable>
          );
        })}
      </View>

      {switching && (
        <View className="absolute inset-0 z-10 items-center justify-center bg-[rgba(0,0,0,0.6)]">
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}
