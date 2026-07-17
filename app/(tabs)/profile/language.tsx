import { View, Text, Pressable, StyleSheet } from "react-native";
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

  const handleSelect = async (code: LanguageCode) => {
    if (code === i18n.language) return;
    await i18n.changeLanguage(code);
    if (user?.id) {
      await updateLanguage(user.id, code);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
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
              className="card-elevated flex-row items-center justify-between"
              style={isActive ? styles.cardActive : undefined}
              onPress={() => handleSelect(lang.code)}
            >
              <Text className="font-sans-medium text-base text-primary">
                {lang.nativeName}
              </Text>
              {isActive && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderDefault,
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
});
