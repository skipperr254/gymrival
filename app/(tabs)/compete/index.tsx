import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Medal, Zap, Flag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { RivalsContent, ChallengesContent, GlobalContent } from '@/components/features/compete';

// ─── Tab config ───────────────────────────────────────────────────────────────

// Display text resolved via t('tabs.<key>.label'/'subtitle') at render time.
const TABS = [
  { key: 'rivals',     labelKey: 'tabs.rivals.label',     Icon: Medal, subtitleKey: 'tabs.rivals.subtitle' },
  { key: 'challenges', labelKey: 'tabs.challenges.label', Icon: Zap,   subtitleKey: 'tabs.challenges.subtitle' },
  { key: 'global',     labelKey: 'tabs.global.label',     Icon: Flag,  subtitleKey: 'tabs.global.subtitle' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function CompeteScreen() {
  const { t } = useTranslation('compete');
  const [activeTab, setActiveTab] = useState<TabKey>('rivals');
  const scrollRef = useRef<ScrollView>(null);
  const currentTab = TABS.find(tab => tab.key === activeTab)!;

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="pt-5 px-4">
        <Text className="font-heading text-white tracking-[5px] text-[30px] leading-8">
          GYM RIVAL
        </Text>
        <Text className="font-heading text-[11px] text-[#555] tracking-[4px] mt-1">
          {t(currentTab.subtitleKey)}
        </Text>

        <View className="flex-row bg-surface rounded-[14px] p-1 mt-4 gap-[3px] border border-default">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon  = tab.Icon;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-[10px] ${
                  isActive ? 'bg-white' : ''
                }`}
              >
                <TabIcon
                  size={13}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  color={isActive ? '#000' : '#555'}
                />
                <Text
                  className={`font-heading text-[11px] tracking-[1.5px] ${
                    isActive ? 'text-black' : 'text-[#555]'
                  }`}
                >
                  {t(tab.labelKey).toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
