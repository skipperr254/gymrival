import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { MessagesContent } from '@/components/features/social';
import { DetailHeader } from '@/components/ui/DetailHeader';

export default function MessagesScreen() {
  const { t } = useTranslation('social');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const loadConversations = useChatStore((s) => s.loadConversations);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadConversations(userId);
    setRefreshing(false);
  }, [userId, loadConversations]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <DetailHeader title={t('messagesTitle')} />
      <ScrollView
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
        <MessagesContent />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.base },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
});
