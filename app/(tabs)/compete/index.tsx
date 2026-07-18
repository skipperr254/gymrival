import { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Medal, Zap, Flag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RivalsContent, ChallengesContent, GlobalContent } from '@/components/features/compete';
import { styles } from '@/components/features/compete/styles';

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>GYM RIVAL</Text>
        <Text style={styles.subtitle}>{t(currentTab.subtitleKey)}</Text>

        <View style={styles.segmented}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const TabIcon  = tab.Icon;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.segTab, isActive && styles.segTabActive]}
              >
                <TabIcon
                  size={13}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  color={isActive ? '#000' : '#555'}
                />
                <Text style={[styles.segLabel, isActive && styles.segLabelActive]}>
                  {t(tab.labelKey).toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'rivals'     && <RivalsContent />}
        {activeTab === 'challenges' && <ChallengesContent onDetailChange={scrollToTop} />}
        {activeTab === 'global'     && <GlobalContent onRefreshScrollView={scrollToTop} />}
      </ScrollView>
    </SafeAreaView>
  );
}
