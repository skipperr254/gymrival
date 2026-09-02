import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
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
    await signOut();
    router.replace(Routes.splash as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('profile:settings.title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View className="bg-surface rounded-[20px] overflow-hidden">
          <SettingsRow
            icon={Languages}
            label={t('common:settings.language')}
            sub={currentLanguageName}
            iconColor="#e6a030"
            onPress={() => router.push(Routes.profileLanguage as never)}
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
            iconColor="#00cc88"
            onPress={() => router.push(Routes.profileChangePassword as never)}
          />
          {/* Dark mode: not built yet — the app is dark-only today (see AGENTS.md
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

        <Pressable
          className="flex-row items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-[#3a1a1a] mt-6"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
          onPress={handleSignOut}
        >
          <LogOut size={16} color={Colors.accent} />
          <Text className="font-heading text-sm text-accent tracking-[3px]">{t('profile:logOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
