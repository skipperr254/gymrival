import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Heart,
  MapPin,
  Video,
  Users,
  MessageCircle,
  Search,
  X,
  Clock,
  Bell,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedItem = {
  id: number;
  userId: number;
  exercise: string;
  value: number;
  unit: string;
  timestamp: string;
  location: string;
  likes: number;
  verified: boolean;
  myLike: boolean;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FEED_USERS = [
  { id: 1, name: 'You', isMe: true },
  { id: 2, name: 'Daan' },
  { id: 3, name: 'Sara' },
  { id: 4, name: 'Mike' },
  { id: 5, name: 'Lisa' },
] as const;

const INIT_FEED: FeedItem[] = [
  {
    id: 1,
    userId: 2,
    exercise: 'Bench Press',
    value: 90,
    unit: 'kg',
    timestamp: '2 hours ago',
    location: 'Basic-Fit Amsterdam',
    likes: 8,
    verified: true,
    myLike: false,
  },
  {
    id: 2,
    userId: 3,
    exercise: 'Pull-ups',
    value: 18,
    unit: 'reps',
    timestamp: '5 hours ago',
    location: 'Sportschool Rotterdam',
    likes: 12,
    verified: true,
    myLike: false,
  },
  {
    id: 3,
    userId: 4,
    exercise: 'Deadlift',
    value: 140,
    unit: 'kg',
    timestamp: 'Yesterday',
    location: 'Unknown',
    likes: 3,
    verified: false,
    myLike: false,
  },
];

// ─── Types (Friends) ─────────────────────────────────────────────────────────

type FriendUser = {
  id: number;
  name: string;
  username: string;
  level: number;
  points: number;
};

type FriendRequest = {
  userId: number;
  status: 'incoming' | 'outgoing';
};

// ─── Mock Data (Friends) ─────────────────────────────────────────────────────

const ALL_USERS: FriendUser[] = [
  { id: 2, name: 'Daan',  username: '@daanfit',     level: 10, points: 2890 },
  { id: 3, name: 'Sara',  username: '@sara_lifts',  level: 14, points: 3800 },
  { id: 4, name: 'Mike',  username: '@mike_gains',  level: 8,  points: 2100 },
  { id: 5, name: 'Lisa',  username: '@lisastrong',  level: 11, points: 3050 },
  { id: 6, name: 'Kevin', username: '@kevin_pr',    level: 9,  points: 2600 },
  { id: 7, name: 'Emma',  username: '@emma_gym',    level: 7,  points: 1900 },
  { id: 8, name: 'Bram',  username: '@bram_beast',  level: 13, points: 3100 },
];

const INIT_FRIENDS: number[] = [2, 3, 4, 5];

const INIT_REQUESTS: FriendRequest[] = [
  { userId: 6, status: 'incoming' },
  { userId: 7, status: 'outgoing' },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

function FeedAvatar({ id, name, size = 42 }: { id: number; name: string; size?: number }) {
  const color = AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length];
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

// ─── Friend Avatar ────────────────────────────────────────────────────────────

function FriendAvatar({
  id,
  name,
  size = 44,
  online = false,
}: {
  id: number;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const color = AVATAR_PALETTE[Math.abs(id) % AVATAR_PALETTE.length];
  const initials = name === 'You' ? 'YOU' : name.slice(0, 2).toUpperCase();
  const fontSize = Math.round(size * 0.3);
  return (
    <View style={{ position: 'relative', flexShrink: 0 }}>
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
        }}
      >
        <Text style={{ fontFamily: Fonts.display, fontSize, color: '#fff', letterSpacing: 1 }}>
          {initials}
        </Text>
      </LinearGradient>
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: Colors.success,
            borderWidth: 2,
            borderColor: Colors.base,
          }}
        />
      )}
    </View>
  );
}

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'feed',     label: 'Feed',     subtitle: 'FEED' },
  { key: 'friends',  label: 'Friends',  subtitle: 'FRIENDS' },
  { key: 'messages', label: 'Messages', subtitle: 'MESSAGES' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ─── Feed Content ─────────────────────────────────────────────────────────────

function FeedContent() {
  const [feed, setFeed] = useState<FeedItem[]>(INIT_FEED);

  const likePost = (id: number) => {
    setFeed(prev =>
      prev.map(item =>
        item.id !== id || item.myLike
          ? item
          : { ...item, likes: item.likes + 1, myLike: true },
      ),
    );
  };

  return (
    <>
      {feed.map(item => {
        const user = FEED_USERS.find(u => u.id === item.userId);
        const isMe = item.userId === 1;
        if (!user) return null;
        return (
          <View
            key={item.id}
            style={[
              feedStyles.card,
              item.verified ? feedStyles.cardVerified : feedStyles.cardDefault,
            ]}
          >
            {/* Video Proof Area */}
            <View style={feedStyles.videoArea}>
              <View style={feedStyles.videoPlaceholder}>
                <View style={feedStyles.videoIconWrap}>
                  <Video size={22} strokeWidth={1.5} color="#404040" />
                </View>
                <Text style={feedStyles.videoLabel}>VIDEO PROOF</Text>
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={feedStyles.videoGradient}
              >
                <View style={feedStyles.prOverlay}>
                  <View>
                    <View style={feedStyles.prValueRow}>
                      <Text style={feedStyles.prValue}>{item.value}</Text>
                      <Text style={feedStyles.prUnit}>{item.unit.toUpperCase()}</Text>
                    </View>
                    <Text style={feedStyles.prExercise}>{item.exercise.toUpperCase()}</Text>
                  </View>
                  {item.verified && (
                    <View style={feedStyles.trendingBadge}>
                      <Flame size={11} strokeWidth={2} color="#fff" />
                      <Text style={feedStyles.trendingText}>TRENDING</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Card Body */}
            <View style={feedStyles.cardBody}>
              <View style={feedStyles.userRow}>
                <FeedAvatar id={user.id} name={user.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={feedStyles.userName}>{user.name}</Text>
                  <View style={feedStyles.metaRow}>
                    <MapPin size={10} strokeWidth={2} color="#555" />
                    <Text style={feedStyles.metaText}>
                      {item.location} {'·'} {item.timestamp}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={feedStyles.actionRow}>
                <View style={feedStyles.likesDisplay}>
                  <Flame size={16} strokeWidth={2} color={Colors.accent} />
                  <Text style={feedStyles.likesCount}>{item.likes}</Text>
                  <Text style={feedStyles.likesLabel}>LIKES</Text>
                </View>
                {!isMe ? (
                  <Pressable
                    onPress={() => likePost(item.id)}
                    disabled={item.myLike}
                    style={[
                      feedStyles.likeBtn,
                      item.myLike ? feedStyles.likeBtnActive : feedStyles.likeBtnDefault,
                    ]}
                  >
                    <Heart
                      size={13}
                      strokeWidth={2}
                      fill={item.myLike ? Colors.accent : 'none'}
                      color={item.myLike ? Colors.accent : '#707070'}
                    />
                    <Text style={[feedStyles.likeBtnText, item.myLike && feedStyles.likeBtnTextActive]}>
                      {item.myLike ? 'LIKED' : 'LIKE'}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={feedStyles.yourPrLabel}>YOUR PR</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
      <Text style={feedStyles.footerNote}>{"YOU'RE ALL CAUGHT UP"}</Text>
    </>
  );
}

// ─── Friends Content ─────────────────────────────────────────────────────────

type FriendsSubTab = 'list' | 'search' | 'requests';

function FriendsContent() {
  const [subTab, setSubTab] = useState<FriendsSubTab>('list');
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<number[]>(INIT_FRIENDS);
  const [requests, setRequests] = useState<FriendRequest[]>(INIT_REQUESTS);

  const friendUsers = friends
    .map(id => ALL_USERS.find(u => u.id === id))
    .filter(Boolean) as FriendUser[];

  const incomingCount = requests.filter(r => r.status === 'incoming').length;

  const filteredUsers =
    query.length > 0
      ? ALL_USERS.filter(
          u =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase()),
        )
      : ALL_USERS.filter(u => !friends.includes(u.id));

  const subTabs: { key: FriendsSubTab; label: string }[] = [
    { key: 'list', label: 'FRIENDS' },
    { key: 'search', label: 'SEARCH' },
    {
      key: 'requests',
      label: incomingCount > 0 ? `REQUESTS · ${incomingCount}` : 'REQUESTS',
    },
  ];

  return (
    <>
      {/* Sub-tab segmented control */}
      <View style={friendsStyles.subTabBar}>
        {subTabs.map(t => (
          <Pressable
            key={t.key}
            onPress={() => setSubTab(t.key)}
            style={[friendsStyles.subTab, subTab === t.key && friendsStyles.subTabActive]}
          >
            <Text
              style={[
                friendsStyles.subTabLabel,
                subTab === t.key && friendsStyles.subTabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── LIST ── */}
      {subTab === 'list' && (
        <>
          <View style={friendsStyles.statsGrid}>
            <View style={friendsStyles.statCard}>
              <Text style={friendsStyles.statValue}>{friends.length}</Text>
              <Text style={friendsStyles.statLabel}>FRIENDS</Text>
            </View>
            <View style={friendsStyles.statCard}>
              <Text style={friendsStyles.statValue}>{incomingCount}</Text>
              <Text style={friendsStyles.statLabel}>PENDING</Text>
            </View>
          </View>

          {friendUsers.length === 0 ? (
            <View style={friendsStyles.emptyCard}>
              <View style={friendsStyles.emptyIconWrap}>
                <Users size={24} strokeWidth={1.5} color="#404040" />
              </View>
              <Text style={friendsStyles.emptyTitle}>NO FRIENDS YET</Text>
              <Text style={friendsStyles.emptySubtitle}>
                Search for athletes and start competing
              </Text>
              <Pressable onPress={() => setSubTab('search')} style={friendsStyles.emptyBtn}>
                <Text style={friendsStyles.emptyBtnText}>FIND ATHLETES</Text>
              </Pressable>
            </View>
          ) : (
            friendUsers.map(u => (
              <View key={u.id} style={friendsStyles.userCard}>
                <FriendAvatar id={u.id} name={u.name} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={friendsStyles.userName}>{u.name}</Text>
                  <Text style={friendsStyles.userHandle}>{u.username}</Text>
                  <View style={friendsStyles.badgeRow}>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>LVL {u.level}</Text>
                    </View>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>
                        {u.points.toLocaleString()} XP
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => setFriends(p => p.filter(x => x !== u.id))}
                  style={friendsStyles.unfriendBtn}
                >
                  <UserX size={15} strokeWidth={2} color="#505050" />
                </Pressable>
              </View>
            ))
          )}
        </>
      )}

      {/* ── SEARCH ── */}
      {subTab === 'search' && (
        <>
          <View style={friendsStyles.searchWrap}>
            <Search size={16} strokeWidth={2} color="#404040" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or @username"
              placeholderTextColor="#404040"
              style={friendsStyles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={friendsStyles.searchClear}>
                <X size={12} strokeWidth={2.5} color="#707070" />
              </Pressable>
            )}
          </View>

          {!query && <Text style={friendsStyles.sectionLabel}>SUGGESTED</Text>}

          {filteredUsers.map(u => {
            const isFriend = friends.includes(u.id);
            const isPending = requests.some(
              r => r.userId === u.id && r.status === 'outgoing',
            );
            const hasIncoming = requests.some(
              r => r.userId === u.id && r.status === 'incoming',
            );
            return (
              <View key={u.id} style={friendsStyles.userCard}>
                <FriendAvatar id={u.id} name={u.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={friendsStyles.userName}>{u.name}</Text>
                  <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                    {u.username}
                  </Text>
                </View>
                {isFriend && (
                  <View style={friendsStyles.statusPill}>
                    <UserCheck size={13} strokeWidth={2} color="#505050" />
                    <Text style={friendsStyles.statusPillText}>FRIENDS</Text>
                  </View>
                )}
                {isPending && !isFriend && (
                  <View style={friendsStyles.statusPill}>
                    <Clock size={13} strokeWidth={2} color="#505050" />
                    <Text style={friendsStyles.statusPillText}>SENT</Text>
                  </View>
                )}
                {hasIncoming && !isFriend && (
                  <Pressable
                    onPress={() => {
                      setFriends(p => [...p, u.id]);
                      setRequests(p => p.filter(r => r.userId !== u.id));
                    }}
                    style={friendsStyles.acceptBtn}
                  >
                    <UserCheck size={13} strokeWidth={2} color={Colors.accent} />
                    <Text style={friendsStyles.acceptBtnText}>ACCEPT</Text>
                  </Pressable>
                )}
                {!isFriend && !isPending && !hasIncoming && (
                  <Pressable
                    onPress={() =>
                      setRequests(p => [
                        ...p,
                        { userId: u.id, status: 'outgoing' },
                      ])
                    }
                    style={friendsStyles.addBtn}
                  >
                    <UserPlus size={13} strokeWidth={2} color="#808080" />
                    <Text style={friendsStyles.addBtnText}>ADD</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </>
      )}

      {/* ── REQUESTS ── */}
      {subTab === 'requests' && (
        <>
          {requests.filter(r => r.status === 'incoming').length > 0 && (
            <>
              <Text style={friendsStyles.sectionLabel}>INCOMING</Text>
              {requests
                .filter(r => r.status === 'incoming')
                .map(req => {
                  const u = ALL_USERS.find(x => x.id === req.userId);
                  if (!u) return null;
                  return (
                    <View key={req.userId} style={friendsStyles.requestCard}>
                      <View style={friendsStyles.requestUser}>
                        <FriendAvatar id={u.id} name={u.name} size={46} />
                        <View>
                          <Text style={friendsStyles.userName}>{u.name}</Text>
                          <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                            {u.username} · LVL {u.level}
                          </Text>
                        </View>
                      </View>
                      <View style={friendsStyles.requestActions}>
                        <Pressable
                          onPress={() => {
                            setFriends(p => [...p, u.id]);
                            setRequests(p => p.filter(r => r.userId !== u.id));
                          }}
                          style={{ flex: 1 }}
                        >
                          <LinearGradient
                            colors={[Colors.accent, Colors.accentDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={friendsStyles.acceptActionBtn}
                          >
                            <UserCheck size={14} strokeWidth={2} color="#fff" />
                            <Text style={friendsStyles.acceptActionBtnText}>ACCEPT</Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            setRequests(p => p.filter(r => r.userId !== u.id))
                          }
                          style={[friendsStyles.declineBtn, { flex: 1 }]}
                        >
                          <X size={14} strokeWidth={2} color="#606060" />
                          <Text style={friendsStyles.declineBtnText}>DECLINE</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </>
          )}

          {requests.filter(r => r.status === 'outgoing').length > 0 && (
            <>
              <Text style={[friendsStyles.sectionLabel, { marginTop: 8 }]}>SENT</Text>
              {requests
                .filter(r => r.status === 'outgoing')
                .map(req => {
                  const u = ALL_USERS.find(x => x.id === req.userId);
                  if (!u) return null;
                  return (
                    <View key={req.userId} style={friendsStyles.userCard}>
                      <FriendAvatar id={u.id} name={u.name} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={friendsStyles.userName}>{u.name}</Text>
                        <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                          {u.username}
                        </Text>
                      </View>
                      <View style={friendsStyles.pendingRow}>
                        <Clock size={12} strokeWidth={2} color="#484848" />
                        <Text style={friendsStyles.pendingText}>PENDING</Text>
                        <Pressable
                          onPress={() =>
                            setRequests(p => p.filter(r => r.userId !== u.id))
                          }
                          style={friendsStyles.cancelBtn}
                        >
                          <X size={13} strokeWidth={2.5} color="#505050" />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </>
          )}

          {requests.length === 0 && (
            <View style={friendsStyles.emptyCard}>
              <View style={friendsStyles.emptyIconWrap}>
                <Bell size={22} strokeWidth={1.5} color="#383838" />
              </View>
              <Text style={friendsStyles.emptyTitle}>ALL CLEAR</Text>
              <Text style={[friendsStyles.emptySubtitle, { marginBottom: 0 }]}>
                No pending requests
              </Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────

function ComingSoon({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={csStyles.wrap}>
      <View style={csStyles.iconWrap}>
        <Icon size={32} strokeWidth={1.4} color="#333" />
      </View>
      <Text style={csStyles.title}>{title}</Text>
      <Text style={csStyles.subtitle}>{subtitle}</Text>
      <View style={csStyles.pill}>
        <Text style={csStyles.pillText}>COMING SOON</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('feed');
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
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  scrollToTop();
                }}
                style={[styles.segTab, isActive && styles.segTabActive]}
              >
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
        {activeTab === 'feed' && <FeedContent />}
        {activeTab === 'friends' && <FriendsContent />}
        {activeTab === 'messages' && (
          <ComingSoon
            icon={MessageCircle}
            title="MESSAGES"
            subtitle="Chat with your training partners"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Feed Styles ──────────────────────────────────────────────────────────────

const feedStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  cardVerified: {
    backgroundColor: '#1c1c1c',
    borderColor: 'rgba(230,48,48,0.35)',
  },
  cardDefault: {
    backgroundColor: '#1c1c1c',
    borderColor: '#242424',
  },
  videoArea: {
    height: 200,
    backgroundColor: '#0d0d0d',
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#404040',
    letterSpacing: 2,
  },
  videoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 36,
  },
  prOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  prValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  prValue: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: '#fff',
    letterSpacing: 2,
    lineHeight: 32,
  },
  prUnit: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#aaa',
  },
  prExercise: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#aaa',
    letterSpacing: 2,
    marginTop: 2,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(230,48,48,0.9)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  trendingText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 1,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likesCount: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: '#fff',
  },
  likesLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#505050',
    letterSpacing: 1,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  likeBtnDefault: {
    borderColor: '#2a2a2a',
    backgroundColor: '#242424',
  },
  likeBtnActive: {
    borderColor: 'rgba(230,48,48,0.5)',
    backgroundColor: 'rgba(230,48,48,0.08)',
  },
  likeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: '#707070',
    letterSpacing: 1,
  },
  likeBtnTextActive: {
    color: Colors.accent,
  },
  yourPrLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#404040',
    letterSpacing: 1,
  },
  footerNote: {
    textAlign: 'center',
    paddingVertical: 24,
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#383838',
    letterSpacing: 2,
  },
});

// ─── Coming Soon Styles ───────────────────────────────────────────────────────

const csStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    letterSpacing: 3,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1e1e1e',
  },
  pillText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#404040',
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
    marginBottom: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  segTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: 12,
    paddingBottom: 96,
  },
});

// ─── Friends Styles ───────────────────────────────────────────────────────────

const friendsStyles = StyleSheet.create({
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    gap: 4,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: '#fff',
  },
  subTabLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#555',
  },
  subTabLabelActive: {
    color: '#000',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    padding: 14,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: '#fff',
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: '#505050',
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 20,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 18,
  },
  emptyBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBtnText: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    color: '#fff',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  userName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },
  userHandle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#505050',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: '#242424',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  badgeText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#888',
    letterSpacing: 1,
  },
  unfriendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1.5,
    borderColor: '#242424',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#fff',
    paddingVertical: 13,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#484848',
    letterSpacing: 2,
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusPillText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#505050',
    letterSpacing: 1,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: 'rgba(230,48,48,0.1)',
  },
  acceptBtnText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  addBtnText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#808080',
    letterSpacing: 1,
  },
  requestCard: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  requestUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
  },
  acceptActionBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  declineBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#606060',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#484848',
    letterSpacing: 1,
  },
  cancelBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
