import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, ChevronRight, Zap, AlertCircle, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ChallengeMetric } from '@/types/challenge';
import type { FriendProfile } from '@/types/social';
import type { ExerciseType } from '@/types/pr';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { mStyles } from './styles';

// Display text resolved via t() at render time — see labelKey usage below.
const DURATION_OPTIONS = [
  { labelKey: 'modal.durationOptions.3d', days: 3  },
  { labelKey: 'modal.durationOptions.1w', days: 7  },
  { labelKey: 'modal.durationOptions.2w', days: 14 },
  { labelKey: 'modal.durationOptions.1m', days: 30 },
];

const METRIC_OPTIONS: { labelKey: string; value: ChallengeMetric }[] = [
  { labelKey: 'metric.highestPr',    value: 'highest_pr'    },
  { labelKey: 'metric.mostImproved', value: 'most_improved' },
  { labelKey: 'metric.totalVolume',  value: 'total_volume'  },
];

export function CreateChallengeModal({
  visible,
  friends,
  exercises,
  onClose,
  onCreate,
  loading,
  errorMsg,
}: {
  visible: boolean;
  friends: FriendProfile[];
  exercises: ExerciseType[];
  onClose: () => void;
  onCreate: (friendId: string, exerciseKey: string, metric: ChallengeMetric, durationDays: number) => void;
  loading: boolean;
  errorMsg?: string | null;
}) {
  const { t } = useTranslation('compete');
  const [selected, setSelected] = useState<FriendProfile | null>(null);
  const [query,    setQuery]    = useState('');
  const [exercise, setExercise] = useState(exercises[0]?.key ?? 'bench');
  const [metric,   setMetric]   = useState<ChallengeMetric>('highest_pr');
  const [duration, setDuration] = useState(7);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setQuery('');
    setExercise(exercises[0]?.key ?? 'bench');
    setMetric('highest_pr');
    setDuration(7);
  }, [visible, exercises]);

  const filtered = query.trim()
    ? friends.filter(f => {
        const q = query.toLowerCase();
        return f.full_name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q);
      })
    : friends;

  const canSend = !!selected && !loading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>{t('modal.title')}</Text>
            <Pressable onPress={onClose} style={mStyles.closeBtn}>
              <X size={18} strokeWidth={2} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Friend picker ────────────────────────────── */}
            <Text style={mStyles.label}>{t('modal.challengeLabel')}</Text>

            {selected ? (
              <View style={mStyles.selectedRow}>
                <LeaderboardAvatar
                  id={selected.id}
                  name={selected.full_name ?? selected.username ?? '?'}
                  size={34}
                />
                <Text style={mStyles.selectedName} numberOfLines={1}>
                  {selected.full_name ?? selected.username}
                </Text>
                <Pressable onPress={() => setSelected(null)} style={mStyles.changeBtn}>
                  <Text style={mStyles.changeBtnText}>{t('modal.change')}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={mStyles.searchWrap}>
                  <Search size={14} strokeWidth={1.8} color="#555" style={mStyles.searchIcon} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('modal.searchFriendsPlaceholder')}
                    placeholderTextColor="#555"
                    style={mStyles.searchInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {friends.length === 0 ? (
                  <Text style={mStyles.noFriendsText}>{t('modal.noFriends')}</Text>
                ) : filtered.length === 0 ? (
                  <Text style={mStyles.noFriendsText}>{t('modal.noMatchingFriends')}</Text>
                ) : (
                  <View style={mStyles.friendList}>
                    {filtered.map((f, i) => {
                      const name = f.full_name ?? f.username ?? t('modal.friend');
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => setSelected(f)}
                          style={({ pressed }) => [
                            mStyles.friendItem,
                            i > 0 && mStyles.friendItemBorder,
                            pressed && { backgroundColor: '#2a2a2a' },
                          ]}
                        >
                          <LeaderboardAvatar id={f.id} name={name} size={34} />
                          <View style={{ flex: 1 }}>
                            <Text style={mStyles.friendItemName} numberOfLines={1}>{name}</Text>
                            {!!f.username && (
                              <Text style={mStyles.friendItemUsername}>{'@'}{f.username}</Text>
                            )}
                          </View>
                          <ChevronRight size={14} strokeWidth={1.8} color="#555" />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <View style={{ height: 20 }} />

            {/* ── Exercise ─────────────────────────────────── */}
            <Text style={mStyles.label}>{t('modal.exercise')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 4 }}>
                {exercises.map(ex => (
                  <Pressable
                    key={ex.key}
                    onPress={() => setExercise(ex.key)}
                    style={[mStyles.chip, exercise === ex.key && mStyles.chipActive]}
                  >
                    <Text style={[mStyles.chipLabel, exercise === ex.key && mStyles.chipLabelActive]}>
                      {ex.label.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* ── Metric ───────────────────────────────────── */}
            <Text style={mStyles.label}>{t('modal.metric')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {METRIC_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => setMetric(opt.value)}
                  style={[mStyles.chip, { flex: 1 }, metric === opt.value && mStyles.chipActive]}
                >
                  <Text style={[mStyles.chipLabel, metric === opt.value && mStyles.chipLabelActive]}>
                    {t(opt.labelKey).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Duration ─────────────────────────────────── */}
            <Text style={mStyles.label}>{t('modal.duration')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
              {DURATION_OPTIONS.map(opt => (
                <Pressable
                  key={opt.days}
                  onPress={() => setDuration(opt.days)}
                  style={[mStyles.chip, { flex: 1 }, duration === opt.days && mStyles.chipActive]}
                >
                  <Text style={[mStyles.chipLabel, duration === opt.days && mStyles.chipLabelActive]}>
                    {t(opt.labelKey).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Error ────────────────────────────────────── */}
            {!!errorMsg && (
              <View style={mStyles.errorRow}>
                <AlertCircle size={14} strokeWidth={1.8} color={Colors.accent} />
                <Text style={mStyles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* ── Send ─────────────────────────────────────── */}
            <Pressable
              onPress={() => { if (canSend) onCreate(selected!.id, exercise, metric, duration); }}
              disabled={!canSend}
              style={[{ borderRadius: 14, overflow: 'hidden' }, !canSend && { opacity: 0.35 }]}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={mStyles.sendBtn}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Zap size={16} strokeWidth={2} color="#fff" /><Text style={mStyles.sendBtnText}>{t('modal.sendChallenge')}</Text></>
                }
              </LinearGradient>
            </Pressable>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
