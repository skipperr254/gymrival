import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Medal,
  Zap,
  Flag,
  Dumbbell,
  Activity,
  Target,
  TrendingUp,
  Trophy,
  Search,
  CheckCircle,
  ChevronRight,
  Clock,
  Gift,
  Swords,
  Users,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { useSocialStore } from '@/store/useSocialStore';
import { formatNumber } from '@/lib/i18n/format';
import type { GlobalLeaderboardEntry } from '@/types/compete';
import type { ChallengeWithStats, ChallengeMetric } from '@/types/challenge';
import { endsInLabel, formatChallengeScore, metricLabel } from '@/types/challenge';
import type { FriendProfile } from '@/types/social';

/** Converts an ISO 3166-1 alpha-2 code (e.g. 'NL') to its Unicode flag emoji. */
function toFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6 - 65; // 🇦 = 0x1F1E6, 'A' = 65
  return String.fromCodePoint(
    code.toUpperCase().charCodeAt(0) + base,
    code.toUpperCase().charCodeAt(1) + base,
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

// Display text resolved via t('tabs.<key>.label'/'subtitle') at render time.
const TABS = [
  { key: 'rivals',     labelKey: 'tabs.rivals.label',     Icon: Medal, subtitleKey: 'tabs.rivals.subtitle' },
  { key: 'challenges', labelKey: 'tabs.challenges.label', Icon: Zap,   subtitleKey: 'tabs.challenges.subtitle' },
  { key: 'global',     labelKey: 'tabs.global.label',     Icon: Flag,  subtitleKey: 'tabs.global.subtitle' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ─── Palette ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];
const MEDAL_COLORS   = ['#d4a017', '#909090', '#a0522d'];

// ─── Leaderboard Avatar ───────────────────────────────────────────────────────

function avatarColorIndex(id: string | number): number {
  if (typeof id === 'number') return Math.abs(id);
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function LeaderboardAvatar({ id, name, size = 42 }: { id: string | number; name: string; size?: number }) {
  const { t } = useTranslation('compete');
  const color    = AVATAR_PALETTE[avatarColorIndex(id) % AVATAR_PALETTE.length];
  const initials = name === 'You' ? t('you') : name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.3);

  return (
    <LinearGradient
      colors={[color, '#1a1a1a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color + '55',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ fontFamily: Fonts.display, fontSize, color: '#fff', letterSpacing: 1 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

// ─── Rivals Content ───────────────────────────────────────────────────────────

function RivalsContent() {
  const { t } = useTranslation('compete');
  const { user } = useAuthStore();
  const {
    exercises,
    selectedExercise,
    rivals,
    loadingExercises,
    loadingRivals,
    loadExercises,
    loadRivals,
    setSelectedExercise,
  } = useCompeteStore();

  useEffect(() => {
    if (!user?.id) return;
    loadExercises();
    loadRivals(user.id);
  }, [user?.id, loadExercises, loadRivals]);

  const maxPR = rivals[0]?.bestPR ?? 1;
  const selectedEx = exercises.find(e => e.key === selectedExercise);
  const isLoading = loadingExercises || loadingRivals;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {exercises.map(exercise => {
          const active = selectedExercise === exercise.key;
          return (
            <Pressable
              key={exercise.key}
              onPress={() => user?.id && setSelectedExercise(exercise.key, user.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Dumbbell size={12} strokeWidth={2} color={active ? '#000' : '#555'} />
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {exercise.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 16 }} />

      {isLoading && (
        <View style={rivalsStyles.loadingBox}>
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      )}

      {!isLoading && rivals.length === 0 && (
        <View style={rivalsStyles.emptyBox}>
          <Trophy size={32} strokeWidth={1.4} color="#333" />
          <Text style={rivalsStyles.emptyTitle}>{t('rivals.emptyTitle')}</Text>
          <Text style={rivalsStyles.emptySub}>{t('rivals.emptySub')}</Text>
        </View>
      )}

      {!isLoading && rivals.map((rival, index) => {
        const isFirst = index === 0;
        const prColor = isFirst ? (rival.isMe ? '#000' : Colors.accent) : rival.isMe ? '#333' : '#fff';
        const pct = `${Math.round((rival.bestPR / maxPR) * 100)}%` as `${number}%`;
        const displayName = rival.fullName || rival.username || t('unknown');

        return (
          <View
            key={rival.userId}
            style={[styles.row, rival.isMe ? styles.rowMe : styles.rowOther]}
          >
            <View style={styles.rankBox}>
              {index < 3 ? (
                <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[index]} />
              ) : (
                <Text style={styles.rankNum}>#{index + 1}</Text>
              )}
            </View>
            <LeaderboardAvatar id={rival.userId} name={displayName} size={42} />
            <View style={styles.rowCenter}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, rival.isMe && styles.userNameMe]}>
                  {displayName.toUpperCase()}
                </Text>
                {rival.isMe && <Text style={styles.youTag}>{t('you')}</Text>}
              </View>
              <View style={[styles.barTrack, rival.isMe && styles.barTrackMe]}>
                {rival.isMe ? (
                  <View style={[styles.barFillMe, { width: pct }]} />
                ) : (
                  <LinearGradient
                    colors={['#e63030', '#ff6b6b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFillOther, { width: pct }]}
                  />
                )}
              </View>
            </View>
            <View style={styles.prBox}>
              <Text style={[styles.prValue, { color: prColor }]}>{rival.bestPR}</Text>
              <Text style={[styles.prUnit, rival.isMe && styles.prUnitMe]}>
                {(selectedEx?.unit ?? rival.unit).toUpperCase()}
              </Text>
            </View>
          </View>
        );
      })}

      {!isLoading && rivals.length > 0 && (
        <Text style={styles.footerNote}>{t('rivals.footerNote')}</Text>
      )}
    </>
  );
}

const rivalsStyles = StyleSheet.create({
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
});

// ─── Challenge Card ───────────────────────────────────────────────────────────

const CHALLENGE_COLOR = '#e63030';

function ChallengeCard({
  ch,
  topEntries,
  unit,
  onJoin,
  onLeave,
  joining,
}: {
  ch: ChallengeWithStats;
  topEntries: { user_id: string; full_name: string | null; username: string | null; score: number; is_me: boolean }[];
  unit: string;
  onJoin: () => void;
  onLeave: () => void;
  joining: boolean;
}) {
  const { t } = useTranslation('compete');
  const isFriend = ch.type === 'friend';
  const color    = isFriend ? '#4a9eff' : CHALLENGE_COLOR;
  const MetricIcon = ch.metric === 'most_improved' ? TrendingUp
    : ch.metric === 'total_volume' ? Activity
    : Dumbbell;

  return (
    <View style={[cStyles.card, { borderColor: color + '22' }]}>
      <View style={cStyles.cardHeader}>
        <View style={[cStyles.iconBox, { backgroundColor: color + '15', borderColor: color + '33' }]}>
          <MetricIcon size={22} strokeWidth={1.5} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cStyles.cardTitle}>{ch.title}</Text>
          <Text style={cStyles.cardDesc}>{ch.description ?? metricLabel(ch.metric)}</Text>
        </View>
      </View>

      <View style={cStyles.statsRow}>
        <View style={cStyles.statItem}>
          <Clock size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{endsInLabel(ch.ends_at)}</Text>
        </View>
        <View style={cStyles.statItem}>
          <Users size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{t('card.joined', { count: ch.participant_count })}</Text>
        </View>
        {!!ch.prize_label && (
          <View style={cStyles.statItem}>
            <Gift size={12} strokeWidth={1.8} color="#555" />
            <Text style={cStyles.statText}>{ch.prize_label}</Text>
          </View>
        )}
      </View>

      {topEntries.slice(0, 3).map((p, i) => {
        const displayName = p.full_name ?? p.username ?? t('unknown');
        return (
          <View key={p.user_id} style={cStyles.miniRow}>
            <View style={cStyles.miniMedal}>
              <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[i]} />
            </View>
            <LeaderboardAvatar id={p.user_id} name={displayName} size={26} />
            <Text style={[cStyles.miniName, p.is_me && { color, fontFamily: Fonts.bodyMedium }]}>
              {displayName}{p.is_me ? t('youSuffix') : ''}
            </Text>
            <Text style={[cStyles.miniVal, p.is_me && { color }]}>
              {formatChallengeScore(p.score, ch.metric, unit)}{' '}
              <Text style={cStyles.miniUnit}>{unit.toUpperCase()}</Text>
            </Text>
          </View>
        );
      })}

      {ch.is_joined && ch.user_rank != null && (
        <View style={[cStyles.statItem, { marginTop: 10, marginBottom: 2 }]}>
          <Trophy size={12} strokeWidth={1.8} color={color} />
          <Text style={[cStyles.statText, { color }]}>
            {t('card.yourRank', { rank: ch.user_rank })}
            {ch.user_score != null ? `  ·  ${formatChallengeScore(ch.user_score, ch.metric, unit)}` : ''}
          </Text>
        </View>
      )}

      <View style={cStyles.btnRow}>
        <Pressable onPress={ch.is_joined ? onLeave : onJoin} style={{ flex: 1 }} disabled={joining}>
          {ch.is_joined ? (
            <View style={cStyles.btnJoinedInactive}>
              <CheckCircle size={13} strokeWidth={2} color="#555" />
              <Text style={cStyles.btnJoinedText}>{t('card.joinedBtn')}</Text>
            </View>
          ) : joining ? (
            <View style={cStyles.btnJoinedInactive}>
              <ActivityIndicator size="small" color="#555" />
            </View>
          ) : (
            <LinearGradient
              colors={[color, color + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cStyles.btnJoin}
            >
              <Zap size={13} strokeWidth={2} color="#fff" />
              <Text style={cStyles.btnJoinText}>{t('card.joinBtn')}</Text>
            </LinearGradient>
          )}
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(tabs)/compete/challenge/${ch.id}` as any)}
          style={[cStyles.btnViewAll, { borderColor: color + '44' }]}
        >
          <Text style={[cStyles.btnViewAllText, { color }]}>{t('card.viewAll')}</Text>
          <ChevronRight size={13} strokeWidth={2} color={color} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Invitation Card ──────────────────────────────────────────────────────────

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  loading,
}: {
  invitation: import('@/types/challenge').ChallengeInvitation;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation('compete');
  const ch       = invitation.challenge;
  const inviter  = invitation.inviter;
  const title    = ch?.title ?? t('invitation.defaultTitle');
  const name     = inviter?.full_name ?? inviter?.username ?? t('invitation.someone');

  return (
    <View style={[cStyles.card, { borderColor: '#4a9eff33' }]}>
      <View style={cStyles.cardHeader}>
        <View style={[cStyles.iconBox, { backgroundColor: '#4a9eff15', borderColor: '#4a9eff33' }]}>
          <Swords size={20} strokeWidth={1.6} color="#4a9eff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cStyles.cardTitle}>{title}</Text>
          <Text style={cStyles.cardDesc}>
            {t('invitation.challengedYou', { name })}
            {ch?.ends_at ? `  ·  ${endsInLabel(ch.ends_at)}` : ''}
          </Text>
        </View>
      </View>
      {!!ch?.prize_label && (
        <View style={[cStyles.statItem, { marginBottom: 12 }]}>
          <Gift size={12} strokeWidth={1.8} color="#4a9eff" />
          <Text style={[cStyles.statText, { color: '#4a9eff' }]}>{ch.prize_label}</Text>
        </View>
      )}
      <View style={cStyles.btnRow}>
        <Pressable
          onPress={onAccept}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={['#4a9eff', '#4a9eff99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cStyles.btnJoin}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <><CheckCircle size={13} strokeWidth={2} color="#fff" /><Text style={cStyles.btnJoinText}>{t('invitation.accept')}</Text></>
            }
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          style={[cStyles.btnViewAll, { borderColor: '#2a2a2a', flex: 1 }]}
        >
          <X size={13} strokeWidth={2} color="#555" />
          <Text style={[cStyles.btnViewAllText, { color: '#555' }]}>{t('invitation.decline')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Create Friend Challenge Modal ────────────────────────────────────────────

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

function CreateChallengeModal({
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
  exercises: import('@/types/pr').ExerciseType[];
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

// ─── Challenges Content ───────────────────────────────────────────────────────

function ChallengesContent({ onDetailChange }: { onDetailChange?: () => void }) {
  const { t } = useTranslation('compete');
  const { user }    = useAuthStore();
  const {
    challenges,
    loadingChallenges,
    challengesError,
    leaderboards,
    pendingInvitations,
    loadingInvitations,
    exercises,
    loadChallenges,
    loadLeaderboard,
    joinChallenge,
    leaveChallenge,
    loadPendingInvitations,
    respondToInvitation,
    createFriendChallenge,
    loadExercises,
  } = useCompeteStore();

  const { friends, loadFriends } = useSocialStore();

  const [joiningId,    setJoiningId]    = useState<string | null>(null);
  const [invLoading,   setInvLoading]   = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadChallenges(user.id);
    loadPendingInvitations(user.id);
    loadFriends(user.id);
    loadExercises();
  }, [user?.id, loadChallenges, loadPendingInvitations, loadFriends, loadExercises]);

  useEffect(() => {
    if (!user?.id || challenges.length === 0) return;
    challenges.forEach(ch => {
      if (!leaderboards[ch.id]) loadLeaderboard(ch.id, user.id!);
    });
  }, [challenges, leaderboards, loadLeaderboard, user?.id]);

  const handleJoin = async (challengeId: string) => {
    if (!user?.id) return;
    setJoiningId(challengeId);
    await joinChallenge(challengeId, user.id);
    setJoiningId(null);
    onDetailChange?.();
  };

  const handleLeave = async (challengeId: string) => {
    if (!user?.id) return;
    await leaveChallenge(challengeId, user.id);
    onDetailChange?.();
  };

  const handleInvitation = async (
    invId: string, chalId: string, response: 'accepted' | 'declined',
  ) => {
    if (!user?.id) return;
    setInvLoading(invId);
    await respondToInvitation(invId, chalId, user.id, response);
    setInvLoading(null);
    onDetailChange?.();
  };

  const handleCreate = async (friendId: string, exerciseKey: string, metric: ChallengeMetric, durationDays: number) => {
    if (!user?.id) return;
    setCreating(true);
    setCreateError(null);
    const endsAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();
    const ex = exercises.find(e => e.key === exerciseKey);
    const { error } = await createFriendChallenge(user.id, {
      metric,
      exercise_key: exerciseKey,
      title:        `${ex?.label ?? exerciseKey} — ${metricLabel(metric)}`,
      ends_at:      endsAt,
      invitee_id:   friendId,
    });
    setCreating(false);
    if (!error) {
      setShowModal(false);
    } else {
      console.error('[createFriendChallenge]', error);
      setCreateError(error);
    }
  };

  const adminChallenges  = challenges.filter(c => c.type === 'admin');
  const friendChallenges = challenges.filter(c => c.type === 'friend');

  if (loadingChallenges && challenges.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (challengesError && challenges.length === 0) {
    return (
      <View style={[gStyles.errorCard, { marginTop: 24 }]}>
        <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
        <Text style={gStyles.errorText}>{t('challenges.loadError')}</Text>
        <Pressable
          onPress={() => user?.id && loadChallenges(user.id)}
          style={gStyles.retryBtn}
        >
          <RefreshCw size={13} strokeWidth={2} color="#fff" />
          <Text style={gStyles.retryText}>{t('challenges.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={{ height: 16 }} />

      {/* ── Pending Invitations ─────────────────────────────────────── */}
      {(pendingInvitations.length > 0 || loadingInvitations) && (
        <>
          <Text style={cStyles.sectionLabel}>{t('challenges.pendingInvitations')}</Text>
          {loadingInvitations ? (
            <ActivityIndicator color={Colors.accent} style={{ marginBottom: 16 }} />
          ) : (
            pendingInvitations.map(inv => (
              <InvitationCard
                key={inv.id}
                invitation={inv}
                onAccept={() => handleInvitation(inv.id, inv.challenge_id, 'accepted')}
                onDecline={() => handleInvitation(inv.id, inv.challenge_id, 'declined')}
                loading={invLoading === inv.id}
              />
            ))
          )}
        </>
      )}

      {/* ── Admin / Global Challenges ───────────────────────────────── */}
      {adminChallenges.length > 0 && (
        <>
          <Text style={cStyles.sectionLabel}>{t('challenges.activeChallenges')}</Text>
          {adminChallenges.map(ch => (
            <ChallengeCard
              key={ch.id}
              ch={ch}
              topEntries={leaderboards[ch.id] ?? []}
              unit={exercises.find(e => e.key === ch.exercise_key)?.unit ?? 'kg'}
              onJoin={() => handleJoin(ch.id)}
              onLeave={() => handleLeave(ch.id)}
              joining={joiningId === ch.id}
            />
          ))}
        </>
      )}

      {/* ── Friend Challenges ───────────────────────────────────────── */}
      {friendChallenges.length > 0 && (
        <>
          <Text style={cStyles.sectionLabel}>{t('challenges.friendChallenges')}</Text>
          {friendChallenges.map(ch => (
            <ChallengeCard
              key={ch.id}
              ch={ch}
              topEntries={leaderboards[ch.id] ?? []}
              unit={exercises.find(e => e.key === ch.exercise_key)?.unit ?? 'kg'}
              onJoin={() => handleJoin(ch.id)}
              onLeave={() => handleLeave(ch.id)}
              joining={joiningId === ch.id}
            />
          ))}
        </>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loadingChallenges && challenges.length === 0 && (
        <View style={[gStyles.emptyCard, { marginTop: 0 }]}>
          <Zap size={32} strokeWidth={1.4} color="#333" />
          <Text style={gStyles.emptyTitle}>{t('challenges.emptyTitle')}</Text>
          <Text style={gStyles.emptySub}>{t('challenges.emptySub')}</Text>
        </View>
      )}

      {/* ── Challenge a Friend ──────────────────────────────────────── */}
      <View style={[cStyles.card, { borderColor: '#2a2a2a', marginTop: 4 }]}>
        <View style={cStyles.friendHeader}>
          <Swords size={17} strokeWidth={1.6} color={Colors.accent} />
          <Text style={cStyles.friendTitle}>{t('challenges.challengeFriendTitle')}</Text>
        </View>
        <Text style={cStyles.friendSubtitle}>{t('challenges.challengeFriendSub')}</Text>

        {friends.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {friends.slice(0, 6).map(f => (
              <LeaderboardAvatar
                key={f.id}
                id={f.id}
                name={f.full_name ?? f.username ?? '?'}
                size={36}
              />
            ))}
            {friends.length > 6 && (
              <View style={cStyles.moreCount}>
                <Text style={cStyles.moreCountText}>{t('challenges.moreCount', { count: friends.length - 6 })}</Text>
              </View>
            )}
          </View>
        )}

        <Pressable
          onPress={() => setShowModal(true)}
          disabled={friends.length === 0}
          style={[
            { borderRadius: 14, overflow: 'hidden' },
            friends.length === 0 && { opacity: 0.35 },
          ]}
        >
          <LinearGradient
            colors={['rgba(230,48,48,0.14)', 'rgba(230,48,48,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cStyles.challengeFriendBtn}
          >
            <Swords size={14} strokeWidth={1.8} color={Colors.accent} />
            <Text style={cStyles.challengeFriendBtnText}>
              {friends.length === 0 ? t('challenges.addFriendsFirst') : t('challenges.challengeFriendBtn')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <CreateChallengeModal
        visible={showModal}
        friends={friends}
        exercises={exercises}
        onClose={() => { setShowModal(false); setCreateError(null); }}
        onCreate={handleCreate}
        loading={creating}
        errorMsg={createError}
      />
    </>
  );
}

// ─── Global Leaderboard Content ───────────────────────────────────────────────

const GLOBAL_STAT_BOXES = [
  { key: 'bench_pr'    as const, labelKey: 'global.statBench', Icon: Dumbbell },
  { key: 'squat_pr'    as const, labelKey: 'global.statSquat', Icon: Activity },
  { key: 'deadlift_pr' as const, labelKey: 'global.statDead',  Icon: Target   },
] as const;

/** Skeleton placeholder rendered while the first page is loading. */
function GlobalEntrySkeleton() {
  return (
    <View style={[gStyles.card, gStyles.cardOther, gStyles.skeletonCard]}>
      <View style={gStyles.topRow}>
        <View style={[gStyles.skeletonBlock, { width: 28, height: 18 }]} />
        <View style={[gStyles.skeletonBlock, { width: 42, height: 42, borderRadius: 21 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[gStyles.skeletonBlock, { height: 13, width: '60%' }]} />
          <View style={[gStyles.skeletonBlock, { height: 10, width: '40%' }]} />
        </View>
        <View style={[gStyles.skeletonBlock, { width: 48, height: 26 }]} />
      </View>
      <View style={gStyles.statsRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[gStyles.statBox, gStyles.skeletonBlock, { height: 50 }]} />
        ))}
      </View>
    </View>
  );
}

/** A single global leaderboard card. */
function GlobalEntryCard({
  entry,
  maxTotal,
}: {
  entry: GlobalLeaderboardEntry;
  maxTotal: number;
}) {
  const { t } = useTranslation('compete');
  const { is_me: isMe, rank } = entry;
  const displayName = entry.full_name ?? entry.username ?? t('unknown');
  const total       = entry.total_kg;
  const safeDenom   = maxTotal > 0 ? maxTotal : 1;
  const pct         = `${Math.round((total / safeDenom) * 100)}%` as `${number}%`;
  const rankIndex   = rank - 1; // 0-based for medal color
  const totalColor  = rankIndex === 0 ? (isMe ? '#000' : Colors.accent) : isMe ? '#333' : '#fff';
  const flag        = toFlagEmoji(entry.country_code);

  return (
    <View style={[gStyles.card, isMe ? gStyles.cardMe : gStyles.cardOther]}>
      <View style={gStyles.topRow}>
        <View style={gStyles.rankBox}>
          {rankIndex < 3 ? (
            <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[rankIndex]} />
          ) : (
            <Text style={gStyles.rankNum}>#{rank}</Text>
          )}
        </View>

        <LeaderboardAvatar id={entry.user_id} name={displayName} size={42} />

        <View style={gStyles.infoCol}>
          <View style={gStyles.nameRow}>
            <Text style={[gStyles.name, isMe && gStyles.nameMe]} numberOfLines={1}>
              {displayName.toUpperCase()}
            </Text>
            {!!flag && <Text style={gStyles.flagText}>{flag}</Text>}
            {isMe && <Text style={gStyles.youTag}>{t('you')}</Text>}
          </View>
          <Text style={[gStyles.sub, isMe && gStyles.subMe]} numberOfLines={1}>
            {entry.username ? `${entry.username} · ` : ''}{t('lvl', { level: entry.level })}
          </Text>
        </View>

        <View style={gStyles.totalBox}>
          <Text style={[gStyles.totalVal, { color: totalColor }]}>{formatNumber(total)}</Text>
          <Text style={[gStyles.totalLabel, isMe && gStyles.totalLabelMe]}>{t('global.totalKg')}</Text>
        </View>
      </View>

      <View style={gStyles.statsRow}>
        {GLOBAL_STAT_BOXES.map(s => {
          const StatIcon = s.Icon;
          return (
            <View key={s.key} style={[gStyles.statBox, isMe && gStyles.statBoxMe]}>
              <StatIcon size={12} strokeWidth={1.8} color={isMe ? '#888' : '#555'} />
              <Text style={[gStyles.statVal, isMe && gStyles.statValMe]}>
                {entry[s.key] > 0 ? formatNumber(entry[s.key]) : '–'}
              </Text>
              <Text style={[gStyles.statLabel, isMe && gStyles.statLabelMe]}>{t(s.labelKey)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[gStyles.barTrack, isMe && gStyles.barTrackMe]}>
        {isMe ? (
          <View style={[gStyles.barFillMe, { width: pct }]} />
        ) : (
          <LinearGradient
            colors={['#e63030', '#ff6b6b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[gStyles.barFillOther, { width: pct }]}
          />
        )}
      </View>
    </View>
  );
}

function GlobalContent({ onRefreshScrollView }: { onRefreshScrollView?: () => void }) {
  const { t } = useTranslation('compete');
  const { user } = useAuthStore();
  const {
    globalEntries,
    myGlobalRank,
    loadingGlobal,
    loadingMyRank,
    globalHasMore,
    globalError,
    loadGlobalLeaderboard,
    loadMoreGlobal,
    loadMyGlobalRank,
  } = useCompeteStore();

  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isFirstLoad = globalEntries.length === 0 && loadingGlobal;

  // Initial load
  useEffect(() => {
    if (!user?.id) return;
    loadGlobalLeaderboard(user.id, '');
    loadMyGlobalRank(user.id);
  }, [user?.id, loadGlobalLeaderboard, loadMyGlobalRank]);

  // Debounced search — new search resets to page 0
  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (user?.id) loadGlobalLeaderboard(user.id, text);
    }, 400);
  };

  const handleRefresh = () => {
    if (!user?.id) return;
    loadGlobalLeaderboard(user.id, search);
    loadMyGlobalRank(user.id);
    onRefreshScrollView?.();
  };

  const handleLoadMore = () => {
    if (user?.id && globalHasMore && !loadingGlobal) {
      loadMoreGlobal(user.id, search);
    }
  };

  // Determine whether the pinned "Your Rank" card should show.
  // Show it when:
  //   • user has big-3 PRs (myGlobalRank is not null)
  //   • user is not already visible in the current result set
  //   • we're not actively searching (searching for others shouldn't show a pin)
  const myEntryVisible = globalEntries.some(e => e.is_me);
  const showPinnedRank = !!myGlobalRank && !myEntryVisible && !search;

  // The reference total for progress bars is always the #1 athlete's total.
  // Fall back to myGlobalRank when entries are empty (e.g. user is alone).
  const maxTotal = globalEntries.length > 0
    ? globalEntries[0].total_kg
    : (myGlobalRank?.total_kg ?? 1);

  return (
    <>
      {/* Search bar */}
      <View style={gStyles.searchWrap}>
        <Search size={16} strokeWidth={1.8} color="#555" style={gStyles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder={t('global.searchPlaceholder')}
          placeholderTextColor="#555"
          style={gStyles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loadingGlobal && !isFirstLoad && (
          <ActivityIndicator
            size="small"
            color={Colors.accent}
            style={gStyles.searchSpinner}
          />
        )}
      </View>

      {/* Error state */}
      {!!globalError && !loadingGlobal && (
        <View style={gStyles.errorCard}>
          <AlertCircle size={22} strokeWidth={1.6} color="#e63030" />
          <Text style={gStyles.errorText}>{t('global.loadError')}</Text>
          <Pressable onPress={handleRefresh} style={gStyles.retryBtn}>
            <RefreshCw size={13} strokeWidth={2} color="#fff" />
            <Text style={gStyles.retryText}>{t('global.retry')}</Text>
          </Pressable>
        </View>
      )}

      {/* Skeleton while first page loads */}
      {isFirstLoad && (
        <>
          {[0, 1, 2, 3, 4].map(i => <GlobalEntrySkeleton key={i} />)}
        </>
      )}

      {/* Pinned "Your Rank" card — shown when user is outside the visible page */}
      {!isFirstLoad && showPinnedRank && (
        <View style={gStyles.pinnedWrap}>
          <Text style={gStyles.pinnedLabel}>{t('global.yourGlobalRank')}</Text>
          <GlobalEntryCard entry={myGlobalRank!} maxTotal={maxTotal} />
        </View>
      )}

      {/* Unranked call-to-action when user has no big-3 PRs */}
      {!isFirstLoad && !myGlobalRank && !loadingMyRank && !search && (
        <View style={gStyles.unrankedCard}>
          <Trophy size={26} strokeWidth={1.4} color="#333" />
          <Text style={gStyles.unrankedTitle}>{t('global.unrankedTitle')}</Text>
          <Text style={gStyles.unrankedSub}>{t('global.unrankedSub')}</Text>
        </View>
      )}

      {/* Leaderboard entries */}
      {!isFirstLoad && !globalError && globalEntries.map(entry => (
        <GlobalEntryCard key={entry.user_id} entry={entry} maxTotal={maxTotal} />
      ))}

      {/* No search results */}
      {!isFirstLoad && !loadingGlobal && !globalError && globalEntries.length === 0 && !!search && (
        <View style={gStyles.emptyCard}>
          <Search size={32} strokeWidth={1.4} color="#555" />
          <Text style={gStyles.emptyTitle}>{t('global.noResultsTitle')}</Text>
          <Text style={gStyles.emptySub}>{t('global.noResultsSub')}</Text>
        </View>
      )}

      {/* Empty leaderboard (no users have big-3 PRs yet) */}
      {!isFirstLoad && !loadingGlobal && !globalError && globalEntries.length === 0 && !search && (
        <View style={gStyles.emptyCard}>
          <Trophy size={32} strokeWidth={1.4} color="#555" />
          <Text style={gStyles.emptyTitle}>{t('global.noAthletesTitle')}</Text>
          <Text style={gStyles.emptySub}>{t('global.noAthletesSub')}</Text>
        </View>
      )}

      {/* Load more */}
      {!isFirstLoad && globalHasMore && globalEntries.length > 0 && (
        <Pressable onPress={handleLoadMore} style={gStyles.loadMoreBtn} disabled={loadingGlobal}>
          {loadingGlobal ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={gStyles.loadMoreText}>{t('global.loadMore')}</Text>
          )}
        </Pressable>
      )}

      {/* Refresh button (shown at bottom when fully loaded) */}
      {!isFirstLoad && !globalHasMore && globalEntries.length > 0 && (
        <Pressable onPress={handleRefresh} style={gStyles.refreshBtn} disabled={loadingGlobal}>
          <RefreshCw size={13} strokeWidth={2} color="#383838" />
          <Text style={gStyles.refreshText}>{t('global.refresh')}</Text>
        </Pressable>
      )}

      <Text style={gStyles.footerNote}>{t('global.footerNote')}</Text>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompeteScreen() {
  const { t } = useTranslation('compete');
  const [activeTab, setActiveTab] = useState<TabKey>('rivals');
  const scrollRef = useRef<ScrollView>(null);
  const currentTab = TABS.find(t => t.key === activeTab)!;

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>GYM RIVAL</Text>
        <Text style={styles.subtitle}>{t(currentTab.subtitleKey)}</Text>

        <View style={styles.segmented}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon  = tab.Icon;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.segTab, isActive && styles.segTabActive]}
              >
                <TabIcon
                  size={13}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  color={isActive ? '#000' : '#555'}
                />
                <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>
                  {t(tab.labelKey).toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'rivals'     && <RivalsContent />}
        {activeTab === 'challenges' && <ChallengesContent onDetailChange={scrollToTop} />}
        {activeTab === 'global'     && <GlobalContent onRefreshScrollView={scrollToTop} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Challenges Styles ────────────────────────────────────────────────────────

const cStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxLg: {
    width: 54,
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 3,
  },
  cardDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#707070',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#606060',
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  miniMedal: {
    width: 20,
    alignItems: 'center',
  },
  miniName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#b0b0b0',
  },
  miniVal: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: '#fff',
  },
  miniUnit: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#555',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  btnJoin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnJoinText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
  },
  btnJoinedInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  btnJoinedText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#555',
  },
  btnViewAll: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnViewAllText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 3,
    color: '#555',
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 16,
  },
  backBtnText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1,
  },
  detailTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 6,
  },
  detailDesc: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#909090',
    lineHeight: 21,
    marginBottom: 14,
  },
  prizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  prizeLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 2,
  },
  prizeVal: {
    fontFamily: Fonts.body,
    fontSize: 13,
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailStatLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 2,
  },
  detailStatVal: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: '#fff',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  rankMedal: {
    width: 24,
    alignItems: 'center',
  },
  rankNumSmall: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: '#555',
  },
  rankName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  rankUsername: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  rankVal: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: '#fff',
  },
  rankUnit: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#555',
    letterSpacing: 1,
  },
  detailBtnJoin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  detailBtnJoinText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 3,
    color: '#fff',
  },
  detailBtnJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
  },
  detailBtnJoinedText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 3,
    color: '#555',
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  friendTitle: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 2,
    color: '#fff',
  },
  friendSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#555',
    marginBottom: 14,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendRowBordered: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 12,
    marginTop: 12,
  },
  friendName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  challengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(230,48,48,0.08)',
  },
  moreCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCountText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#555',
  },
  challengeFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.25)',
  },
  challengeFriendBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.accent,
  },
});

// ─── Create Challenge Modal Styles ────────────────────────────────────────────

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    letterSpacing: 3,
    color: '#fff',
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  // ── Friend picker ──────────────────────────────────────────────────────────
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 4,
  },
  selectedName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  changeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#383838',
  },
  changeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 1,
    color: '#888',
  },
  searchWrap: {
    marginBottom: 10,
    justifyContent: 'center' as const,
  },
  searchIcon: {
    position: 'absolute' as const,
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#252525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    paddingLeft: 36,
    paddingRight: 14,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#fff',
  },
  friendList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden' as const,
    marginBottom: 4,
  },
  friendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#252525',
  },
  friendItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  friendItemName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: '#fff',
  },
  friendItemUsername: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  noFriendsText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: 'rgba(230,48,48,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.2)',
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.accent,
    lineHeight: 18,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 3,
    color: '#555',
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(230,48,48,0.1)',
  },
  chipLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 1,
    color: '#555',
  },
  chipLabelActive: {
    color: Colors.accent,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  sendBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 3,
    color: '#fff',
  },
});

// ─── Global Styles ────────────────────────────────────────────────────────────

const gStyles = StyleSheet.create({
  searchWrap: {
    position: 'relative',
    marginTop: 16,
    marginBottom: 4,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    paddingLeft: 42,
    paddingRight: 14,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
  },
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 6,
  },
  cardMe: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.025 }],
  },
  cardOther: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankNum: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: '#505050',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: '#fff',
  },
  nameMe: {
    color: '#000',
  },
  youTag: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 1,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  subMe: {
    color: '#888',
  },
  totalBox: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  totalVal: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 26,
  },
  totalLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#505050',
    letterSpacing: 1,
  },
  totalLabelMe: {
    color: '#888',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 5,
    alignItems: 'center',
    gap: 2,
  },
  statBoxMe: {
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  statVal: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#fff',
  },
  statValMe: {
    color: '#000',
  },
  statLabel: {
    fontFamily: Fonts.display,
    fontSize: 8,
    color: '#555',
    letterSpacing: 1,
  },
  statLabelMe: {
    color: '#888',
  },
  barTrack: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barTrackMe: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  barFillMe: {
    height: 4,
    borderRadius: 4,
    backgroundColor: '#000',
  },
  barFillOther: {
    height: 4,
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    paddingVertical: 48,
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 6,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
  },
  emptySub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
  },
  footerNote: {
    textAlign: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#383838',
    letterSpacing: 2,
  },

  // ── search extras ──────────────────────────────────────────────────────────
  searchSpinner: {
    position: 'absolute',
    right: 14,
  },

  flagText: {
    fontSize: 14,
  },

  // ── skeleton ───────────────────────────────────────────────────────────────
  skeletonCard: {
    opacity: 0.45,
  },
  skeletonBlock: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
  },

  // ── pinned "Your Rank" card ────────────────────────────────────────────────
  pinnedWrap: {
    marginBottom: 4,
  },
  pinnedLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 3,
    color: Colors.accent,
    marginBottom: 4,
    marginTop: 16,
  },

  // ── unranked CTA ───────────────────────────────────────────────────────────
  unrankedCard: {
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  unrankedTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
    marginTop: 4,
  },
  unrankedSub: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── error card ─────────────────────────────────────────────────────────────
  errorCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(230,48,48,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.2)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 16,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#b0b0b0',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
  },

  // ── load more / refresh ────────────────────────────────────────────────────
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: '#1e1e1e',
    minHeight: 46,
  },
  loadMoreText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 3,
    color: '#fff',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  refreshText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2,
    color: '#383838',
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 30,
    letterSpacing: 5,
    color: '#fff',
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#555',
    letterSpacing: 4,
    marginTop: 4,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
    gap: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  segTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  segTabActive: {
    backgroundColor: '#fff',
  },
  segLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#555',
  },
  segLabelActive: {
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2a2a2a',
    backgroundColor: 'transparent',
  },
  chipActive: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  chipLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    color: '#555',
  },
  chipLabelActive: {
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowMe: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.025 }],
  },
  rowOther: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankNum: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: '#505050',
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontFamily: Fonts.display,
    fontSize: 15,
    letterSpacing: 1,
    color: '#fff',
  },
  userNameMe: {
    color: '#000',
  },
  youTag: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: Colors.accent,
    marginLeft: 8,
    letterSpacing: 1,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barTrackMe: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  barFillMe: {
    height: 4,
    borderRadius: 4,
    backgroundColor: '#000',
  },
  barFillOther: {
    height: 4,
    borderRadius: 4,
  },
  prBox: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  prValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 28,
  },
  prUnit: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#505050',
    letterSpacing: 1,
  },
  prUnitMe: {
    color: '#888',
  },
  footerNote: {
    textAlign: 'center',
    paddingVertical: 16,
    paddingBottom: 8,
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#383838',
    letterSpacing: 2,
  },
});
