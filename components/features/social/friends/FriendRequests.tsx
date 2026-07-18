import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Clock, Bell, UserCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { FriendAvatar } from '../FriendAvatar';

/** The "Requests" sub-tab: incoming (accept/decline) + outgoing (pending/cancel). */
export function FriendRequests() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const {
    incomingRequests,
    outgoingRequests,
    requestsLoading,
    loadRequests,
    acceptRequest,
    declineRequest,
    cancelRequest,
  } = useSocialStore();

  // Refresh on mount (mounting happens when this sub-tab becomes active)
  useEffect(() => {
    if (userId) loadRequests(userId);
    // loadRequests is a stable Zustand action
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (requestsLoading) {
    return (
      <View className="items-center py-12 px-6 bg-[#1c1c1c] border border-[#242424] rounded-[20px]">
        <ActivityIndicator color="#404040" />
      </View>
    );
  }

  return (
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
                <Pressable onPress={() => acceptRequest(req.friendship_id)} className="flex-1">
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
  );
}
