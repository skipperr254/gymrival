import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts } from '@/constants/theme';
import { useTrainStore } from '@/store/useTrainStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { formatRelativeTime } from '@/lib/i18n/format';
import type { GymWithCheckinCount } from '@/types/train';

// ─── Component ───────────────────────────────────────────────────────────────

export function CheckInView() {
  const { t } = useTranslation('train');
  const user = useAuthStore((s) => s.user);
  const friends = useSocialStore((s) => s.friends);

  const {
    gyms,
    activeCheckin,
    weeklyStreak,
    friendsCheckedIn,
    checkinLoading,
    lastCheckinXpAwarded,
    loadCheckinData,
    performCheckin,
    performUndoCheckin,
  } = useTrainStore();

  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  // Load all check-in data on mount, and re-load when friends become available
  useEffect(() => {
    if (!user) return;
    loadCheckinData(user.id, friends.map((f) => f.id));
  }, [user?.id, friends.length, loadCheckinData]); // eslint-disable-line react-hooks/exhaustive-deps

  const streak = weeklyStreak.filter((d) => d.checked).length;
  const pct = (streak / 7) * 100;

  const flameColor =
    streak >= 5 ? Colors.accent : streak >= 3 ? '#ff8c00' : '#444444';
  const streakMotivation =
    streak >= 5 ? t('checkin.machine') : streak >= 3 ? t('checkin.keepItUp') : t('checkin.stayStrong');
  const streakMotivationColor =
    streak >= 5 ? Colors.accent : streak >= 3 ? '#ff8c00' : '#555555';

  const confirmedGym = gyms.find((g) => g.id === activeCheckin?.gym_id);

  const handleConfirm = async () => {
    if (!user || !selectedGymId) return;
    await performCheckin(user.id, selectedGymId);
    setSelectedGymId(null);
  };

  const handleUndo = async () => {
    if (!user) return;
    await performUndoCheckin(user.id);
  };

  return (
    <View>
      {/* ── Streak Card ── */}
      <View style={styles.streakCard}>
        <View style={styles.streakTop}>
          <View>
            <Text style={styles.streakLabel}>{t('checkin.weeklyStreak')}</Text>
            <View style={styles.streakCountRow}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakOf}>{t('checkin.ofSevenDays')}</Text>
            </View>
          </View>
          <View style={styles.flameCol}>
            <Ionicons name="flame" size={36} color={flameColor} />
            <Text style={[styles.flameMotivation, { color: streakMotivationColor }]}>
              {streakMotivation}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>

        <View style={styles.daysRow}>
          {(weeklyStreak.length > 0
            ? weeklyStreak
            : [0, 1, 2, 3, 4, 5, 6].map((i) => ({ day: '', dayIndex: i, checked: false }))
          ).map((d) => (
            <View key={d.dayIndex} style={styles.dayCol}>
              <View style={[styles.dayDot, d.checked && styles.dayDotChecked]}>
                {d.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.dayText, d.checked && styles.dayTextChecked]}>
                {t(`days.short.${d.dayIndex}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Check In Now / Confirmed ── */}
      {checkinLoading && !activeCheckin ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : !activeCheckin ? (
        <View style={styles.checkInCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.cardTitle}>{t('checkin.checkInNow')}</Text>
          </View>

          {gyms.length === 0 && !checkinLoading ? (
            <Text style={styles.emptyText}>{t('checkin.noGyms')}</Text>
          ) : (
            <ScrollView
              style={styles.gymList}
              contentContainerStyle={styles.gymListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {gyms.map((gym: GymWithCheckinCount) => {
                const isSelected = selectedGymId === gym.id;
                return (
                  <Pressable
                    key={gym.id}
                    style={({ pressed }) => [
                      styles.gymRow,
                      isSelected && styles.gymRowSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedGymId(isSelected ? null : gym.id)}
                  >
                    <View style={[styles.gymIcon, isSelected && styles.gymIconSelected]}>
                      <Ionicons
                        name="location"
                        size={18}
                        color={isSelected ? Colors.accent : '#555555'}
                      />
                    </View>
                    <View style={styles.gymInfo}>
                      <Text style={[styles.gymName, isSelected && styles.gymNameSelected]}>
                        {gym.name}
                      </Text>
                      <View style={styles.gymMetaRow}>
                        {gym.city ? (
                          <Text style={styles.gymMetaText}>{gym.city}</Text>
                        ) : null}
                        <View style={styles.gymCheckedInRow}>
                          <Ionicons name="people" size={11} color="#606060" />
                          <Text style={styles.gymMetaText}>
                            {t('checkin.hereToday', { count: gym.today_count })}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={Colors.accent} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              selectedGymId !== null && styles.confirmBtnActive,
              pressed && selectedGymId !== null && { opacity: 0.85 },
            ]}
            onPress={handleConfirm}
            disabled={selectedGymId === null || checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={selectedGymId !== null ? '#fff' : '#444444'}
                />
                <Text
                  style={[
                    styles.confirmBtnText,
                    selectedGymId !== null && styles.confirmBtnTextActive,
                  ]}
                >
                  {t('checkin.confirmCheckIn')}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        /* ── Confirmed State ── */
        <View style={styles.confirmedCard}>
          <View style={styles.confirmedIconWrap}>
            <Ionicons name="checkmark-circle" size={32} color="#4caf50" />
          </View>
          <Text style={styles.confirmedTitle}>{t('checkin.checkedIn')}</Text>
          <Text style={styles.confirmedGym}>
            {confirmedGym?.name ?? t('checkin.yourGym')}
          </Text>
          {lastCheckinXpAwarded && (
            <View style={styles.xpRow}>
              <Ionicons name="flash" size={13} color="#4caf50" />
              <Text style={styles.xpText}>{t('checkin.xpEarned')}</Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
            onPress={handleUndo}
            disabled={checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator size="small" color="#606060" />
            ) : (
              <Text style={styles.undoBtnText}>{t('checkin.undoCheckIn')}</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── Friends Checked In ── */}
      {friendsCheckedIn.length > 0 && (
        <View style={styles.friendsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={15} color={Colors.accent} />
            <Text style={styles.cardTitle}>{t('checkin.friendsCheckedIn')}</Text>
          </View>

          {friendsCheckedIn.map((friend, i) => (
            <View
              key={friend.id}
              style={[styles.friendRow, i > 0 && styles.friendRowDivider]}
            >
              <Avatar
                name={friend.full_name ?? friend.username ?? '?'}
                userId={friend.user_id}
                size="md"
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>
                  {friend.full_name ?? friend.username ?? t('checkin.unknown')}
                </Text>
                <View style={styles.friendMeta}>
                  <Ionicons name="location" size={11} color="#606060" />
                  <Text style={styles.friendMetaText}>{friend.gym_name}</Text>
                </View>
              </View>
              <View style={styles.friendTimeCol}>
                <Ionicons name="time-outline" size={11} color="#505050" />
                <Text style={styles.friendTimeText}>
                  {formatRelativeTime(friend.checked_in_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Streak Card ──
  streakCard: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  streakLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
    letterSpacing: 2,
    marginBottom: 6,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  streakNumber: {
    fontFamily: Fonts.display,
    fontSize: 64,
    lineHeight: 64,
    color: Colors.primary,
    letterSpacing: 2,
  },
  streakOf: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#606060',
    marginBottom: 8,
  },
  flameCol: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  flameMotivation: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotChecked: {
    backgroundColor: Colors.accent,
    borderWidth: 0,
  },
  dayText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555555',
    letterSpacing: 1,
  },
  dayTextChecked: {
    color: Colors.accent,
  },

  // ── Loading ──
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },

  // ── Empty ──
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#606060',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // ── Check In Card ──
  checkInCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 3,
    color: Colors.primary,
  },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.base,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  gymRowSelected: {
    backgroundColor: 'rgba(230,48,48,0.08)',
    borderColor: Colors.accent,
  },
  gymIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gymIconSelected: {
    backgroundColor: 'rgba(230,48,48,0.12)',
    borderColor: 'rgba(230,48,48,0.3)',
  },
  // ── Gym list scroll container ──
  gymList: {
    maxHeight: 232, // shows ~3 full rows + a sliver of a 4th to signal scrollability
  },
  gymListContent: {
    paddingBottom: 2,
  },

  gymInfo: { flex: 1 },
  gymName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#c0c0c0',
    marginBottom: 2,
  },
  gymNameSelected: { color: Colors.primary },
  gymMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gymMetaText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#606060',
  },
  gymCheckedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  confirmBtnActive: {
    backgroundColor: Colors.accent,
    borderWidth: 0,
  },
  confirmBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 3,
    color: '#444444',
  },
  confirmBtnTextActive: { color: Colors.primary },

  // ── Confirmed Card ──
  confirmedCard: {
    backgroundColor: '#0a1f0a',
    borderWidth: 1,
    borderColor: '#1a3a1a',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 14,
    alignItems: 'center',
  },
  confirmedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmedTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 3,
    color: Colors.primary,
    marginBottom: 4,
  },
  confirmedGym: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#707070',
    marginBottom: 4,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  xpText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#4caf50',
    letterSpacing: 1,
  },
  undoBtn: {
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    color: '#606060',
  },

  // ── Friends Card ──
  friendsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
    paddingTop: 13,
    marginTop: 13,
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 2,
  },
  friendMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  friendMetaText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#606060',
  },
  friendTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  friendTimeText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#505050',
    letterSpacing: 1,
  },
});
