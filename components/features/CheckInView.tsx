import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Colors, Fonts } from '@/constants/theme';

const NEARBY_GYMS = [
  { id: 1, name: 'Basic-Fit Downtown', distance: '0.3 km', checkedIn: 12 },
  { id: 2, name: 'Olympus Gym', distance: '0.8 km', checkedIn: 5 },
  { id: 3, name: 'Fit For Free', distance: '1.2 km', checkedIn: 8 },
];

const FRIENDS = [
  { id: 1, name: 'Daan', username: '@daanfit', gym: 'Basic-Fit Downtown', time: '10 min' },
  { id: 2, name: 'Sara', username: '@sara_lifts', gym: 'Olympus Gym', time: '1 hr' },
  { id: 3, name: 'Mike', username: '@mike_gains', gym: 'Fit For Free', time: '2 hrs' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CheckInView() {
  const [checkins, setCheckins] = useState(
    DAYS.map((d, i) => ({ day: d, checked: [0, 2, 4, 5].includes(i) }))
  );
  const [selectedGym, setSelectedGym] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const streak = checkins.filter((c) => c.checked).length;
  const pct = (streak / 7) * 100;

  const flameColor =
    streak >= 5 ? Colors.accent : streak >= 3 ? '#ff8c00' : '#444444';
  const streakMotivation =
    streak >= 5 ? 'MACHINE!' : streak >= 3 ? 'KEEP IT UP' : 'STAY STRONG';
  const streakMotivationColor =
    streak >= 5 ? Colors.accent : streak >= 3 ? '#ff8c00' : '#555555';

  const handleConfirm = () => {
    if (selectedGym === null) return;
    setConfirmed(true);
    setCheckins((prev) => {
      const today = new Date().getDay();
      const idx = today === 0 ? 6 : today - 1;
      return prev.map((c, i) => (i === idx ? { ...c, checked: true } : c));
    });
  };

  const handleUndo = () => {
    setConfirmed(false);
    setSelectedGym(null);
  };

  const confirmedGymName = NEARBY_GYMS.find((g) => g.id === selectedGym)?.name ?? '';

  return (
    <View>
      {/* ── Streak Card ── */}
      <View style={styles.streakCard}>
        <View style={styles.streakTop}>
          <View>
            <Text style={styles.streakLabel}>WEEKLY STREAK</Text>
            <View style={styles.streakCountRow}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakOf}>/ 7 days</Text>
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
          {checkins.map((c, i) => (
            <Pressable
              key={i}
              onPress={() =>
                setCheckins((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x))
                )
              }
              style={({ pressed }) => [styles.dayCol, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.dayDot, c.checked && styles.dayDotChecked]}>
                {c.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.dayText, c.checked && styles.dayTextChecked]}>
                {c.day}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Check In Now / Confirmed ── */}
      {!confirmed ? (
        <View style={styles.checkInCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.cardTitle}>CHECK IN NOW</Text>
          </View>

          {NEARBY_GYMS.map((gym) => {
            const isSelected = selectedGym === gym.id;
            return (
              <Pressable
                key={gym.id}
                style={({ pressed }) => [
                  styles.gymRow,
                  isSelected && styles.gymRowSelected,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedGym(isSelected ? null : gym.id)}
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
                    <Text style={styles.gymMetaText}>{gym.distance}</Text>
                    <View style={styles.gymCheckedInRow}>
                      <Ionicons name="people" size={11} color="#606060" />
                      <Text style={styles.gymMetaText}>{`${gym.checkedIn} here now`}</Text>
                    </View>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={Colors.accent} />
                )}
              </Pressable>
            );
          })}

          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              selectedGym !== null && styles.confirmBtnActive,
              pressed && selectedGym !== null && { opacity: 0.85 },
            ]}
            onPress={handleConfirm}
            disabled={selectedGym === null}
          >
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={selectedGym !== null ? '#fff' : '#444444'}
            />
            <Text
              style={[
                styles.confirmBtnText,
                selectedGym !== null && styles.confirmBtnTextActive,
              ]}
            >
              CONFIRM CHECK-IN
            </Text>
          </Pressable>
        </View>
      ) : (
        /* ── Confirmed State ── */
        <View style={styles.confirmedCard}>
          <View style={styles.confirmedIconWrap}>
            <Ionicons name="checkmark-circle" size={32} color="#4caf50" />
          </View>
          <Text style={styles.confirmedTitle}>CHECKED IN!</Text>
          <Text style={styles.confirmedGym}>{confirmedGymName}</Text>
          <View style={styles.xpRow}>
            <Ionicons name="flash" size={13} color="#4caf50" />
            <Text style={styles.xpText}>+25 XP EARNED</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
            onPress={handleUndo}
          >
            <Text style={styles.undoBtnText}>UNDO CHECK-IN</Text>
          </Pressable>
        </View>
      )}

      {/* ── Friends Checked In ── */}
      <View style={styles.friendsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={15} color={Colors.accent} />
          <Text style={styles.cardTitle}>FRIENDS CHECKED IN</Text>
        </View>

        {FRIENDS.map((friend, i) => (
          <View
            key={friend.id}
            style={[styles.friendRow, i > 0 && styles.friendRowDivider]}
          >
            <Avatar name={friend.name} userId={String(friend.id)} size="md" />
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <View style={styles.friendMeta}>
                <Ionicons name="location" size={11} color="#606060" />
                <Text style={styles.friendMetaText}>{friend.gym}</Text>
              </View>
            </View>
            <View style={styles.friendTimeCol}>
              <Ionicons name="time-outline" size={11} color="#505050" />
              <Text style={styles.friendTimeText}>{`${friend.time} ago`}</Text>
            </View>
          </View>
        ))}
      </View>
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
