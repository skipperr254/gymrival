import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { FriendsList, FriendsSearch, FriendRequests } from './friends';

type FriendsSubTab = 'list' | 'search' | 'requests';

export function FriendsContent() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  // Per-field selectors — a whole-store subscription re-rendered this screen
  // (and the active sub-tab under it) on every social-store change.
  const incomingRequests = useSocialStore((s) => s.incomingRequests);
  const loadFriends = useSocialStore((s) => s.loadFriends);
  const loadRequests = useSocialStore((s) => s.loadRequests);
  const subscribeToFriendEvents = useSocialStore((s) => s.subscribeToFriendEvents);

  const [subTab, setSubTab] = useState<FriendsSubTab>('list');

  // Initial data load + realtime subscription. Requests are loaded here (not
  // only in the Requests sub-tab) so the sub-tab badge count stays live from
  // any tab. Each sub-tab additionally refreshes its own data on mount.
  useEffect(() => {
    if (!userId) return;
    loadFriends(userId);
    loadRequests(userId);
    const unsubscribe = subscribeToFriendEvents(userId);
    return unsubscribe;
    // Store actions are stable Zustand functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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
                subTab === tab.key ? 'text-black' : 'text-muted'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {subTab === 'list' && <FriendsList onFindAthletes={() => setSubTab('search')} />}
      {subTab === 'search' && <FriendsSearch />}
      {subTab === 'requests' && <FriendRequests />}
    </>
  );
}
