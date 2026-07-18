import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';

export default function SplashScreen() {
  const { t } = useTranslation('auth');

  return (
    <SafeAreaView className="flex-1 bg-base px-4">
      <View className="flex-1 items-center justify-center">
        <Text className="font-heading text-primary tracking-[6px] text-[80px] leading-[76px]">
          GYM
        </Text>
        <Text className="font-heading text-accent tracking-[6px] text-[80px] leading-[76px]">
          RIVAL
        </Text>
        <Text className="font-sans-medium text-sm text-muted tracking-[1.5px] mt-4">
          {t('splash.tagline')}
        </Text>
      </View>

      <View className="gap-3 pb-6">
        <Pressable
          className="flex-row items-center justify-center gap-2 bg-accent rounded-2xl h-[54px]"
          style={({ pressed }) => pressed && { opacity: 0.85 }}
          onPress={() => router.push(Routes.onboarding)}
        >
          <Text className="font-heading text-base text-primary tracking-[2px]">
            {t('splash.getStarted')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </Pressable>

        <Pressable
          className="items-center py-2"
          style={({ pressed }) => pressed && { opacity: 0.65 }}
          onPress={() => router.push(Routes.signIn)}
        >
          <Text className="font-sans text-sm text-muted">{t('splash.signInPrompt')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
