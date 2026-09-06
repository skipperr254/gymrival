import { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useProfileStore } from '@/store/useProfileStore';
import { RivalsContent, ChallengesContent, GlobalContent } from '@/components/features/compete';
import { AppHeader, SegmentedControl } from '@/components/ui';

// ─── Tab config ───────────────────────────────────────────────────────────────

// Display text resolved via t('tabs.<key>.label') at render time.
const TABS = [
  { key: 'rivals',     labelKey: 'tabs.rivals.label' },
  { key: 'challenges', labelKey: 'tabs.challenges.label' },
  { key: 'global',     labelKey: 'tabs.global.label' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function CompeteScreen() {
  const { t } = useTranslation('compete');
  const isAdmin = useProfileStore((s) => s.profile?.role === 'admin');
  const [activeTab, setActiveTab] = useState<TabKey>('rivals');
  const scrollRef = useRef<ScrollView>(null);
  const activeIndex = TABS.findIndex(tab => tab.key === activeTab);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <AppHeader
        right={
          isAdmin ? (
            <Pressable onPress={() => router.push(Routes.adminChallenges as never)}>
              <ShieldCheck size={20} strokeWidth={1.8} color={Colors.accent} />
            </Pressable>
          ) : undefined
        }
      />
      <View className="px-4 pb-2.5">
        <SegmentedControl
          options={TABS.map(tab => t(tab.labelKey))}
          selectedIndex={activeIndex}
          onChange={(index) => setActiveTab(TABS[index].key)}
        />
      </View>

      {/* Global owns its own virtualized FlatList (50-row pages must not be
          mounted unvirtualized inside a ScrollView); the other two tabs are
          short, bounded lists and keep the shared ScrollView. */}
      {activeTab === 'global' ? (
        <GlobalContent />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'rivals' && <RivalsContent />}
          {activeTab === 'challenges' && <ChallengesContent onDetailChange={scrollToTop} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
});
