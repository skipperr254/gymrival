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
      <View className="flex-row bg-[#1c1c1c] rounded-xl p-1 mb-[18px] gap-1">
        {subTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setSubTab(tab.key)}
            className={`flex-1 items-center justify-center py-2 rounded-lg ${
              subTab === tab.key ? 'bg-white' : ''
            }`}
          >
            <Text
              className={`font-heading text-[11px] tracking-[1.5px] ${
                subTab === tab.key ? 'text-black' : 'text-[#555]'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── LIST ── */}
      {subTab === 'list' && (
        <>
          <View className="flex-row gap-2.5 mb-[18px]">
            <View className="flex-1 bg-[#1c1c1c] border border-[#242424] rounded-[14px] p-3.5">
              <Text className="font-heading text-[28px] text-white">{friends.length}</Text>
              <Text className="font-sans text-[9px] text-[#505050] tracking-[2px] font-bold mt-0.5">
                {t('friendsCount')}
              </Text>
            </View>
            <View className="flex-1 bg-[#1c1c1c] border border-[#242424] rounded-[14px] p-3.5">
              <Text className="font-heading text-[28px] text-white">{incomingCount}</Text>
              <Text className="font-sans text-[9px] text-[#505050] tracking-[2px] font-bold mt-0.5">
                {t('pending')}
              </Text>
            </View>
          </View>

          {friendsLoading ? (
            <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
              <ActivityIndicator color="#404040" />
            </View>
          ) : friends.length === 0 ? (
            <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
              <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center mb-3.5">
                <Users size={24} strokeWidth={1.5} color="#404040" />
              </View>
              <Text className="font-heading text-[17px] tracking-[2px] text-white mb-1.5">
                {t('noFriendsTitle')}
              </Text>
              <Text className="font-sans text-[13px] text-[#555] text-center mb-[18px]">
                {t('noFriendsSub')}
              </Text>
              <Pressable
                onPress={() => setSubTab('search')}
                className="bg-accent rounded-[10px] py-2.5 px-5"
              >
                <Text className="font-heading text-[11px] tracking-[2px] text-white">
                  {t('findAthletes')}
                </Text>
              </Pressable>
            </View>
          ) : (
            friends.map((friend) => (
              <View
                key={friend.id}
                className="flex-row items-center gap-3 bg-[#1c1c1c] border border-[#242424] rounded-2xl p-3.5 mb-2.5"
              >
                <FriendAvatar
                  id={friend.id}
                  name={friend.full_name ?? friend.username ?? '?'}
                  size={46}
                />
                <View className="flex-1">
                  <Text className="font-sans-semibold text-[15px] text-white">
                    {friend.full_name ?? friend.username ?? t('unknown')}
                  </Text>
                  <Text className="font-sans text-xs text-[#505050] mb-1.5">
                    {friend.username ?? ''}
                  </Text>
                  <View className="flex-row gap-1.5">
                    <View className="bg-[#242424] rounded-lg py-[3px] px-2.5">
                      <Text className="font-heading text-[10px] text-[#888] tracking-[1px]">
                        {t('lvl', { level: friend.level })}
                      </Text>
                    </View>
                    <View className="bg-[#242424] rounded-lg py-[3px] px-2.5">
                      <Text className="font-heading text-[10px] text-[#888] tracking-[1px]">
                        {formatNumber(friend.xp)} XP
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => router.push(Routes.chat(friend.id) as never)}
                    className="w-[34px] h-[34px] rounded-full border border-[#2a2a2a] bg-[#1a1a1a] items-center justify-center"
                  >
                    <MessageCircle size={15} strokeWidth={2} color="#505050" />
                  </Pressable>
                  <Pressable
                    onPress={() => unfriend(friend.friendship_id)}
                    className="w-[34px] h-[34px] rounded-full border border-[#2a2a2a] bg-[#1a1a1a] items-center justify-center"
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
          <View className="flex-row items-center gap-2.5 bg-[#1c1c1c] border-[1.5px] border-[#242424] rounded-[14px] px-3.5 mb-4">
            <Search size={16} strokeWidth={2} color="#404040" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#404040"
              className="flex-1 font-sans text-sm text-white py-[13px]"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                className="w-[22px] h-[22px] rounded-full bg-[#2a2a2a] items-center justify-center"
              >
                <X size={12} strokeWidth={2.5} color="#707070" />
              </Pressable>
            )}
          </View>

          {!query && (
            <Text className="font-heading text-[10px] text-[#484848] tracking-[2px] mb-3">
              {t('suggested')}
            </Text>
          )}

          {searchLoading ? (
            <ActivityIndicator color="#404040" style={{ marginTop: 16 }} />
          ) : searchResults.length === 0 && query.length > 0 ? (
            <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
              <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center mb-3.5">
                <Search size={22} strokeWidth={1.5} color="#383838" />
              </View>
              <Text className="font-heading text-[17px] tracking-[2px] text-white mb-1.5">
                {t('noResultsTitle')}
              </Text>
              <Text className="font-sans text-[13px] text-[#555] text-center">
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
                <View
                  key={u.id}
                  className="flex-row items-center gap-3 bg-[#1c1c1c] border border-[#242424] rounded-2xl p-3.5 mb-2.5"
                >
                  <FriendAvatar
                    id={u.id}
                    name={u.full_name ?? u.username ?? '?'}
                    size={44}
                  />
                  <View className="flex-1">
                    <Text className="font-sans-semibold text-[15px] text-white">
                      {u.full_name ?? u.username ?? t('unknown')}
                    </Text>
                    <Text className="font-sans text-xs text-[#505050]">{u.username ?? ''}</Text>
                  </View>
                  {isFriend && (
                    <View className="flex-row items-center gap-[5px] py-[7px] px-3 rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a]">
                      <UserCheck size={13} strokeWidth={2} color="#505050" />
                      <Text className="font-heading text-[10px] text-[#505050] tracking-[1px]">
                        {t('friendsPill')}
                      </Text>
                    </View>
                  )}
                  {isSent && (
                    <View className="flex-row items-center gap-[5px] py-[7px] px-3 rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a]">
                      <Clock size={13} strokeWidth={2} color="#505050" />
                      <Text className="font-heading text-[10px] text-[#505050] tracking-[1px]">
                        {t('sentPill')}
                      </Text>
                    </View>
                  )}
                  {hasIncoming && (
                    <Pressable
                      onPress={() =>
                        u.friendship_id && acceptRequest(u.friendship_id)
                      }
                      className="flex-row items-center gap-1.5 py-2 px-[13px] rounded-[10px] bg-[rgba(230,48,48,0.1)]"
                    >
                      <UserCheck size={13} strokeWidth={2} color={Colors.accent} />
                      <Text className="font-heading text-[10px] text-accent tracking-[1px]">
                        {t('accept')}
                      </Text>
                    </Pressable>
                  )}
                  {!isFriend && !isSent && !hasIncoming && (
                    <Pressable
                      onPress={() => sendRequest(userId, u.id)}
                      className="flex-row items-center gap-1.5 py-2 px-[13px] rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a]"
                    >
                      <UserPlus size={13} strokeWidth={2} color="#808080" />
                      <Text className="font-heading text-[10px] text-[#808080] tracking-[1px]">
                        {t('add')}
                      </Text>
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
            <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
              <ActivityIndicator color="#404040" />
            </View>
          ) : (
            <>
              {incomingRequests.length > 0 && (
                <>
                  <Text className="font-heading text-[10px] text-[#484848] tracking-[2px] mb-3">
                    {t('incoming')}
                  </Text>
                  {incomingRequests.map((req) => (
                    <View
                      key={req.friendship_id}
                      className="bg-[#1c1c1c] border border-[#242424] rounded-2xl p-4 mb-2.5"
                    >
                      <View className="flex-row items-center gap-3 mb-3.5">
                        <FriendAvatar
                          id={req.user.id}
                          name={req.user.full_name ?? req.user.username ?? '?'}
                          size={46}
                        />
                        <View>
                          <Text className="font-sans-semibold text-[15px] text-white">
                            {req.user.full_name ?? req.user.username ?? t('unknown')}
                          </Text>
                          <Text className="font-sans text-xs text-[#505050]">
                            {req.user.username ?? ''} · {t('lvl', { level: req.user.level })}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => acceptRequest(req.friendship_id)}
                          className="flex-1"
                        >
                          <LinearGradient
                            colors={[Colors.accent, Colors.accentDark]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 7,
                              paddingVertical: 11,
                              borderRadius: 12,
                            }}
                          >
                            <UserCheck size={14} strokeWidth={2} color="#fff" />
                            <Text className="font-heading text-xs tracking-[2px] text-white">
                              {t('accept')}
                            </Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable
                          onPress={() => declineRequest(req.friendship_id)}
                          className="flex-row items-center justify-center gap-[7px] py-[11px] rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex-1"
                        >
                          <X size={14} strokeWidth={2} color="#606060" />
                          <Text className="font-heading text-xs tracking-[2px] text-[#606060]">
                            {t('decline')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {outgoingRequests.length > 0 && (
                <>
                  <Text
                    className={`font-heading text-[10px] text-[#484848] tracking-[2px] mb-3 ${
                      incomingRequests.length > 0 ? 'mt-2' : ''
                    }`}
                  >
                    {t('sent')}
                  </Text>
                  {outgoingRequests.map((req) => (
                    <View
                      key={req.friendship_id}
                      className="flex-row items-center gap-3 bg-[#1c1c1c] border border-[#242424] rounded-2xl p-3.5 mb-2.5"
                    >
                      <FriendAvatar
                        id={req.user.id}
                        name={req.user.full_name ?? req.user.username ?? '?'}
                        size={44}
                      />
                      <View className="flex-1">
                        <Text className="font-sans-semibold text-[15px] text-white">
                          {req.user.full_name ?? req.user.username ?? t('unknown')}
                        </Text>
                        <Text className="font-sans text-xs text-[#505050]">
                          {req.user.username ?? ''}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Clock size={12} strokeWidth={2} color="#484848" />
                        <Text className="font-heading text-[10px] text-[#484848] tracking-[1px]">
                          {t('pending')}
                        </Text>
                        <Pressable
                          onPress={() => cancelRequest(req.friendship_id)}
                          className="w-[30px] h-[30px] rounded-full border border-[#2a2a2a] bg-[#1a1a1a] items-center justify-center ml-1"
                        >
                          <X size={13} strokeWidth={2.5} color="#505050" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
                  <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center mb-3.5">
                    <Bell size={22} strokeWidth={1.5} color="#383838" />
                  </View>
                  <Text className="font-heading text-[17px] tracking-[2px] text-white mb-1.5">
                    {t('allClearTitle')}
                  </Text>
                  <Text className="font-sans text-[13px] text-[#555] text-center">
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
