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
      <View className="flex-1 bg-black/75 justify-end">
        <View className="bg-[#1e1e1e] rounded-t-3xl p-6 pb-10 max-h-[92%]">
          <View className="flex-row items-center mb-6">
            <Text className="font-heading text-xl tracking-[3px] text-white flex-1">
              {t('modal.title')}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={18} strokeWidth={2} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Friend picker ────────────────────────────── */}
            <Text className="font-heading text-[10px] tracking-[3px] text-[#555] mb-2.5">
              {t('modal.challengeLabel')}
            </Text>

            {selected ? (
              <View className="flex-row items-center gap-3 bg-[#252525] rounded-xl p-3 border border-[#2a2a2a] mb-1">
                <LeaderboardAvatar
                  id={selected.id}
                  name={selected.full_name ?? selected.username ?? '?'}
                  size={34}
                />
                <Text className="flex-1 font-sans-medium text-sm text-white" numberOfLines={1}>
                  {selected.full_name ?? selected.username}
                </Text>
                <Pressable
                  onPress={() => setSelected(null)}
                  className="py-[5px] px-2.5 rounded-lg border border-[#383838]"
                >
                  <Text className="font-heading text-[9px] tracking-[1px] text-[#888]">
                    {t('modal.change')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View className="mb-2.5 justify-center">
                  <Search
                    size={14}
                    strokeWidth={1.8}
                    color="#555"
                    style={{ position: 'absolute', left: 12, zIndex: 1 }}
                  />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('modal.searchFriendsPlaceholder')}
                    placeholderTextColor="#555"
                    className="bg-[#252525] rounded-xl border border-[#333] py-2.5 pl-9 pr-3.5 font-sans text-[13px] text-white"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {friends.length === 0 ? (
                  <Text className="font-sans text-[13px] text-[#555] text-center py-4">
                    {t('modal.noFriends')}
                  </Text>
                ) : filtered.length === 0 ? (
                  <Text className="font-sans text-[13px] text-[#555] text-center py-4">
                    {t('modal.noMatchingFriends')}
                  </Text>
                ) : (
                  <View className="rounded-xl border border-[#2a2a2a] overflow-hidden mb-1">
                    {filtered.map((f, i) => {
                      const name = f.full_name ?? f.username ?? t('modal.friend');
                      return (
                        <Pressable
                          key={f.id}
                          onPress={() => setSelected(f)}
                          className={`flex-row items-center gap-3 py-3 px-3 bg-[#252525] ${
                            i > 0 ? 'border-t border-[#2a2a2a]' : ''
                          }`}
                          style={({ pressed }) => pressed && { backgroundColor: '#2a2a2a' }}
                        >
                          <LeaderboardAvatar id={f.id} name={name} size={34} />
                          <View className="flex-1">
                            <Text className="font-sans-medium text-[13px] text-white" numberOfLines={1}>
                              {name}
                            </Text>
                            {!!f.username && (
                              <Text className="font-sans text-[11px] text-[#555]">{'@'}{f.username}</Text>
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
            <Text className="font-heading text-[10px] tracking-[3px] text-[#555] mb-2.5">
              {t('modal.exercise')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-1.5 pb-1">
                {exercises.map(ex => (
                  <Pressable
                    key={ex.key}
                    onPress={() => setExercise(ex.key)}
                    className={`py-2 px-3 rounded-[10px] border-[1.5px] items-center justify-center ${
                      exercise === ex.key
                        ? 'border-accent bg-[rgba(230,48,48,0.1)]'
                        : 'border-[#2a2a2a] bg-transparent'
                    }`}
                  >
                    <Text
                      className={`font-heading text-[10px] tracking-[1px] ${
                        exercise === ex.key ? 'text-accent' : 'text-[#555]'
                      }`}
                    >
                      {ex.label.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* ── Metric ───────────────────────────────────── */}
            <Text className="font-heading text-[10px] tracking-[3px] text-[#555] mb-2.5">
              {t('modal.metric')}
            </Text>
            <View className="flex-row gap-2 mb-4">
              {METRIC_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => setMetric(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-[10px] border-[1.5px] items-center justify-center ${
                    metric === opt.value
                      ? 'border-accent bg-[rgba(230,48,48,0.1)]'
                      : 'border-[#2a2a2a] bg-transparent'
                  }`}
                >
                  <Text
                    className={`font-heading text-[10px] tracking-[1px] ${
                      metric === opt.value ? 'text-accent' : 'text-[#555]'
                    }`}
                  >
                    {t(opt.labelKey).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Duration ─────────────────────────────────── */}
            <Text className="font-heading text-[10px] tracking-[3px] text-[#555] mb-2.5">
              {t('modal.duration')}
            </Text>
            <View className="flex-row gap-2 mb-7">
              {DURATION_OPTIONS.map(opt => (
                <Pressable
                  key={opt.days}
                  onPress={() => setDuration(opt.days)}
                  className={`flex-1 py-2 px-3 rounded-[10px] border-[1.5px] items-center justify-center ${
                    duration === opt.days
                      ? 'border-accent bg-[rgba(230,48,48,0.1)]'
                      : 'border-[#2a2a2a] bg-transparent'
                  }`}
                >
                  <Text
                    className={`font-heading text-[10px] tracking-[1px] ${
                      duration === opt.days ? 'text-accent' : 'text-[#555]'
                    }`}
                  >
                    {t(opt.labelKey).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* ── Error ────────────────────────────────────── */}
            {!!errorMsg && (
              <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.08)] rounded-[10px] border border-[rgba(230,48,48,0.2)] p-3 mb-3">
                <AlertCircle size={14} strokeWidth={1.8} color={Colors.accent} />
                <Text className="flex-1 font-sans text-xs text-accent leading-[18px]">{errorMsg}</Text>
              </View>
            )}

            {/* ── Send ─────────────────────────────────────── */}
            <Pressable
              onPress={() => { if (canSend) onCreate(selected!.id, exercise, metric, duration); }}
              disabled={!canSend}
              className={`rounded-2xl overflow-hidden ${!canSend ? 'opacity-35' : ''}`}
            >
              <LinearGradient
                colors={[Colors.accent, Colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 14,
                }}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Zap size={16} strokeWidth={2} color="#fff" /><Text className="font-heading text-sm tracking-[3px] text-white">{t('modal.sendChallenge')}</Text></>
                }
              </LinearGradient>
            </Pressable>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
