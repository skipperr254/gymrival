import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { Routes } from '@/constants/routes';

export default function SplashScreen() {
  const { t } = useTranslation('auth');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.logo}>GYM</Text>
        <Text style={styles.logoAccent}>RIVAL</Text>
        <Text style={styles.tagline}>{t('splash.tagline')}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push(Routes.onboarding)}
        >
          <Text style={styles.primaryBtnText}>{t('splash.getStarted')}</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.65 }]}
          onPress={() => router.push(Routes.signIn)}
        >
          <Text style={styles.secondaryBtnText}>{t('splash.signInPrompt')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
    paddingHorizontal: Spacing.screenPadding,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 80,
    color: Colors.primary,
    letterSpacing: 6,
    lineHeight: 76,
  },
  logoAccent: {
    fontFamily: Fonts.display,
    fontSize: 80,
    color: Colors.accent,
    letterSpacing: 6,
    lineHeight: 76,
  },
  tagline: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    letterSpacing: 1.5,
    marginTop: 16,
  },
  footer: {
    gap: 12,
    paddingBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.button,
    height: 54,
  },
  primaryBtnText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.base,
    color: Colors.primary,
    letterSpacing: 2,
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.muted,
  },
});
