import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
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
  styles,
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appTitle}>{t('profile:header.brand')}</Text>
            <Text style={styles.pageLabel}>{t('profile:header.pageLabel')}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
            onPress={() => router.push(Routes.notifications as never)}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={18}
              color={unreadCount > 0 ? Colors.accent : '#909090'}
            />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
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
          <View style={styles.profileTop}>
            <View style={styles.avatarWrapper}>
              <Avatar
                name={displayName}
                userId={user?.id ?? displayName}
                size="xl"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.avatarEditBadge,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => router.push(Routes.profileEdit as never)}
              >
                <Ionicons name="pencil" size={10} color={Colors.primary} />
              </Pressable>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName.toUpperCase()}
              </Text>
              <Text style={styles.profileUsername}>@{username}</Text>
              {!!profile?.bio && (
                <Text style={styles.profileBio} numberOfLines={2}>
                  {profile.bio}
                </Text>
              )}
            </View>
          </View>

          {/* Motto */}
          {!!profile?.quote && (
            <View style={styles.mottoBox}>
              <Text style={styles.mottoLabel}>{t('profile:details.motto')}</Text>
              <Text style={styles.mottoText}>{`"${profile.quote}"`}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Ionicons name={s.icon} size={14} color={Colors.accent} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
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
              <Text style={styles.upgradeText}>{t('profile:proUpsell')}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.proActiveBtn, pressed && { opacity: 0.82 }]}
            onPress={handleTogglePro}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.proActiveText}>{t('profile:proActive')}</Text>
          </Pressable>
        )}

        {/* ── My Details ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile:details.title')}</Text>
            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.5 }]}
              onPress={() => router.push(Routes.profileEdit as never)}
            >
              <Ionicons name="pencil-outline" size={11} color='#b0b0b0' />
              <Text style={styles.editBtnText}>{t('profile:details.edit')}</Text>
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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('profile:bestPrs')}</Text>
            </View>

            {bestPRs.map((pr, i) => (
              <View key={pr.id}>
                <View style={[styles.prRow, i > 0 && styles.rowBorder]}>
                  <View style={styles.prIconBox}>
                    <Ionicons
                      name={getExerciseIcon(pr.exercise_key)}
                      size={17}
                      color={Colors.accent}
                    />
                  </View>
                  <View style={styles.prContent}>
                    <View style={styles.prTopRow}>
                      <Text style={styles.prName}>{pr.exercise.label}</Text>
                      <View style={styles.prValueGroup}>
                        <Text style={styles.prNum}>{pr.value}</Text>
                        <Text style={styles.prUnit}> {pr.unit}</Text>
                      </View>
                    </View>
                    <View style={styles.prBarTrack}>
                      <LinearGradient
                        colors={[Colors.accent, '#ff6060']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.prBarFill,
                          { width: `${Math.round(barRatios[i] * 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Settings ──────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile:settings.title')}</Text>
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
          style={({ pressed }) => [styles.logOutBtn, pressed && { opacity: 0.6 }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={16} color={Colors.accent} />
          <Text style={styles.logOutText}>{t('profile:logOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
