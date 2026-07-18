import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
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
      <View className="bg-black rounded-[20px] p-5 mb-3.5">
        <View className="flex-row items-start justify-between mb-[18px]">
          <View>
            <Text className="font-heading text-[11px] text-[#606060] tracking-[2px] mb-1.5">
              {t('checkin.weeklyStreak')}
            </Text>
            <View className="flex-row items-end gap-2">
              <Text className="font-heading text-primary tracking-[2px] text-[64px] leading-[64px]">
                {streak}
              </Text>
              <Text className="font-sans text-sm text-[#606060] mb-2">
                {t('checkin.ofSevenDays')}
              </Text>
            </View>
          </View>
          <View className="items-center gap-1.5 pt-1">
            <Ionicons name="flame" size={36} color={flameColor} />
            <Text
              className="font-heading text-[10px] tracking-[2px]"
              style={{ color: streakMotivationColor }}
            >
              {streakMotivation}
            </Text>
          </View>
        </View>

        <View className="h-1 bg-white/[0.08] rounded overflow-hidden mb-4">
          <View className="h-1 bg-accent rounded" style={{ width: `${pct}%` }} />
        </View>

        <View className="flex-row justify-between">
          {(weeklyStreak.length > 0
            ? weeklyStreak
            : [0, 1, 2, 3, 4, 5, 6].map((i) => ({ day: '', dayIndex: i, checked: false }))
          ).map((d) => (
            <View key={d.dayIndex} className="items-center gap-1.5">
              <View
                className={`w-[34px] h-[34px] rounded-full items-center justify-center ${
                  d.checked
                    ? 'bg-accent border-0'
                    : 'bg-white/[0.06] border border-[#2a2a2a]'
                }`}
              >
                {d.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text
                className={`font-heading text-[9px] tracking-[1px] ${
                  d.checked ? 'text-accent' : 'text-[#555555]'
                }`}
              >
                {t(`days.short.${d.dayIndex}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Check In Now / Confirmed ── */}
      {checkinLoading && !activeCheckin ? (
        <View className="bg-surface rounded-[20px] p-8 mb-3.5 items-center justify-center border-[1.5px] border-default">
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : !activeCheckin ? (
        <View className="bg-surface rounded-[20px] py-[18px] px-5 mb-3.5 border-[1.5px] border-default">
          <View className="flex-row items-center gap-2 mb-3.5">
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text className="font-heading text-[13px] tracking-[3px] text-primary">
              {t('checkin.checkInNow')}
            </Text>
          </View>

          {gyms.length === 0 && !checkinLoading ? (
            <Text className="font-sans text-[13px] text-[#606060] text-center py-3">
              {t('checkin.noGyms')}
            </Text>
          ) : (
            <ScrollView
              className="max-h-[232px]"
              contentContainerStyle={styles.gymListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {gyms.map((gym: GymWithCheckinCount) => {
                const isSelected = selectedGymId === gym.id;
                return (
                  <Pressable
                    key={gym.id}
                    className={`flex-row items-center gap-3 py-[13px] px-3.5 rounded-2xl mb-2 border-[1.5px] ${
                      isSelected
                        ? 'bg-[rgba(230,48,48,0.08)] border-accent'
                        : 'bg-base border-default'
                    }`}
                    style={({ pressed }) => pressed && { opacity: 0.8 }}
                    onPress={() => setSelectedGymId(isSelected ? null : gym.id)}
                  >
                    <View
                      className={`w-10 h-10 rounded-xl items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[rgba(230,48,48,0.12)] border-[rgba(230,48,48,0.3)]'
                          : 'bg-surface border-default'
                      }`}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={isSelected ? Colors.accent : '#555555'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-sans-medium text-sm mb-0.5 ${
                          isSelected ? 'text-primary' : 'text-[#c0c0c0]'
                        }`}
                      >
                        {gym.name}
                      </Text>
                      <View className="flex-row items-center gap-3">
                        {gym.city ? (
                          <Text className="font-sans text-[11px] text-[#606060]">{gym.city}</Text>
                        ) : null}
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="people" size={11} color="#606060" />
                          <Text className="font-sans text-[11px] text-[#606060]">
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
            className={`flex-row items-center justify-center gap-2.5 mt-1 py-3.5 rounded-2xl border-[1.5px] ${
              selectedGymId !== null ? 'bg-accent border-0' : 'bg-surface border-default'
            }`}
            style={({ pressed }) => pressed && selectedGymId !== null && { opacity: 0.85 }}
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
                  className={`font-heading text-sm tracking-[3px] ${
                    selectedGymId !== null ? 'text-primary' : 'text-[#444444]'
                  }`}
                >
                  {t('checkin.confirmCheckIn')}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        /* ── Confirmed State ── */
        <View className="bg-[#0a1f0a] border border-[#1a3a1a] rounded-[20px] py-6 px-5 mb-3.5 items-center">
          <View className="w-16 h-16 rounded-full bg-[rgba(76,175,80,0.12)] border border-[rgba(76,175,80,0.3)] items-center justify-center mb-3.5">
            <Ionicons name="checkmark-circle" size={32} color="#4caf50" />
          </View>
          <Text className="font-heading text-[22px] tracking-[3px] text-primary mb-1">
            {t('checkin.checkedIn')}
          </Text>
          <Text className="font-sans text-[13px] text-[#707070] mb-1">
            {confirmedGym?.name ?? t('checkin.yourGym')}
          </Text>
          {lastCheckinXpAwarded && (
            <View className="flex-row items-center gap-1.5 mb-[18px]">
              <Ionicons name="flash" size={13} color="#4caf50" />
              <Text className="font-sans text-[11px] text-[#4caf50] tracking-[1px]">
                {t('checkin.xpEarned')}
              </Text>
            </View>
          )}
          <Pressable
            className="border-[1.5px] border-default rounded-xl py-[9px] px-5 min-w-[80px] items-center justify-center"
            style={({ pressed }) => pressed && { opacity: 0.7 }}
            onPress={handleUndo}
            disabled={checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator size="small" color="#606060" />
            ) : (
              <Text className="font-heading text-[11px] tracking-[2px] text-[#606060]">
                {t('checkin.undoCheckIn')}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── Friends Checked In ── */}
      {friendsCheckedIn.length > 0 && (
        <View className="bg-surface rounded-[20px] py-[18px] px-5 border-[1.5px] border-default">
          <View className="flex-row items-center gap-2 mb-3.5">
            <Ionicons name="people" size={15} color={Colors.accent} />
            <Text className="font-heading text-[13px] tracking-[3px] text-primary">
              {t('checkin.friendsCheckedIn')}
            </Text>
          </View>

          {friendsCheckedIn.map((friend, i) => (
            <View
              key={friend.id}
              className={`flex-row items-center gap-3 ${
                i > 0 ? 'border-t border-default pt-[13px] mt-[13px]' : ''
              }`}
            >
              <Avatar
                name={friend.full_name ?? friend.username ?? '?'}
                userId={friend.user_id}
                size="md"
              />
              <View className="flex-1">
                <Text className="font-sans-medium text-sm text-primary mb-0.5">
                  {friend.full_name ?? friend.username ?? t('checkin.unknown')}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="location" size={11} color="#606060" />
                  <Text className="font-sans text-[11px] text-[#606060]">{friend.gym_name}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={11} color="#505050" />
                <Text className="font-sans text-[10px] text-[#505050] tracking-[1px]">
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
  gymListContent: {
    paddingBottom: 2,
  },
});
