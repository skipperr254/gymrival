import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocialStore } from '@/store/useSocialStore';
import { useChatStore } from '@/store/useChatStore';
import { FeedContent, FriendsContent, MessagesContent } from '@/components/features/social';

// ─── Tab Config ───────────────────────────────────────────────────────────────

// Display text is resolved via t('tabs.<key>.label'/'subtitle') at render
// time — this constant only holds the stable key + i18n key paths.
const TABS = [
  { key: 'feed',     labelKey: 'tabs.feed.label',     subtitleKey: 'tabs.feed.subtitle' },
  { key: 'friends',  labelKey: 'tabs.friends.label',  subtitleKey: 'tabs.friends.subtitle' },
  { key: 'messages', labelKey: 'tabs.messages.label', subtitleKey: 'tabs.messages.subtitle' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function SocialScreen() {
  const { t } = useTranslation('social');
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab: TabKey = (TABS.map(tb => tb.key) as string[]).includes(tab ?? '')
    ? (tab as TabKey)
    : 'feed';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const currentTab = TABS.find(tb => tb.key === activeTab)!;

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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="pt-5 px-4">
        <Text className="font-heading text-white tracking-[5px] text-[30px] leading-8">
          GYM RIVAL
        </Text>
        <Text className="font-heading text-[11px] text-[#555] tracking-[4px] mt-1">
          {t(currentTab.subtitleKey)}
        </Text>

        <View className="flex-row bg-surface rounded-[14px] p-1 mt-4 mb-1 gap-[3px] border border-default">
          {TABS.map(tb => {
            const isActive = activeTab === tb.key;
            const showBadge = tb.key === 'messages' && msgUnread > 0;
            return (
              <Pressable
                key={tb.key}
                onPress={() => {
                  setActiveTab(tb.key);
                  scrollToTop();
                }}
                className={`flex-1 items-center justify-center py-2.5 px-1 rounded-[10px] ${
                  isActive ? 'bg-white' : ''
                }`}
              >
                <View className="flex-row items-center gap-1">
                  <Text
                    className={`font-heading text-[11px] tracking-[1.5px] ${
                      isActive ? 'text-black' : 'text-[#555]'
                    }`}
                  >
                    {t(tb.labelKey).toUpperCase()}
                  </Text>
                  {showBadge && (
                    <View className="bg-accent rounded-full min-w-[16px] h-4 items-center justify-center px-1">
                      <Text className="font-heading text-[9px] text-white leading-[14px]">
                        {msgUnread}
                      </Text>
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

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 96,
  },
});
