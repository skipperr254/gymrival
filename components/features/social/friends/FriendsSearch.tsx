import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Search, X, Clock, UserCheck, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { ErrorState, Avatar } from '@/components/ui';

/** The "Search" sub-tab: live user search + relationship-aware action buttons. */
export function FriendsSearch() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  // Per-field selectors — a whole-store subscription re-rendered the search on
  // every social-store change, including realtime feed like-events.
  const searchResults = useSocialStore((s) => s.searchResults);
  const searchLoading = useSocialStore((s) => s.searchLoading);
  const searchError = useSocialStore((s) => s.searchError);
  const search = useSocialStore((s) => s.search);
  const sendRequest = useSocialStore((s) => s.sendRequest);
  const acceptRequest = useSocialStore((s) => s.acceptRequest);

  const [query, setQuery] = useState('');

  // Immediate search on mount (shows the suggested list)
  useEffect(() => {
    if (userId) search(userId, query);
    // search is a stable Zustand action; query read once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Debounced live search on query change (300 ms)
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => search(userId, query), 300);
    return () => clearTimeout(timer);
    // search is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, userId]);

  return (
    <>
      <View className="flex-row items-center gap-2.5 bg-[#1c1c1c] border-[1.5px] border-[#242424] rounded-[14px] px-3.5 mb-4">
        <Search size={16} strokeWidth={2} color={Colors.hint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={Colors.hint}
          className="flex-1 font-sans text-sm text-white py-[13px]"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            className="w-[22px] h-[22px] rounded-full bg-elevated items-center justify-center"
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
        <ActivityIndicator color={Colors.hint} style={{ marginTop: 16 }} />
      ) : searchError && searchResults.length === 0 ? (
        <ErrorState
          message={t('loadErrorSearch')}
          retryLabel={t('retry')}
          onRetry={() => search(userId, query)}
        />
      ) : searchResults.length === 0 && query.length > 0 ? (
        <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
          <View className="w-14 h-14 rounded-full bg-[#242424] items-center justify-center mb-3.5">
            <Search size={22} strokeWidth={1.5} color="#383838" />
          </View>
          <Text className="font-heading text-[17px] tracking-[2px] text-white mb-1.5">
            {t('noResultsTitle')}
          </Text>
          <Text className="font-sans text-[13px] text-muted text-center">
            {t('noResultsSub')}
          </Text>
        </View>
      ) : (
        searchResults.map((u) => {
          const isFriend = u.friendship_status === 'accepted';
          const isSent = u.friendship_status === 'pending' && u.is_requester === true;
          const hasIncoming = u.friendship_status === 'pending' && u.is_requester === false;
          return (
            <View
              key={u.id}
              className="flex-row items-center gap-3 bg-[#1c1c1c] border border-[#242424] rounded-2xl p-3.5 mb-2.5"
            >
              <Avatar userId={u.id} name={u.full_name ?? u.username ?? '?'} avatarUrl={u.avatar_url} size={44} />
              <View className="flex-1">
                <Text className="font-sans-semibold text-[15px] text-white">
                  {u.full_name ?? u.username ?? t('unknown')}
                </Text>
                <Text className="font-sans text-xs text-[#505050]">{u.username ?? ''}</Text>
              </View>
              {isFriend && (
                <View className="flex-row items-center gap-[5px] py-[7px] px-3 rounded-[10px] bg-[#1a1a1a] border border-default">
                  <UserCheck size={13} strokeWidth={2} color="#505050" />
                  <Text className="font-heading text-[10px] text-[#505050] tracking-[1px]">
                    {t('friendsPill')}
                  </Text>
                </View>
              )}
              {isSent && (
                <View className="flex-row items-center gap-[5px] py-[7px] px-3 rounded-[10px] bg-[#1a1a1a] border border-default">
                  <Clock size={13} strokeWidth={2} color="#505050" />
                  <Text className="font-heading text-[10px] text-[#505050] tracking-[1px]">
                    {t('sentPill')}
                  </Text>
                </View>
              )}
              {hasIncoming && (
                <Pressable
                  onPress={() => u.friendship_id && acceptRequest(u.friendship_id)}
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
                  className="flex-row items-center gap-1.5 py-2 px-[13px] rounded-[10px] bg-[#1a1a1a] border border-default"
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
  );
}
