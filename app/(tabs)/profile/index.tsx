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
import { Colors, Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Avatar } from '@/components/ui/Avatar';
import type { PersonalRecordWithExercise } from '@/types/pr';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EXERCISE_ICONS: Record<string, IoniconName> = {
  bench_press: 'barbell-outline',
  squat: 'body-outline',
  deadlift: 'fitness-outline',
  pull_ups: 'trending-up-outline',
  overhead_press: 'arrow-up-circle-outline',
  barbell_row: 'swap-vertical-outline',
  dumbbell_curl: 'barbell-outline',
  lat_pulldown: 'arrow-down-circle-outline',
  leg_press: 'walk-outline',
  shoulder_press: 'arrow-up-outline',
  romanian_deadlift: 'accessibility-outline',
  tricep_dips: 'hand-right-outline',
  cable_fly: 'radio-outline',
  plank: 'timer-outline',
  running_1k: 'walk-outline',
  running_5k: 'bicycle-outline',
  cycling_1k: 'bicycle-outline',
};

function getExerciseIcon(key: string): IoniconName {
  return EXERCISE_ICONS[key] ?? 'fitness-outline';
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function computeBarRatios(prs: PersonalRecordWithExercise[]): number[] {
  const maxByUnit: Record<string, number> = {};
  for (const pr of prs) {
    maxByUnit[pr.unit] = Math.max(maxByUnit[pr.unit] ?? 0, pr.value);
  }
  return prs.map((pr) => Math.min(pr.value / (maxByUnit[pr.unit] ?? 1), 1));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
  isFirst = false,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  isFirst?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isFirst && styles.rowBorder]}>
      <View style={styles.detailIconBox}>
        <Ionicons name={icon} size={17} color='#909090' />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  iconColor,
  onPress,
  isFirst = false,
}: {
  icon: IoniconName;
  label: string;
  sub: string;
  iconColor: string;
  onPress: () => void;
  isFirst?: boolean;
}) {
  const iconBg = iconColor + '18';
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        !isFirst && styles.rowBorder,
        pressed && { opacity: 0.65 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.settingsIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsLabel}>{label}</Text>
        <Text style={styles.settingsSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color='#404040' />
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { profile, bestPRs, prCount, loadProfile, loadBestPRs, setProStatus } =
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
    { label: "PR'S", value: prCount, icon: 'trophy-outline' as IoniconName },
    { label: 'FRIENDS', value: profile?.friends_count ?? 0, icon: 'people-outline' as IoniconName },
    { label: 'STREAK', value: profile?.streak ?? 0, icon: 'flame-outline' as IoniconName },
    { label: 'LEVEL', value: profile?.level ?? 1, icon: 'star-outline' as IoniconName },
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
            <Text style={styles.appTitle}>GYM RIVAL</Text>
            <Text style={styles.pageLabel}>PROFILE</Text>
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
              <Text style={styles.mottoLabel}>MOTTO</Text>
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
              <Text style={styles.upgradeText}>
                {'UPGRADE TO PRO — €4.99/MO'}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.proActiveBtn, pressed && { opacity: 0.82 }]}
            onPress={handleTogglePro}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.proActiveText}>PRO MEMBER — TAP TO DISABLE</Text>
          </Pressable>
        )}

        {/* ── My Details ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MY DETAILS</Text>
            <Pressable
              style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.5 }]}
              onPress={() => router.push(Routes.profileEdit as never)}
            >
              <Ionicons name="pencil-outline" size={11} color='#b0b0b0' />
              <Text style={styles.editBtnText}>EDIT</Text>
            </Pressable>
          </View>

          <DetailRow icon="location-outline" label="GYM" value={profile?.gym ?? '—'} isFirst />
          <DetailRow
            icon="barbell-outline"
            label="WEIGHT"
            value={profile?.weight_kg != null ? `${profile.weight_kg} kg` : '—'}
          />
          <DetailRow
            icon="resize-outline"
            label="HEIGHT"
            value={profile?.height_cm != null ? `${profile.height_cm} cm` : '—'}
          />
          <DetailRow icon="flag-outline" label="GOAL" value={profile?.goal ?? '—'} />
          <DetailRow
            icon="calendar-outline"
            label="MEMBER SINCE"
            value={memberSince}
          />
        </View>

        {/* ── Best PRs ──────────────────────────────────────── */}
        {bestPRs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{"BEST PR'S"}</Text>
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
            <Text style={styles.sectionTitle}>SETTINGS</Text>
          </View>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            sub="Push notifications on"
            iconColor="#4a9eff"
            onPress={() => {}}
            isFirst
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Privacy"
            sub="Profile visible to friends"
            iconColor="#00cc88"
            onPress={() => {}}
          />
          <SettingsRow
            icon="moon-outline"
            label="Dark mode"
            sub="On"
            iconColor="#9b7fe8"
            onPress={() => {}}
          />
          <SettingsRow
            icon="share-social-outline"
            label="Share profile"
            sub="Copy your link"
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
          <Text style={styles.logOutText}>LOG OUT</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 100,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  appTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 4,
    lineHeight: 28,
  },
  pageLabel: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs - 1,
    color: '#606060',
    letterSpacing: 2,
    marginTop: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.base,
  },
  bellBadgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: '#fff',
  },

  // Profile card
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    padding: 20,
    paddingTop: 24,
    gap: 0,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a0000',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: FontSizes['2xl'],
    color: Colors.primary,
    letterSpacing: 2,
  },
  profileUsername: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#909090',
    marginBottom: 4,
  },
  profileBio: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Motto
  mottoBox: {
    backgroundColor: 'rgba(230, 48, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 48, 48, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  mottoLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 2,
    marginBottom: 6,
  },
  mottoText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 1,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: '#606060',
    letterSpacing: 1,
    fontWeight: '700',
  },

  // Upgrade / Pro
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.button,
    height: 52,
  },
  upgradeText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.primary,
    letterSpacing: 3,
  },
  proActiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.button,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  proActiveText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.base,
    color: Colors.success,
    letterSpacing: 1.5,
  },

  // Sections
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.primary,
    letterSpacing: 3,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.elevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.secondary,
    letterSpacing: 1,
  },

  // Detail rows (My Details)
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.elevated,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#505050',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // PR rows
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  prIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(230, 48, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prContent: {
    flex: 1,
  },
  prTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  prName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.secondary,
  },
  prValueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prNum: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.accent,
    letterSpacing: 1,
  },
  prUnit: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
  },
  prBarTrack: {
    height: 3,
    backgroundColor: Colors.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prBarFill: {
    height: 3,
    borderRadius: 3,
  },

  // Settings rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    flex: 1,
    gap: 1,
  },
  settingsLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.primary,
  },
  settingsSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#606060',
    marginTop: 1,
  },

  // Log out
  logOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: '#3a1a1a',
    marginBottom: 10,
  },
  logOutText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 3,
  },
});
