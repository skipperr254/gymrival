import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { formatDate } from '@/lib/i18n/format';
import type { PRHistoryGroup } from '@/types/pr';

function PRGroup({ group }: { group: PRHistoryGroup }) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Ionicons name="trophy" size={14} color={Colors.accent} />
        <Text style={styles.groupLabel}>{group.exercise.label.toUpperCase()}</Text>
        <Text style={styles.groupBest}>
          {t('prHistory.best', { value: group.best, unit: group.exercise.unit })}
        </Text>
      </View>
      {group.entries.map((entry, i) => (
        <View key={entry.id} style={styles.prRow}>
          {i === 0 ? (
            <View style={styles.crownIcon}>
              <Ionicons name="trophy" size={12} color={Colors.warning ?? '#ffaa00'} />
            </View>
          ) : (
            <View style={styles.crownSpacer} />
          )}
          <Text style={styles.prDate}>
            {formatDate(entry.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <Text style={[styles.prValue, entry.value === group.best && styles.prValueBest]}>
            {entry.value} {entry.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PRHistoryScreen() {
  const { t } = useTranslation('profile');
  const { user } = useAuthStore();
  const { prHistory, loadPRHistory, loading } = useProfileStore();

  useEffect(() => {
    if (user?.id) loadPRHistory(user.id);
  }, [user?.id, loadPRHistory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.accent} />
        </Pressable>
        <Text style={styles.heading}>{t('prHistory.title')}</Text>
        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.accent} size="small" />
        </View>
      ) : prHistory.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="trophy-outline" size={40} color="#333" />
          <Text style={styles.emptyTitle}>{t('prHistory.emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('prHistory.emptySub')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {prHistory.map((group) => (
            <PRGroup key={group.exercise.key} group={group} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  back: { padding: 4, marginRight: 8 },
  heading: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary, letterSpacing: 3, flex: 1 },
  spacer: { width: 30 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 20, letterSpacing: 2, color: Colors.primary },
  emptySub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  group: { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.elevated, padding: 14, paddingHorizontal: 16 },
  groupLabel: { flex: 1, fontFamily: Fonts.display, fontSize: 13, color: Colors.primary, letterSpacing: 2 },
  groupBest: { fontFamily: Fonts.display, fontSize: 13, color: Colors.accent },
  prRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated, gap: 10 },
  crownIcon: { width: 20, alignItems: 'center' },
  crownSpacer: { width: 20 },
  prDate: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.secondary },
  prValue: { fontFamily: Fonts.display, fontSize: 16, color: Colors.primary },
  prValueBest: { color: Colors.accent },
});
