import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Flame,
  Heart,
  MapPin,
  Video,
  Users,
  Search,
  X,
  Clock,
  Bell,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

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

// ─── Mock Data (Friends — kept for MessagesContent placeholder) ──────────────

type MockUser = { id: number; name: string; username: string; level: number; points: number };

const ALL_USERS: MockUser[] = [
  { id: 2, name: 'Daan',  username: '@daanfit',     level: 10, points: 2890 },
  { id: 3, name: 'Sara',  username: '@sara_lifts',  level: 14, points: 3800 },
  { id: 4, name: 'Mike',  username: '@mike_gains',  level: 8,  points: 2100 },
  { id: 5, name: 'Lisa',  username: '@lisastrong',  level: 11, points: 3050 },
];

const INIT_FRIENDS: number[] = [2, 3, 4, 5];

// ─── Messages Mock Data ───────────────────────────────────────────────────────

const ONLINE_IDS = [3, 5];

type ConvPreview = {
  lastText: string;
  lastTime: string;
  fromMe: boolean;
};

const CONV_PREVIEWS: Record<number, ConvPreview> = {
  2: { lastText: 'Nice! When are you training next?', lastTime: '10:35', fromMe: false },
  3: { lastText: "Haha thanks! You're almost at my level on squat", lastTime: 'Yesterday', fromMe: false },
  4: { lastText: 'Push/pull/legs, 3x per week', lastTime: 'Mon', fromMe: true },
  5: { lastText: 'Thanks! Still a long way to go', lastTime: 'Sun', fromMe: true },
};

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
  id: string;
  name: string;
  size?: number;
  online?: boolean;
}) {
  // Deterministic color from first 8 hex chars of the UUID
  const charSum = [...id.replace(/-/g, '').slice(0, 8)].reduce(
    (s, c) => s + c.charCodeAt(0),
    0
  );
  const color = AVATAR_PALETTE[charSum % AVATAR_PALETTE.length];
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
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    searchResults,
    friendsLoading,
    requestsLoading,
    searchLoading,
    loadFriends,
    loadRequests,
    search,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    unfriend,
    subscribeToFriendEvents,
  } = useSocialStore();

  const [subTab, setSubTab] = useState<FriendsSubTab>('list');
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial data load + Realtime subscription
  useEffect(() => {
    if (!userId) return;
    loadFriends(userId);
    loadRequests(userId);
    const unsubscribe = subscribeToFriendEvents(userId);
    return unsubscribe;
  }, [userId]);

  // Refresh data whenever the user switches subtabs
  useEffect(() => {
    if (!userId) return;
    if (subTab === 'search') search(userId, query);
    else if (subTab === 'list') loadFriends(userId);
    else if (subTab === 'requests') loadRequests(userId);
  }, [subTab]);

  // Debounced live search (300 ms)
  useEffect(() => {
    if (subTab !== 'search' || !userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(userId, query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const incomingCount = incomingRequests.length;

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
        {subTabs.map((t) => (
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

          {friendsLoading ? (
            <View style={friendsStyles.emptyCard}>
              <ActivityIndicator color="#404040" />
            </View>
          ) : friends.length === 0 ? (
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
            friends.map((friend) => (
              <View key={friend.id} style={friendsStyles.userCard}>
                <FriendAvatar
                  id={friend.id}
                  name={friend.full_name ?? friend.username ?? '?'}
                  size={46}
                />
                <View style={{ flex: 1 }}>
                  <Text style={friendsStyles.userName}>
                    {friend.full_name ?? friend.username ?? 'Unknown'}
                  </Text>
                  <Text style={friendsStyles.userHandle}>{friend.username ?? ''}</Text>
                  <View style={friendsStyles.badgeRow}>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>LVL {friend.level}</Text>
                    </View>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>
                        {friend.xp.toLocaleString()} XP
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => unfriend(friend.friendship_id)}
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

          {searchLoading ? (
            <ActivityIndicator color="#404040" style={{ marginTop: 16 }} />
          ) : searchResults.length === 0 && query.length > 0 ? (
            <View style={friendsStyles.emptyCard}>
              <View style={friendsStyles.emptyIconWrap}>
                <Search size={22} strokeWidth={1.5} color="#383838" />
              </View>
              <Text style={friendsStyles.emptyTitle}>NO RESULTS</Text>
              <Text style={[friendsStyles.emptySubtitle, { marginBottom: 0 }]}>
                Try a different name or @username
              </Text>
            </View>
          ) : (
            searchResults.map((u) => {
              const isFriend = u.friendship_status === 'accepted';
              const isSent = u.friendship_status === 'pending' && u.is_requester === true;
              const hasIncoming =
                u.friendship_status === 'pending' && u.is_requester === false;
              return (
                <View key={u.id} style={friendsStyles.userCard}>
                  <FriendAvatar
                    id={u.id}
                    name={u.full_name ?? u.username ?? '?'}
                    size={44}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={friendsStyles.userName}>
                      {u.full_name ?? u.username ?? 'Unknown'}
                    </Text>
                    <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                      {u.username ?? ''}
                    </Text>
                  </View>
                  {isFriend && (
                    <View style={friendsStyles.statusPill}>
                      <UserCheck size={13} strokeWidth={2} color="#505050" />
                      <Text style={friendsStyles.statusPillText}>FRIENDS</Text>
                    </View>
                  )}
                  {isSent && (
                    <View style={friendsStyles.statusPill}>
                      <Clock size={13} strokeWidth={2} color="#505050" />
                      <Text style={friendsStyles.statusPillText}>SENT</Text>
                    </View>
                  )}
                  {hasIncoming && (
                    <Pressable
                      onPress={() =>
                        u.friendship_id && acceptRequest(u.friendship_id)
                      }
                      style={friendsStyles.acceptBtn}
                    >
                      <UserCheck size={13} strokeWidth={2} color={Colors.accent} />
                      <Text style={friendsStyles.acceptBtnText}>ACCEPT</Text>
                    </Pressable>
                  )}
                  {!isFriend && !isSent && !hasIncoming && (
                    <Pressable
                      onPress={() => sendRequest(userId, u.id)}
                      style={friendsStyles.addBtn}
                    >
                      <UserPlus size={13} strokeWidth={2} color="#808080" />
                      <Text style={friendsStyles.addBtnText}>ADD</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </>
      )}

      {/* ── REQUESTS ── */}
      {subTab === 'requests' && (
        <>
          {requestsLoading ? (
            <View style={friendsStyles.emptyCard}>
              <ActivityIndicator color="#404040" />
            </View>
          ) : (
            <>
              {incomingRequests.length > 0 && (
                <>
                  <Text style={friendsStyles.sectionLabel}>INCOMING</Text>
                  {incomingRequests.map((req) => (
                    <View key={req.friendship_id} style={friendsStyles.requestCard}>
                      <View style={friendsStyles.requestUser}>
                        <FriendAvatar
                          id={req.user.id}
                          name={req.user.full_name ?? req.user.username ?? '?'}
                          size={46}
                        />
                        <View>
                          <Text style={friendsStyles.userName}>
                            {req.user.full_name ?? req.user.username ?? 'Unknown'}
                          </Text>
                          <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                            {req.user.username ?? ''} · LVL {req.user.level}
                          </Text>
                        </View>
                      </View>
                      <View style={friendsStyles.requestActions}>
                        <Pressable
                          onPress={() => acceptRequest(req.friendship_id)}
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
                          onPress={() => declineRequest(req.friendship_id)}
                          style={[friendsStyles.declineBtn, { flex: 1 }]}
                        >
                          <X size={14} strokeWidth={2} color="#606060" />
                          <Text style={friendsStyles.declineBtnText}>DECLINE</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {outgoingRequests.length > 0 && (
                <>
                  <Text
                    style={[
                      friendsStyles.sectionLabel,
                      incomingRequests.length > 0 && { marginTop: 8 },
                    ]}
                  >
                    SENT
                  </Text>
                  {outgoingRequests.map((req) => (
                    <View key={req.friendship_id} style={friendsStyles.userCard}>
                      <FriendAvatar
                        id={req.user.id}
                        name={req.user.full_name ?? req.user.username ?? '?'}
                        size={44}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={friendsStyles.userName}>
                          {req.user.full_name ?? req.user.username ?? 'Unknown'}
                        </Text>
                        <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                          {req.user.username ?? ''}
                        </Text>
                      </View>
                      <View style={friendsStyles.pendingRow}>
                        <Clock size={12} strokeWidth={2} color="#484848" />
                        <Text style={friendsStyles.pendingText}>PENDING</Text>
                        <Pressable
                          onPress={() => cancelRequest(req.friendship_id)}
                          style={friendsStyles.cancelBtn}
                        >
                          <X size={13} strokeWidth={2.5} color="#505050" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
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
      )}
    </>
  );
}

// ─── Messages Content ─────────────────────────────────────────────────────────

function MessagesContent() {
  return (
    <>
      {/* All Messages */}
      <Text style={msgStyles.sectionLabel}>ALL MESSAGES</Text>
      <View style={msgStyles.convList}>
        {INIT_FRIENDS.map(id => {
          const u = ALL_USERS.find(x => x.id === id);
          const conv = CONV_PREVIEWS[id];
          if (!u) return null;
          return (
            <Pressable
              key={id}
              onPress={() => router.push(Routes.chat(id.toString()) as never)}
              style={({ pressed }) => [msgStyles.convRow, pressed && msgStyles.convRowPressed]}
            >
              <FriendAvatar id={u.id.toString()} name={u.name} size={50} online={ONLINE_IDS.includes(id)} />
              <View style={msgStyles.convInfo}>
                <View style={msgStyles.convHeader}>
                  <Text style={msgStyles.convName}>{u.name}</Text>
                  <Text style={msgStyles.convTime}>{conv?.lastTime}</Text>
                </View>
                <Text style={msgStyles.convPreview} numberOfLines={1}>
                  {conv?.fromMe && <Text style={msgStyles.convYou}>{'You: '}</Text>}
                  {conv?.lastText}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/*
        CHALLENGE A FRIEND card — commented out for now.

        The idea: surface a quick-action card at the bottom of the inbox so users
        can fire off a head-to-head challenge directly from Messages without having
        to navigate to the Compete tab. Each friend row would have a CHALLENGE button
        that opens the same challenge-creation flow used in the Compete tab.

        Revisit once the Compete > Challenges flow is fully built so the two can
        share the same challenge-creation logic and data model.

        <View style={msgStyles.challengeCard}>
          <View style={msgStyles.challengeHeader}>
            <Trophy size={15} strokeWidth={1.5} color={Colors.accent} />
            <Text style={msgStyles.challengeTitle}>CHALLENGE A FRIEND</Text>
          </View>
          <View style={msgStyles.challengeList}>
            {INIT_FRIENDS.map(id => {
              const u = ALL_USERS.find(x => x.id === id);
              if (!u) return null;
              return (
                <View key={id} style={msgStyles.challengeRow}>
                  <FriendAvatar id={u.id} name={u.name} size={34} />
                  <Text style={msgStyles.challengeUserName}>{u.name}</Text>
                  <Pressable style={msgStyles.challengeBtn}>
                    <Dumbbell size={12} strokeWidth={2} color={Colors.accent} />
                    <Text style={msgStyles.challengeBtnText}>CHALLENGE</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      */}
    </>
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
        {activeTab === 'messages' && <MessagesContent />}
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

// ─── Messages Styles ──────────────────────────────────────────────────────────

const msgStyles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#484848',
    letterSpacing: 2,
    marginBottom: 12,
  },
  onlineRow: {
    flexDirection: 'row',
    gap: 18,
  },
  onlineItem: {
    alignItems: 'center',
    gap: 6,
  },
  onlineName: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#707070',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e1e1e',
    marginBottom: 18,
  },
  convList: {
    marginBottom: 24,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  convRowPressed: {
    backgroundColor: '#1c1c1c',
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  convName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: '#fff',
  },
  convTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#454545',
  },
  convPreview: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#505050',
  },
  convYou: {
    color: '#484848',
  },
  challengeCard: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 20,
    overflow: 'hidden',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a0505',
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  challengeTitle: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#fff',
  },
  challengeList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeUserName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#ccc',
  },
  challengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.3)',
    backgroundColor: 'rgba(230,48,48,0.06)',
  },
  challengeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1,
  },
});
