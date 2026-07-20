import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Users, UserX, MessageCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Routes } from '@/constants/routes';
import { formatNumber } from '@/lib/i18n/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { ErrorState } from '@/components/ui';
import { FriendAvatar } from '../FriendAvatar';

/** The "Friends" sub-tab: stat cards + the accepted-friends list. */
export function FriendsList({ onFindAthletes }: { onFindAthletes: () => void }) {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  // Per-field selectors — a whole-store subscription re-rendered this list on
  // every social-store change, including realtime feed like-events.
  const friends = useSocialStore((s) => s.friends);
  const incomingRequests = useSocialStore((s) => s.incomingRequests);
  const friendsLoading = useSocialStore((s) => s.friendsLoading);
  const friendsError = useSocialStore((s) => s.friendsError);
  const loadFriends = useSocialStore((s) => s.loadFriends);
  const unfriend = useSocialStore((s) => s.unfriend);

  // Refresh on mount (mounting happens when this sub-tab becomes active)
  useEffect(() => {
    if (userId) loadFriends(userId);
    // loadFriends is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <>
      <View className="flex-row gap-2.5 mb-[18px]">
        <View className="flex-1 bg-[#1c1c1c] border border-[#242424] rounded-[14px] p-3.5">
          <Text className="font-heading text-[28px] text-white">{friends.length}</Text>
          <Text className="font-sans text-[9px] text-[#505050] tracking-[2px] font-bold mt-0.5">
            {t('friendsCount')}
          </Text>
        </View>
        <View className="flex-1 bg-[#1c1c1c] border border-[#242424] rounded-[14px] p-3.5">
          <Text className="font-heading text-[28px] text-white">{incomingRequests.length}</Text>
          <Text className="font-sans text-[9px] text-[#505050] tracking-[2px] font-bold mt-0.5">
            {t('pending')}
          </Text>
        </View>
      </View>

      {friendsLoading ? (
        <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
          <ActivityIndicator color="#404040" />
        </View>
      ) : friendsError && friends.length === 0 ? (
        <ErrorState
          message={t('loadErrorFriends')}
          retryLabel={t('retry')}
          onRetry={() => loadFriends(userId)}
        />
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
          <Pressable onPress={onFindAthletes} className="bg-accent rounded-[10px] py-2.5 px-5">
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
  );
}
