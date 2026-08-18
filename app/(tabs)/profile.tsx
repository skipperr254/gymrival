import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  AlertCircle, RefreshCw, Pencil, Bell, Settings, Zap, CheckCircle,
  Trophy, Users, Flame, Star, MapPin, Dumbbell, Ruler, Flag, Calendar,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar } from '@/components/ui/Avatar';
import { AppHeader } from '@/components/ui';
import {
  DetailRow,
  formatMemberSince,
  computeBarRatios,
} from '@/components/features/profile';
import { getExerciseIcon } from '@/constants/exerciseIcons';

export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'profile']);
  const { user } = useAuthStore();
  const { profile, bestPRs, prCount, loading, error, loadProfile, loadBestPRs, setProStatus } =
    useProfileStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

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

  const handleTogglePro = async () => {
    if (!user?.id || !profile) return;
    await setProStatus(user.id, !profile.is_pro);
  };

  const barRatios = computeBarRatios(bestPRs);
  const memberSince = profile?.created_at
    ? formatMemberSince(profile.created_at)
    : '—';

  const stats: { label: string; value: number; icon: LucideIcon }[] = [
    { label: t('profile:stats.prs'), value: prCount, icon: Trophy },
    { label: t('profile:stats.friends'), value: profile?.friends_count ?? 0, icon: Users },
    { label: t('profile:stats.streak'), value: profile?.streak ?? 0, icon: Flame },
    { label: t('profile:stats.level'), value: profile?.level ?? 1, icon: Star },
  ];

  const headerRight = (
    <>
      <Pressable
        className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center"
        style={({ pressed }) => pressed && { opacity: 0.5 }}
        onPress={() => router.push(Routes.notifications as never)}
      >
        <Bell
          size={18}
          color={unreadCount > 0 ? Colors.accent : '#909090'}
          fill={unreadCount > 0 ? Colors.accent : 'none'}
        />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-accent rounded-full min-w-[16px] h-4 items-center justify-center px-[3px] border-[1.5px] border-base">
            <Text className="font-sans-bold text-[9px] text-white">
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center"
        style={({ pressed }) => pressed && { opacity: 0.5 }}
        onPress={() => router.push(Routes.profileSettings as never)}
      >
        <Settings size={18} color="#909090" />
      </Pressable>
    </>
  );

  // First load: distinguish "still loading" from a fresh account with no
  // data yet — without this, a slow/failed fetch rendered the exact same
  // fallback chain ('Athlete', all-zero stats, every detail "Not set") as a
  // genuinely brand-new profile, with no indication anything was wrong.
  if (loading && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <AppHeader right={headerRight} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        <AppHeader right={headerRight} />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <AlertCircle size={26} color={Colors.accent} />
          <Text className="font-sans text-sm text-muted text-center">
            {t('profile:loadErrorSub')}
          </Text>
          <Pressable
            onPress={() => user?.id && loadProfile(user.id)}
            className="flex-row items-center gap-1.5 mt-1 bg-accent py-2.5 px-5 rounded-[10px]"
          >
            <RefreshCw size={14} color={Colors.primary} />
            <Text className="font-heading text-xs tracking-[2px] text-white">
              {t('profile:retry')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <AppHeader right={headerRight} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
                avatarUrl={profile?.avatar_url}
                size="xl"
              />
              <Pressable
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-accent items-center justify-center border-2 border-[#1a0000]"
                style={({ pressed }) => pressed && { opacity: 0.7 }}
                onPress={() => router.push(Routes.profileEdit as never)}
              >
                <Pencil size={10} color={Colors.primary} />
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
                <s.icon size={14} color={Colors.accent} />
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
              <Zap size={18} color={Colors.primary} />
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
            <CheckCircle size={18} color={Colors.success} />
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
              <Pencil size={11} color={Colors.secondary} />
              <Text className="font-heading text-[11px] text-secondary tracking-[1px]">
                {t('profile:details.edit')}
              </Text>
            </Pressable>
          </View>

          <DetailRow icon={MapPin} label={t('profile:details.gym')} value={profile?.gym ?? t('profile:details.notSet')} isFirst />
          <DetailRow
            icon={Dumbbell}
            label={t('profile:details.weight')}
            value={profile?.weight_kg != null ? `${profile.weight_kg} kg` : t('profile:details.notSet')}
          />
          <DetailRow
            icon={Ruler}
            label={t('profile:details.height')}
            value={profile?.height_cm != null ? `${profile.height_cm} cm` : t('profile:details.notSet')}
          />
          <DetailRow icon={Flag} label={t('profile:details.goal')} value={profile?.goal ?? t('profile:details.notSet')} />
          <DetailRow
            icon={Calendar}
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

            {bestPRs.map((pr, i) => {
              const ExIcon = getExerciseIcon(pr.exercise_key);
              return (
              <View key={pr.id}>
                <View className={`flex-row items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-elevated' : ''}`}>
                  <View className="w-9 h-9 rounded-[10px] bg-[rgba(230,48,48,0.1)] items-center justify-center shrink-0">
                    <ExIcon size={17} color={Colors.accent} />
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 2,
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
