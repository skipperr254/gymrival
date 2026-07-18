import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>GYM RIVAL</Text>
        <Text style={styles.subtitle}>{t(currentTab.subtitleKey)}</Text>

        <View style={styles.segmented}>
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
                style={[styles.segTab, isActive && styles.segTabActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>
                    {t(tb.labelKey).toUpperCase()}
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
