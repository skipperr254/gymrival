import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { SegmentedControl } from '@/components/ui';
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

  const subTabIndex = subTabs.findIndex((tab) => tab.key === subTab);

  return (
    <>
      {/* Sub-tab segmented control */}
      <View className="mb-[18px]">
        <SegmentedControl
          options={subTabs.map((tab) => tab.label)}
          selectedIndex={subTabIndex}
          onChange={(index) => setSubTab(subTabs[index].key)}
        />
      </View>

      {subTab === 'list' && <FriendsList onFindAthletes={() => setSubTab('search')} />}
      {subTab === 'search' && <FriendsSearch />}
      {subTab === 'requests' && <FriendRequests />}
    </>
  );
}
