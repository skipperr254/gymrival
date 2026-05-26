import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { useChatStore } from '@/store/useChatStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Flame,
  Heart,
  MapPin,
  Users,
  Search,
  X,
  Clock,
  Bell,
  UserCheck,
  UserPlus,
  UserX,
  Dumbbell,
  MessageCircle,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { PRVideoPlayer } from '@/components/features/PRVideoPlayer';

// ─── Feed helpers ─────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// ─── Shared Avatar (UUID-based deterministic color) ──────────────────────────

const AVATAR_PALETTE = ['#e63030', '#c0392b', '#922b21', '#7b241c', '#641e16'];

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

function formatConvTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Feed skeleton card ───────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <View style={feedStyles.card}>
      <View style={[feedStyles.videoAreaCompact, { backgroundColor: '#1a1a1a' }]} />
      <View style={feedStyles.cardBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2a2a2a' }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: '#2a2a2a' }} />
            <View style={{ height: 10, width: '70%', borderRadius: 5, backgroundColor: '#232323' }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ height: 14, width: 80, borderRadius: 6, backgroundColor: '#2a2a2a' }} />
          <View style={{ height: 34, width: 80, borderRadius: 12, backgroundColor: '#242424' }} />
        </View>
      </View>
    </View>
  );
}

// ─── Feed Content ─────────────────────────────────────────────────────────────

function FeedContent() {
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const {
    feed,
    feedLoading,
    feedParticipantIds,
    loadFeed,
    toggleLike,
    subscribeToFeedEvents,
  } = useSocialStore();

  // Initial load
  useEffect(() => {
    if (!userId) return;
    loadFeed(userId);
  }, [userId, loadFeed]);

  // Realtime subscription — set up once participant IDs are known
  useEffect(() => {
    if (!userId || feedParticipantIds.length === 0) return;
    return subscribeToFeedEvents(userId, feedParticipantIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, feedParticipantIds.join(',')]);

  if (feedLoading && feed.length === 0) {
    return (
      <>
        <FeedSkeleton />
        <FeedSkeleton />
        <FeedSkeleton />
      </>
    );
  }

  if (!feedLoading && feed.length === 0) {
    return (
      <View style={feedStyles.emptyWrap}>
        <View style={feedStyles.emptyIconWrap}>
          <Dumbbell size={28} strokeWidth={1.4} color="#404040" />
        </View>
        <Text style={feedStyles.emptyTitle}>NO ACTIVITY YET</Text>
        <Text style={feedStyles.emptySubtitle}>
          Add friends and start logging PRs to see the feed come alive.
        </Text>
      </View>
    );
  }

  return (
    <>
      {feed.map(post => {
        const isMe = post.user_id === userId;
        const displayName = post.author_name ?? post.author_username ?? 'Athlete';
        const location = post.author_gym ?? 'Unknown gym';
        const timestamp = formatRelativeTime(post.created_at);

        return (
          <View key={post.id} style={[feedStyles.card, feedStyles.cardDefault]}>
            {/* Video / PR visual area */}
            {(() => {
              const hasReadyVideo = post.video?.status === 'ready';
              const isUploading = post.video?.status === 'uploading' && isMe;
              return (
                <View style={hasReadyVideo ? feedStyles.videoArea : feedStyles.videoAreaCompact}>
                  {hasReadyVideo && (
                    <PRVideoPlayer
                      videoUrl={post.video!.video_url}
                      thumbnailUrl={post.video!.thumbnail_url}
                      status={post.video!.status}
                      isOwn={isMe}
                      height={200}
                    />
                  )}
                  {isUploading && (
                    <View style={feedStyles.uploadingBadge}>
                      <ActivityIndicator size="small" color="#555" style={{ transform: [{ scale: 0.7 }] }} />
                      <Text style={feedStyles.uploadingBadgeText}>VIDEO UPLOADING…</Text>
                    </View>
                  )}
                  {/* PR value overlay at the bottom of the visual area */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    style={feedStyles.videoGradient}
                    pointerEvents="none"
                  >
                    <View style={feedStyles.prOverlay}>
                      <View>
                        <View style={feedStyles.prValueRow}>
                          <Text style={feedStyles.prValue}>{post.value}</Text>
                          <Text style={feedStyles.prUnit}>{post.unit.toUpperCase()}</Text>
                        </View>
                        <Text style={feedStyles.prExercise}>{post.exercise_label.toUpperCase()}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              );
            })()}

            {/* Card body */}
            <View style={feedStyles.cardBody}>
              <View style={feedStyles.userRow}>
                <FriendAvatar id={post.user_id} name={displayName} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={feedStyles.userName}>{displayName}</Text>
                  <View style={feedStyles.metaRow}>
                    <MapPin size={10} strokeWidth={2} color="#555" />
                    <Text style={feedStyles.metaText}>
                      {location} {'·'} {timestamp}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={feedStyles.actionRow}>
                <View style={feedStyles.likesDisplay}>
                  <Flame size={16} strokeWidth={2} color={Colors.accent} />
                  <Text style={feedStyles.likesCount}>{post.likes_count}</Text>
                  <Text style={feedStyles.likesLabel}>LIKES</Text>
                </View>
                {!isMe ? (
                  <Pressable
                    onPress={() => toggleLike(userId, post.id)}
                    style={[
                      feedStyles.likeBtn,
                      post.has_liked ? feedStyles.likeBtnActive : feedStyles.likeBtnDefault,
                    ]}
                  >
                    <Heart
                      size={13}
                      strokeWidth={2}
                      fill={post.has_liked ? Colors.accent : 'none'}
                      color={post.has_liked ? Colors.accent : '#707070'}
                    />
                    <Text
                      style={[
                        feedStyles.likeBtnText,
                        post.has_liked && feedStyles.likeBtnTextActive,
                      ]}
                    >
                      {post.has_liked ? 'LIKED' : 'LIKE'}
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
    // Store actions are stable Zustand functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Refresh data whenever the user switches subtabs
  useEffect(() => {
    if (!userId) return;
    if (subTab === 'search') search(userId, query);
    else if (subTab === 'list') loadFriends(userId);
    else if (subTab === 'requests') loadRequests(userId);
    // Store actions are stable; query intentionally excluded (handled by debounce effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, userId]);

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
    // search is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, subTab, userId]);

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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(Routes.chat(friend.id) as never)}
                    style={friendsStyles.actionBtn}
                  >
                    <MessageCircle size={15} strokeWidth={2} color="#505050" />
                  </Pressable>
                  <Pressable
                    onPress={() => unfriend(friend.friendship_id)}
                    style={friendsStyles.actionBtn}
                  >
                    <UserX size={15} strokeWidth={2} color="#505050" />
                  </Pressable>
                </View>
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
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const {
    conversations,
    conversationsLoading,
    loadConversations,
    subscribeToInbox,
    startPresenceHeartbeat,
    isOnline,
    unreadCount,
  } = useChatStore();

  useEffect(() => {
    if (!userId) return;
    loadConversations(userId);
    const unsubInbox = subscribeToInbox(userId);
    const stopHeartbeat = startPresenceHeartbeat(userId);
    return () => {
      unsubInbox();
      stopHeartbeat();
    };
    // Store actions are stable Zustand functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (conversationsLoading && conversations.length === 0) {
    return (
      <View style={msgStyles.emptyCard}>
        <ActivityIndicator color="#404040" />
      </View>
    );
  }

  if (!conversationsLoading && conversations.length === 0) {
    return (
      <View style={msgStyles.emptyCard}>
        <View style={msgStyles.emptyIconWrap}>
          <MessageCircle size={24} strokeWidth={1.5} color="#404040" />
        </View>
        <Text style={msgStyles.emptyTitle}>NO MESSAGES YET</Text>
        <Text style={msgStyles.emptySubtitle}>
          Add friends and tap the message icon to start chatting
        </Text>
      </View>
    );
  }

  const total = unreadCount(userId);

  return (
    <>
      {total > 0 && (
        <View style={msgStyles.unreadBanner}>
          <Text style={msgStyles.unreadBannerText}>{total} UNREAD</Text>
        </View>
      )}

      <Text style={msgStyles.sectionLabel}>ALL MESSAGES</Text>
      <View style={msgStyles.convList}>
        {conversations.map((conv) => {
          const name = conv.other_user.full_name ?? conv.other_user.username ?? 'Athlete';
          const online = isOnline(conv.other_user.id);
          const isFromMe = conv.last_message_sender_id === userId;
          const hasUnread =
            !isFromMe &&
            conv.last_message_content !== null &&
            conv.last_message_read_at === null;

          return (
            <Pressable
              key={conv.id}
              onPress={() => router.push(Routes.chat(conv.other_user.id) as never)}
              style={({ pressed }) => [msgStyles.convRow, pressed && msgStyles.convRowPressed]}
            >
              <FriendAvatar id={conv.other_user.id} name={name} size={50} online={online} />
              <View style={msgStyles.convInfo}>
                <View style={msgStyles.convHeader}>
                  <Text style={[msgStyles.convName, hasUnread && msgStyles.convNameUnread]}>
                    {name}
                  </Text>
                  <Text style={[msgStyles.convTime, hasUnread && msgStyles.convTimeUnread]}>
                    {formatConvTime(conv.last_message_at)}
                  </Text>
                </View>
                <View style={msgStyles.convPreviewRow}>
                  <Text style={[msgStyles.convPreview, hasUnread && msgStyles.convPreviewUnread]} numberOfLines={1}>
                    {conv.last_message_content
                      ? isFromMe
                        ? `You: ${conv.last_message_content}`
                        : conv.last_message_content
                      : 'Start the conversation'}
                  </Text>
                  {hasUnread && <View style={msgStyles.unreadDot} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const currentTab = TABS.find(t => t.key === activeTab)!;

  const userId = useAuthStore((s) => s.user?.id ?? '');
  const loadFeed = useSocialStore((s) => s.loadFeed);
  const { loadConversations, unreadCount } = useChatStore();
  const msgUnread = unreadCount(userId);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    if (activeTab === 'feed') await loadFeed(userId);
    if (activeTab === 'messages') await loadConversations(userId);
    setRefreshing(false);
  }, [userId, activeTab, loadFeed, loadConversations]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>GYM RIVAL</Text>
        <Text style={styles.subtitle}>{currentTab.subtitle}</Text>

        <View style={styles.segmented}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const showBadge = tab.key === 'messages' && msgUnread > 0;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
                  scrollToTop();
                }}
                style={[styles.segTab, isActive && styles.segTabActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>
                    {tab.label.toUpperCase()}
                  </Text>
                  {showBadge && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{msgUnread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
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
    overflow: 'hidden',
  },
  videoAreaCompact: {
    height: 110,
    backgroundColor: '#0d0d0d',
    overflow: 'hidden',
  },
  uploadingBadge: {
    position: 'absolute',
    top: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  uploadingBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#666',
    letterSpacing: 1.5,
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
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
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
  tabBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 9,
    color: '#fff',
    lineHeight: 14,
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
  actionBtn: {
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
  },
  unreadBanner: {
    backgroundColor: 'rgba(230,48,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.25)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  unreadBannerText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 2,
  },
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#484848',
    letterSpacing: 2,
    marginBottom: 12,
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
    color: '#ccc',
  },
  convNameUnread: {
    fontFamily: Fonts.bodySemiBold,
    color: '#fff',
  },
  convTime: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#454545',
  },
  convTimeUnread: {
    color: Colors.accent,
  },
  convPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  convPreview: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#505050',
    flex: 1,
  },
  convPreviewUnread: {
    color: '#888',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    flexShrink: 0,
  },
});
