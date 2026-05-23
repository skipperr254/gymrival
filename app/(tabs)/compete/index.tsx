import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  ArrowLeft,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';

const GLOBAL_ATHLETES = [
  { id: 10, name: 'ThijsLifts',   username: '@thijslifts',   bench: 180, squat: 240, deadlift: 280, country: 'NL' as const, level: 28 },
  { id: 11, name: 'PowerPiet',    username: '@powerpiet',    bench: 165, squat: 220, deadlift: 260, country: 'NL' as const, level: 24 },
  { id: 12, name: 'IronJan',      username: '@ironjan',      bench: 155, squat: 200, deadlift: 250, country: 'BE' as const, level: 22 },
  { id: 1,  name: 'You',          username: '@you',          bench: 100, squat: 140, deadlift: 160, country: 'NL' as const, level: 12, isMe: true },
  { id: 13, name: 'StrengthSven', username: '@strengthsven', bench: 95,  squat: 135, deadlift: 155, country: 'DE' as const, level: 11 },
];

const COUNTRY_COLORS: Record<string, string> = {
  NL: '#1a6bbf',
  BE: '#cc2200',
  DE: '#888888',
};

// ─── Challenge Data ───────────────────────────────────────────────────────────

type ChallengeEntry = {
  id: number;
  name: string;
  username: string;
  val: string;
  unit: string;
  isMe?: boolean;
};

type ChallengeData = {
  id: string;
  title: string;
  desc: string;
  Icon: typeof Dumbbell;
  prize: string;
  endsIn: string;
  participants: number;
  color: string;
  leaderboard: ChallengeEntry[];
};

const WEEKLY_CHALLENGE: ChallengeData = {
  id: 'weekly',
  title: 'BENCH BATTLE',
  desc: 'Who has the highest bench press PR this week?',
  Icon: Dumbbell,
  prize: 'Gold badge + 500 XP',
  endsIn: '4 days',
  participants: 47,
  color: '#e63030',
  leaderboard: [
    { id: 3, name: 'Sara', username: '@sara_lifts', val: '105', unit: 'kg' },
    { id: 2, name: 'Daan', username: '@daanfit',    val: '102', unit: 'kg' },
    { id: 1, name: 'You',  username: '@you',        val: '100', unit: 'kg', isMe: true },
    { id: 4, name: 'Mike', username: '@mike_gains', val: '98',  unit: 'kg' },
    { id: 5, name: 'Lisa', username: '@lisastrong', val: '92',  unit: 'kg' },
  ],
};

const MONTHLY_CHALLENGE: ChallengeData = {
  id: 'monthly',
  title: 'MOST IMPROVED',
  desc: 'Who makes the biggest PR progress this month?',
  Icon: TrendingUp,
  prize: 'Platinum badge + 2000 XP + 1 month Pro',
  endsIn: '18 days',
  participants: 124,
  color: '#4a9eff',
  leaderboard: [
    { id: 4, name: 'Mike', username: '@mike_gains',  val: '+28kg', unit: 'total' },
    { id: 5, name: 'Lisa', username: '@lisastrong',  val: '+22kg', unit: 'total' },
    { id: 2, name: 'Daan', username: '@daanfit',     val: '+19kg', unit: 'total' },
    { id: 1, name: 'You',  username: '@you',         val: '+15kg', unit: 'total', isMe: true },
    { id: 3, name: 'Sara', username: '@sara_lifts',  val: '+12kg', unit: 'total' },
  ],
};

const CHALLENGE_FRIENDS = [
  { id: 2, name: 'Daan' },
  { id: 3, name: 'Sara' },
  { id: 4, name: 'Mike' },
  { id: 5, name: 'Lisa' },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'rivals',     label: 'Rivals',     Icon: Medal, subtitle: 'RIVALS' },
  { key: 'challenges', label: 'Challenges', Icon: Zap,   subtitle: 'CHALLENGES' },
  { key: 'global',     label: 'Global',     Icon: Flag,  subtitle: 'GLOBAL LEADERBOARD' },
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
  const color    = AVATAR_PALETTE[avatarColorIndex(id) % AVATAR_PALETTE.length];
  const initials = name === 'You' ? 'YOU' : name.slice(0, 2).toUpperCase();
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
          <Text style={rivalsStyles.emptyTitle}>NO RIVALS YET</Text>
          <Text style={rivalsStyles.emptySub}>
            {"Add friends to compete on the leaderboard"}
          </Text>
        </View>
      )}

      {!isLoading && rivals.map((rival, index) => {
        const isFirst = index === 0;
        const prColor = isFirst ? (rival.isMe ? '#000' : Colors.accent) : rival.isMe ? '#333' : '#fff';
        const pct = `${Math.round((rival.bestPR / maxPR) * 100)}%` as `${number}%`;
        const displayName = rival.fullName || rival.username || 'Unknown';

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
                {rival.isMe && <Text style={styles.youTag}>YOU</Text>}
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
        <Text style={styles.footerNote}>BASED ON PERSONAL RECORDS</Text>
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

function ChallengeCard({
  ch,
  joined,
  onJoin,
  onOpen,
}: {
  ch: ChallengeData;
  joined: boolean;
  onJoin: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const ChalIcon = ch.Icon;
  return (
    <View style={[cStyles.card, { borderColor: ch.color + '22' }]}>
      {/* Header row */}
      <View style={cStyles.cardHeader}>
        <View style={[cStyles.iconBox, { backgroundColor: ch.color + '15', borderColor: ch.color + '33' }]}>
          <ChalIcon size={22} strokeWidth={1.5} color={ch.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cStyles.cardTitle}>{ch.title}</Text>
          <Text style={cStyles.cardDesc}>{ch.desc}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={cStyles.statsRow}>
        <View style={cStyles.statItem}>
          <Clock size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{ch.endsIn}</Text>
        </View>
        <View style={cStyles.statItem}>
          <Users size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{ch.participants} joined</Text>
        </View>
        <View style={cStyles.statItem}>
          <Gift size={12} strokeWidth={1.8} color="#555" />
          <Text style={cStyles.statText}>{ch.prize}</Text>
        </View>
      </View>

      {/* Mini leaderboard – top 3 */}
      {ch.leaderboard.slice(0, 3).map((p, i) => (
        <View key={i} style={cStyles.miniRow}>
          <View style={cStyles.miniMedal}>
            <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[i]} />
          </View>
          <LeaderboardAvatar id={p.id} name={p.name} size={26} />
          <Text style={[cStyles.miniName, p.isMe && { color: ch.color, fontFamily: Fonts.bodyMedium }]}>
            {p.name}{p.isMe ? ' (You)' : ''}
          </Text>
          <Text style={[cStyles.miniVal, p.isMe && { color: ch.color }]}>
            {p.val}{' '}
            <Text style={cStyles.miniUnit}>{p.unit}</Text>
          </Text>
        </View>
      ))}

      {/* Action buttons */}
      <View style={cStyles.btnRow}>
        <Pressable onPress={() => onJoin(ch.id)} style={{ flex: 1 }}>
          {joined ? (
            <View style={cStyles.btnJoinedInactive}>
              <CheckCircle size={13} strokeWidth={2} color="#555" />
              <Text style={cStyles.btnJoinedText}>JOINED</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[ch.color, ch.color + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={cStyles.btnJoin}
            >
              <Zap size={13} strokeWidth={2} color="#fff" />
              <Text style={cStyles.btnJoinText}>JOIN</Text>
            </LinearGradient>
          )}
        </Pressable>
        <Pressable
          onPress={() => onOpen(ch.id)}
          style={[cStyles.btnViewAll, { borderColor: ch.color + '44' }]}
        >
          <Text style={[cStyles.btnViewAllText, { color: ch.color }]}>VIEW ALL</Text>
          <ChevronRight size={13} strokeWidth={2} color={ch.color} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Challenge Detail ─────────────────────────────────────────────────────────

function ChallengeDetail({
  ch,
  joined,
  onJoin,
  onBack,
}: {
  ch: ChallengeData;
  joined: boolean;
  onJoin: (id: string) => void;
  onBack: () => void;
}) {
  const ChalIcon = ch.Icon;
  return (
    <>
      <Pressable onPress={onBack} style={cStyles.backBtn}>
        <ArrowLeft size={16} strokeWidth={2} color="#fff" />
        <Text style={cStyles.backBtnText}>BACK</Text>
      </Pressable>

      <View style={[cStyles.card, { borderColor: ch.color + '33' }]}>
        <View style={[cStyles.iconBoxLg, { backgroundColor: ch.color + '15', borderColor: ch.color + '33' }]}>
          <ChalIcon size={26} strokeWidth={1.4} color={ch.color} />
        </View>
        <Text style={cStyles.detailTitle}>{ch.title}</Text>
        <Text style={cStyles.detailDesc}>{ch.desc}</Text>

        <View style={cStyles.prizeBox}>
          <Gift size={15} strokeWidth={1.8} color={ch.color} />
          <View>
            <Text style={cStyles.prizeLabel}>PRIZE</Text>
            <Text style={[cStyles.prizeVal, { color: ch.color }]}>{ch.prize}</Text>
          </View>
        </View>

        <View style={cStyles.detailStatsRow}>
          <View style={cStyles.detailStatItem}>
            <Clock size={14} strokeWidth={1.8} color="#555" />
            <View>
              <Text style={cStyles.detailStatLabel}>ENDS IN</Text>
              <Text style={cStyles.detailStatVal}>{ch.endsIn}</Text>
            </View>
          </View>
          <View style={cStyles.detailStatItem}>
            <Users size={14} strokeWidth={1.8} color="#555" />
            <View>
              <Text style={cStyles.detailStatLabel}>PARTICIPANTS</Text>
              <Text style={cStyles.detailStatVal}>{ch.participants}</Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={cStyles.sectionLabel}>FULL RANKINGS</Text>

      {ch.leaderboard.map((p, i) => (
        <View
          key={i}
          style={[
            cStyles.rankRow,
            p.isMe
              ? { backgroundColor: ch.color + '12', borderColor: ch.color + '44' }
              : { backgroundColor: '#1e1e1e', borderColor: '#2a2a2a' },
          ]}
        >
          <View style={cStyles.rankMedal}>
            {i < 3 ? (
              <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[i]} />
            ) : (
              <Text style={cStyles.rankNumSmall}>#{i + 1}</Text>
            )}
          </View>
          <LeaderboardAvatar id={p.id} name={p.name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[cStyles.rankName, p.isMe && { color: ch.color }]}>
              {p.name}{p.isMe ? ' (You)' : ''}
            </Text>
            <Text style={cStyles.rankUsername}>{p.username}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[cStyles.rankVal, p.isMe && { color: ch.color }]}>{p.val}</Text>
            <Text style={cStyles.rankUnit}>{p.unit.toUpperCase()}</Text>
          </View>
        </View>
      ))}

      <Pressable onPress={() => onJoin(ch.id)} style={{ marginTop: 8, marginBottom: 16 }}>
        {joined ? (
          <View style={cStyles.detailBtnJoined}>
            <CheckCircle size={15} strokeWidth={2} color="#555" />
            <Text style={cStyles.detailBtnJoinedText}>JOINED</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[ch.color, ch.color + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cStyles.detailBtnJoin}
          >
            <Zap size={15} strokeWidth={2} color="#fff" />
            <Text style={cStyles.detailBtnJoinText}>JOIN CHALLENGE</Text>
          </LinearGradient>
        )}
      </Pressable>
    </>
  );
}

// ─── Challenges Content ───────────────────────────────────────────────────────

function ChallengesContent({ onDetailChange }: { onDetailChange?: () => void }) {
  const [joined, setJoined]       = useState<string[]>([]);
  const [detail, setDetail]       = useState<string | null>(null);
  const [challenged, setChallenged] = useState<Record<number, boolean>>({});

  const toggle = (id: string) =>
    setJoined(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleOpen = (id: string) => {
    setDetail(id);
    onDetailChange?.();
  };

  const handleBack = () => {
    setDetail(null);
    onDetailChange?.();
  };

  if (detail) {
    const ch = detail === 'weekly' ? WEEKLY_CHALLENGE : MONTHLY_CHALLENGE;
    return (
      <ChallengeDetail
        ch={ch}
        joined={joined.includes(detail)}
        onJoin={toggle}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <View style={{ height: 16 }} />

      <Text style={cStyles.sectionLabel}>THIS WEEK</Text>
      <ChallengeCard
        ch={WEEKLY_CHALLENGE}
        joined={joined.includes('weekly')}
        onJoin={toggle}
        onOpen={handleOpen}
      />

      <Text style={cStyles.sectionLabel}>THIS MONTH</Text>
      <ChallengeCard
        ch={MONTHLY_CHALLENGE}
        joined={joined.includes('monthly')}
        onJoin={toggle}
        onOpen={handleOpen}
      />

      {/* Challenge a Friend */}
      <View style={[cStyles.card, { borderColor: '#2a2a2a' }]}>
        <View style={cStyles.friendHeader}>
          <Swords size={17} strokeWidth={1.6} color={Colors.accent} />
          <Text style={cStyles.friendTitle}>CHALLENGE A FRIEND</Text>
        </View>
        <Text style={cStyles.friendSubtitle}>Send a personal challenge to a friend</Text>
        {CHALLENGE_FRIENDS.map((f, i) => (
          <View
            key={f.id}
            style={[
              cStyles.friendRow,
              i > 0 && cStyles.friendRowBordered,
            ]}
          >
            <LeaderboardAvatar id={f.id} name={f.name} size={36} />
            <Text style={cStyles.friendName}>{f.name}</Text>
            <Pressable
              onPress={() => setChallenged(prev => ({ ...prev, [f.id]: true }))}
              disabled={challenged[f.id]}
              style={[cStyles.challengeBtn, challenged[f.id] && cStyles.challengeBtnSent]}
            >
              {challenged[f.id] ? (
                <>
                  <CheckCircle size={11} strokeWidth={2} color="#555" />
                  <Text style={cStyles.challengeBtnTextSent}>SENT</Text>
                </>
              ) : (
                <>
                  <Zap size={11} strokeWidth={2} color={Colors.accent} />
                  <Text style={cStyles.challengeBtnText}>CHALLENGE</Text>
                </>
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </>
  );
}

// ─── Global Leaderboard Content ───────────────────────────────────────────────

const GLOBAL_STAT_BOXES = [
  { key: 'bench' as const,    label: 'BENCH', Icon: Dumbbell },
  { key: 'squat' as const,    label: 'SQUAT', Icon: Activity },
  { key: 'deadlift' as const, label: 'DEAD',  Icon: Target   },
] as const;

function GlobalContent() {
  const [search, setSearch] = useState('');

  const filtered = GLOBAL_ATHLETES.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const maxTotal =
    GLOBAL_ATHLETES[0].bench + GLOBAL_ATHLETES[0].squat + GLOBAL_ATHLETES[0].deadlift;

  return (
    <>
      <View style={gStyles.searchWrap}>
        <Search size={16} strokeWidth={1.8} color="#555" style={gStyles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or @username..."
          placeholderTextColor="#555"
          style={gStyles.searchInput}
        />
      </View>

      {filtered.map(u => {
        const total      = u.bench + u.squat + u.deadlift;
        const rank       = GLOBAL_ATHLETES.indexOf(u);
        const isMe       = u.isMe ?? false;
        const pct        = `${Math.round((total / maxTotal) * 100)}%` as `${number}%`;
        const totalColor = rank === 0 ? (isMe ? '#000' : Colors.accent) : isMe ? '#333' : '#fff';

        return (
          <View
            key={u.id}
            style={[gStyles.card, isMe ? gStyles.cardMe : gStyles.cardOther]}
          >
            <View style={gStyles.topRow}>
              <View style={gStyles.rankBox}>
                {rank < 3 ? (
                  <Trophy size={16} strokeWidth={1.8} color={MEDAL_COLORS[rank]} />
                ) : (
                  <Text style={gStyles.rankNum}>#{rank + 1}</Text>
                )}
              </View>
              <LeaderboardAvatar id={u.id} name={u.name} size={42} />
              <View style={gStyles.infoCol}>
                <View style={gStyles.nameRow}>
                  <Text style={[gStyles.name, isMe && gStyles.nameMe]}>
                    {u.name.toUpperCase()}
                  </Text>
                  <Flag size={13} strokeWidth={1.8} color={COUNTRY_COLORS[u.country] ?? '#555'} />
                  {isMe && <Text style={gStyles.youTag}>YOU</Text>}
                </View>
                <Text style={[gStyles.sub, isMe && gStyles.subMe]}>
                  {u.username} {'·'} LVL {u.level}
                </Text>
              </View>
              <View style={gStyles.totalBox}>
                <Text style={[gStyles.totalVal, { color: totalColor }]}>{total}</Text>
                <Text style={[gStyles.totalLabel, isMe && gStyles.totalLabelMe]}>TOTAL KG</Text>
              </View>
            </View>

            <View style={gStyles.statsRow}>
              {GLOBAL_STAT_BOXES.map(s => {
                const StatIcon = s.Icon;
                return (
                  <View key={s.key} style={[gStyles.statBox, isMe && gStyles.statBoxMe]}>
                    <StatIcon size={12} strokeWidth={1.8} color={isMe ? '#888' : '#555'} />
                    <Text style={[gStyles.statVal, isMe && gStyles.statValMe]}>{u[s.key]}</Text>
                    <Text style={[gStyles.statLabel, isMe && gStyles.statLabelMe]}>{s.label}</Text>
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
      })}

      {filtered.length === 0 && (
        <View style={gStyles.emptyCard}>
          <Search size={32} strokeWidth={1.4} color="#555" />
          <Text style={gStyles.emptyTitle}>NO RESULTS</Text>
          <Text style={gStyles.emptySub}>Try a different name or username</Text>
        </View>
      )}

      <Text style={gStyles.footerNote}>BASED ON COMBINED BENCH {'·'} SQUAT {'·'} DEADLIFT</Text>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CompeteScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('rivals');
  const scrollRef = useRef<ScrollView>(null);
  const currentTab = TABS.find(t => t.key === activeTab)!;

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>GYM RIVAL</Text>
        <Text style={styles.subtitle}>{currentTab.subtitle}</Text>

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
                  {tab.label.toUpperCase()}
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
        {activeTab === 'global'     && <GlobalContent />}
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
  challengeBtnSent: {
    borderColor: '#2a2a2a',
    backgroundColor: '#2a2a2a',
  },
  challengeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.accent,
  },
  challengeBtnTextSent: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1,
    color: '#555',
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
