import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { LANGUAGES } from '@/lib/i18n/languages';
import {
  DetailRow,
  SettingsRow,
  getExerciseIcon,
  formatMemberSince,
  computeBarRatios,
  type IoniconName,
} from '@/components/features/profile';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation(['common', 'profile']);
  const { user, signOut } = useAuthStore();
  const { profile, bestPRs, prCount, loadProfile, loadBestPRs, setProStatus } =
    useProfileStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const currentLanguageName =
    LANGUAGES.find((l) => l.code === i18n.language)?.nativeName ?? i18n.language;

  const displayName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Athlete';

  const username =
    profile?.username ?? displayName.toLowerCase().replace(/\s+/g, '_');

  useEffect(() => {
    if (!user?.id) return;
    loadProfile(user.id);
    loadBestPRs(user.id);
  }, [user?.id, loadProfile, loadBestPRs]);

  const handleSignOut = async () => {
    await signOut();
    router.replace(Routes.splash as never);
  };

  const handleTogglePro = async () => {
    if (!user?.id || !profile) return;
    await setProStatus(user.id, !profile.is_pro);
  };

  const barRatios = computeBarRatios(bestPRs);
  const memberSince = profile?.created_at
    ? formatMemberSince(profile.created_at)
    : '—';

  const stats = [
    { label: t('profile:stats.prs'), value: prCount, icon: 'trophy-outline' as IoniconName },
    { label: t('profile:stats.friends'), value: profile?.friends_count ?? 0, icon: 'people-outline' as IoniconName },
    { label: t('profile:stats.streak'), value: profile?.streak ?? 0, icon: 'flame-outline' as IoniconName },
    { label: t('profile:stats.level'), value: profile?.level ?? 1, icon: 'star-outline' as IoniconName },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <View className="flex-row items-end justify-between mb-1">
          <View>
            <Text className="font-heading text-primary tracking-[4px] text-[26px] leading-7">
              {t('profile:header.brand')}
            </Text>
            <Text className="font-heading text-[11px] text-[#606060] tracking-[2px] mt-0.5">
              {t('profile:header.pageLabel')}
            </Text>
          </View>
          <Pressable
            className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center"
            style={({ pressed }) => pressed && { opacity: 0.5 }}
            onPress={() => router.push(Routes.notifications as never)}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={18}
              color={unreadCount > 0 ? Colors.accent : '#909090'}
            />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-accent rounded-full min-w-[16px] h-4 items-center justify-center px-[3px] border-[1.5px] border-base">
                <Text className="font-sans-bold text-[9px] text-white">
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Profile Card ──────────────────────────────────── */}
        <LinearGradient
          colors={['#1a0000', '#2a0a0a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          {/* Avatar + name row */}
          <View className="flex-row items-center gap-4 mb-[18px]">
            <View className="relative">
              <Avatar
                name={displayName}
                userId={user?.id ?? displayName}
                size="xl"
              />
              <Pressable
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-accent items-center justify-center border-2 border-[#1a0000]"
                style={({ pressed }) => pressed && { opacity: 0.7 }}
                onPress={() => router.push(Routes.profileEdit as never)}
              >
                <Ionicons name="pencil" size={10} color={Colors.primary} />
              </Pressable>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-heading text-2xl text-primary tracking-[2px]" numberOfLines={1}>
                {displayName.toUpperCase()}
              </Text>
              <Text className="font-sans text-[13px] text-[#909090] mb-1">@{username}</Text>
              {!!profile?.bio && (
                <Text className="font-sans text-[13px] text-secondary italic leading-[18px]" numberOfLines={2}>
                  {profile.bio}
                </Text>
              )}
            </View>
          </View>

          {/* Motto */}
          {!!profile?.quote && (
            <View className="bg-[rgba(230,48,48,0.08)] border border-[rgba(230,48,48,0.2)] rounded-xl px-4 py-3.5 mb-4">
              <Text className="font-heading text-[11px] text-accent tracking-[2px] mb-1.5">
                {t('profile:details.motto')}
              </Text>
              <Text className="font-sans text-sm text-primary italic leading-[22px]">{`"${profile.quote}"`}</Text>
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-2">
            {stats.map((s) => (
              <View key={s.label} className="flex-1 items-center bg-[rgba(0,0,0,0.35)] rounded-xl py-2.5 px-1.5 gap-1">
                <Ionicons name={s.icon} size={14} color={Colors.accent} />
                <Text className="font-heading text-primary tracking-[1px] text-[22px] leading-6">
                  {s.value}
                </Text>
                <Text className="font-sans text-[9px] text-[#606060] tracking-[1px] font-bold">
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Upgrade / Pro status ──────────────────────────── */}
        {!profile?.is_pro ? (
          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.82 }]}
            onPress={handleTogglePro}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.upgradeBtn}
            >
              <Ionicons name="flash" size={18} color={Colors.primary} />
              <Text className="font-heading text-[15px] text-primary tracking-[3px]">
                {t('profile:proUpsell')}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            className="flex-row items-center justify-center gap-2 bg-surface rounded-2xl h-[52px] border border-success"
            style={({ pressed }) => pressed && { opacity: 0.82 }}
            onPress={handleTogglePro}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text className="font-heading text-base text-success tracking-[1.5px]">
              {t('profile:proActive')}
            </Text>
          </Pressable>
        )}

        {/* ── My Details ────────────────────────────────────── */}
        <View className="bg-surface rounded-[20px] overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
            <Text className="font-heading text-[15px] text-primary tracking-[3px]">
              {t('profile:details.title')}
            </Text>
            <Pressable
              className="flex-row items-center gap-1.5 bg-elevated rounded-[10px] px-3.5 py-1.5"
              style={({ pressed }) => pressed && { opacity: 0.5 }}
              onPress={() => router.push(Routes.profileEdit as never)}
            >
              <Ionicons name="pencil-outline" size={11} color='#b0b0b0' />
              <Text className="font-heading text-[11px] text-secondary tracking-[1px]">
                {t('profile:details.edit')}
              </Text>
            </Pressable>
          </View>

          <DetailRow icon="location-outline" label={t('profile:details.gym')} value={profile?.gym ?? t('profile:details.notSet')} isFirst />
          <DetailRow
            icon="barbell-outline"
            label={t('profile:details.weight')}
            value={profile?.weight_kg != null ? `${profile.weight_kg} kg` : t('profile:details.notSet')}
          />
          <DetailRow
            icon="resize-outline"
            label={t('profile:details.height')}
            value={profile?.height_cm != null ? `${profile.height_cm} cm` : t('profile:details.notSet')}
          />
          <DetailRow icon="flag-outline" label={t('profile:details.goal')} value={profile?.goal ?? t('profile:details.notSet')} />
          <DetailRow
            icon="calendar-outline"
            label={t('profile:details.memberSince')}
            value={memberSince}
          />
        </View>

        {/* ── Best PRs ──────────────────────────────────────── */}
        {bestPRs.length > 0 && (
          <View className="bg-surface rounded-[20px] overflow-hidden">
            <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
              <Text className="font-heading text-[15px] text-primary tracking-[3px]">
                {t('profile:bestPrs')}
              </Text>
            </View>

            {bestPRs.map((pr, i) => (
              <View key={pr.id}>
                <View className={`flex-row items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-elevated' : ''}`}>
                  <View className="w-9 h-9 rounded-[10px] bg-[rgba(230,48,48,0.1)] items-center justify-center shrink-0">
                    <Ionicons
                      name={getExerciseIcon(pr.exercise_key)}
                      size={17}
                      color={Colors.accent}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-[5px]">
                      <Text className="font-sans-medium text-[13px] text-secondary">{pr.exercise.label}</Text>
                      <View className="flex-row items-baseline">
                        <Text className="font-heading text-base text-accent tracking-[1px]">{pr.value}</Text>
                        <Text className="font-heading text-[11px] text-[#606060]"> {pr.unit}</Text>
                      </View>
                    </View>
                    <View className="h-[3px] bg-elevated rounded-[3px] overflow-hidden">
                      <LinearGradient
                        colors={[Colors.accent, '#ff6060']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 3, borderRadius: 3, width: `${Math.round(barRatios[i] * 100)}%` }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Settings ──────────────────────────────────────── */}
        <View className="bg-surface rounded-[20px] overflow-hidden">
          <View className="flex-row items-center justify-between px-5 pt-[18px] pb-4">
            <Text className="font-heading text-[15px] text-primary tracking-[3px]">
              {t('profile:settings.title')}
            </Text>
          </View>
          <SettingsRow
            icon="language-outline"
            label={t('settings.language')}
            sub={currentLanguageName}
            iconColor="#e6a030"
            onPress={() => router.push(Routes.profileLanguage as never)}
            isFirst
          />
          <SettingsRow
            icon="notifications-outline"
            label={t('profile:settings.notifications')}
            sub={t('profile:settings.notificationsSub')}
            iconColor="#4a9eff"
            onPress={() => {}}
          />
          <SettingsRow
            icon="lock-closed-outline"
            label={t('profile:settings.privacy')}
            sub={t('profile:settings.privacySub')}
            iconColor="#00cc88"
            onPress={() => {}}
          />
          <SettingsRow
            icon="moon-outline"
            label={t('profile:settings.darkMode')}
            sub={t('profile:settings.darkModeOn')}
            iconColor="#9b7fe8"
            onPress={() => {}}
          />
          <SettingsRow
            icon="share-social-outline"
            label={t('profile:settings.shareProfile')}
            sub={t('profile:settings.shareProfileSub')}
            iconColor="#ffaa00"
            onPress={() => {}}
          />
        </View>

        {/* ── Log Out ───────────────────────────────────────── */}
        <Pressable
          className="flex-row items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-[#3a1a1a] mb-2.5"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.accent} />
          <Text className="font-heading text-sm text-accent tracking-[3px]">{t('profile:logOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
    gap: 14,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    padding: 20,
    paddingTop: 24,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.button,
    height: 52,
  },
});
