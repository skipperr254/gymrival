import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Users, Search, X, Clock, Bell, UserCheck, UserPlus, UserX, MessageCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { formatNumber } from '@/lib/i18n/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { FriendAvatar } from './FriendAvatar';
import { friendsStyles } from './friendsStyles';

type FriendsSubTab = 'list' | 'search' | 'requests';

export function FriendsContent() {
  const { t } = useTranslation('social');
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
    { key: 'list', label: t('friendsSubTabs.friends') },
    { key: 'search', label: t('friendsSubTabs.search') },
    {
      key: 'requests',
      label: incomingCount > 0
        ? t('friendsSubTabs.requestsCount', { count: incomingCount })
        : t('friendsSubTabs.requests'),
    },
  ];

  return (
    <>
      {/* Sub-tab segmented control */}
      <View style={friendsStyles.subTabBar}>
        {subTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setSubTab(tab.key)}
            style={[friendsStyles.subTab, subTab === tab.key && friendsStyles.subTabActive]}
          >
            <Text
              style={[
                friendsStyles.subTabLabel,
                subTab === tab.key && friendsStyles.subTabLabelActive,
              ]}
            >
              {tab.label}
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
              <Text style={friendsStyles.statLabel}>{t('friendsCount')}</Text>
            </View>
            <View style={friendsStyles.statCard}>
              <Text style={friendsStyles.statValue}>{incomingCount}</Text>
              <Text style={friendsStyles.statLabel}>{t('pending')}</Text>
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
              <Text style={friendsStyles.emptyTitle}>{t('noFriendsTitle')}</Text>
              <Text style={friendsStyles.emptySubtitle}>{t('noFriendsSub')}</Text>
              <Pressable onPress={() => setSubTab('search')} style={friendsStyles.emptyBtn}>
                <Text style={friendsStyles.emptyBtnText}>{t('findAthletes')}</Text>
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
                    {friend.full_name ?? friend.username ?? t('unknown')}
                  </Text>
                  <Text style={friendsStyles.userHandle}>{friend.username ?? ''}</Text>
                  <View style={friendsStyles.badgeRow}>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>{t('lvl', { level: friend.level })}</Text>
                    </View>
                    <View style={friendsStyles.badge}>
                      <Text style={friendsStyles.badgeText}>
                        {formatNumber(friend.xp)} XP
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
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#404040"
              style={friendsStyles.searchInput}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={friendsStyles.searchClear}>
                <X size={12} strokeWidth={2.5} color="#707070" />
              </Pressable>
            )}
          </View>

          {!query && <Text style={friendsStyles.sectionLabel}>{t('suggested')}</Text>}

          {searchLoading ? (
            <ActivityIndicator color="#404040" style={{ marginTop: 16 }} />
          ) : searchResults.length === 0 && query.length > 0 ? (
            <View style={friendsStyles.emptyCard}>
              <View style={friendsStyles.emptyIconWrap}>
                <Search size={22} strokeWidth={1.5} color="#383838" />
              </View>
              <Text style={friendsStyles.emptyTitle}>{t('noResultsTitle')}</Text>
              <Text style={[friendsStyles.emptySubtitle, { marginBottom: 0 }]}>
                {t('noResultsSub')}
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
                      {u.full_name ?? u.username ?? t('unknown')}
                    </Text>
                    <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                      {u.username ?? ''}
                    </Text>
                  </View>
                  {isFriend && (
                    <View style={friendsStyles.statusPill}>
                      <UserCheck size={13} strokeWidth={2} color="#505050" />
                      <Text style={friendsStyles.statusPillText}>{t('friendsPill')}</Text>
                    </View>
                  )}
                  {isSent && (
                    <View style={friendsStyles.statusPill}>
                      <Clock size={13} strokeWidth={2} color="#505050" />
                      <Text style={friendsStyles.statusPillText}>{t('sentPill')}</Text>
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
                      <Text style={friendsStyles.acceptBtnText}>{t('accept')}</Text>
                    </Pressable>
                  )}
                  {!isFriend && !isSent && !hasIncoming && (
                    <Pressable
                      onPress={() => sendRequest(userId, u.id)}
                      style={friendsStyles.addBtn}
                    >
                      <UserPlus size={13} strokeWidth={2} color="#808080" />
                      <Text style={friendsStyles.addBtnText}>{t('add')}</Text>
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
                  <Text style={friendsStyles.sectionLabel}>{t('incoming')}</Text>
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
                            {req.user.full_name ?? req.user.username ?? t('unknown')}
                          </Text>
                          <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                            {req.user.username ?? ''} · {t('lvl', { level: req.user.level })}
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
                            <Text style={friendsStyles.acceptActionBtnText}>{t('accept')}</Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable
                          onPress={() => declineRequest(req.friendship_id)}
                          style={[friendsStyles.declineBtn, { flex: 1 }]}
                        >
                          <X size={14} strokeWidth={2} color="#606060" />
                          <Text style={friendsStyles.declineBtnText}>{t('decline')}</Text>
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
                    {t('sent')}
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
                          {req.user.full_name ?? req.user.username ?? t('unknown')}
                        </Text>
                        <Text style={[friendsStyles.userHandle, { marginBottom: 0 }]}>
                          {req.user.username ?? ''}
                        </Text>
                      </View>
                      <View style={friendsStyles.pendingRow}>
                        <Clock size={12} strokeWidth={2} color="#484848" />
                        <Text style={friendsStyles.pendingText}>{t('pending')}</Text>
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
                  <Text style={friendsStyles.emptyTitle}>{t('allClearTitle')}</Text>
                  <Text style={[friendsStyles.emptySubtitle, { marginBottom: 0 }]}>
                    {t('allClearSub')}
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
