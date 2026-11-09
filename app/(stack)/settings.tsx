import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Languages, Bell, KeyRound, Share2, LogOut } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { LANGUAGES } from '@/lib/i18n/languages';
import { SettingsRow, SettingsToggleRow } from '@/components/features/profile';
import { SubscriptionSection } from '@/components/features/paywall';
import { DetailHeader } from '@/components/ui/DetailHeader';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation(['common', 'profile']);
  const { user, signOut } = useAuthStore();
  const { profile, setPushEnabled } = useProfileStore();
  const currentLanguageName =
    LANGUAGES.find((l) => l.code === i18n.language)?.nativeName ?? i18n.language;

  const handleTogglePushEnabled = async (value: boolean) => {
    if (!user?.id) return;
    const { error } = await setPushEnabled(user.id, value);
    if (error) {
      Alert.alert(t('profile:settings.notifications'), error);
    }
  };

  const handleSignOut = async () => {
    // No navigation here: clearing the session makes the root auth gate
    // replace to the splash. Doing it here too animated the splash in twice.
    await signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('profile:settings.title')} />

      <ScrollView contentContainerClassName="px-4 pt-4 pb-10" showsVerticalScrollIndicator={false}>
        <View className="bg-surface rounded-[20px] overflow-hidden">
          <SettingsRow
            icon={Languages}
            label={t('common:settings.language')}
            sub={currentLanguageName}
            iconColor={Colors.amber}
            onPress={() => router.push(Routes.profileLanguage)}
            isFirst
          />
          <SettingsToggleRow
            icon={Bell}
            label={t('profile:settings.notifications')}
            sub={t('profile:settings.notificationsSub')}
            iconColor={Colors.friend}
            value={profile?.push_enabled ?? true}
            onValueChange={handleTogglePushEnabled}
          />
          <SettingsRow
            icon={KeyRound}
            label={t('profile:settings.changePassword')}
            sub={t('profile:settings.changePasswordSub')}
            iconColor={Colors.mint}
            onPress={() => router.push(Routes.profileChangePassword)}
          />
          {/* Dark mode: not built yet — the app is dark-only today (see CLAUDE.md
              design system). Re-add as a SettingsToggleRow once a light theme
              actually exists to switch to. */}
          <SettingsRow
            icon={Share2}
            label={t('profile:settings.shareProfile')}
            sub={t('profile:settings.shareProfileSub')}
            iconColor={Colors.warning}
            onPress={() => {}}
            disabled
            badge={t('profile:settings.shareProfileSub')}
          />
        </View>

        <SubscriptionSection />

        <Pressable
          className="flex-row items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-danger-border mt-6"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
          onPress={handleSignOut}
        >
          <LogOut size={16} color={Colors.accent} />
          <Text className="font-heading text-sm text-accent tracking-[3px]">{t('profile:logOut')}</Text>
        </Pressable>

        <Pressable
          className="items-center py-3 mt-3"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
          onPress={() => router.push(Routes.deleteAccount)}
        >
          <Text className="font-sans text-[13px] text-muted underline">
            {t('profile:deleteAccount.link')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
