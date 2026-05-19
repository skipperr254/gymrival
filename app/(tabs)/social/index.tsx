import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

const FEED_ITEMS = [
  { id: 1, user: 'Daan', exercise: 'Bench Press', value: '90 kg', time: '2 hours ago', likes: 8 },
  { id: 2, user: 'Sara', exercise: 'Pull-ups', value: '18 reps', time: '5 hours ago', likes: 12 },
  { id: 3, user: 'Mike', exercise: 'Deadlift', value: '140 kg', time: 'Yesterday', likes: 3 },
];

export default function SocialFeedScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>SOCIAL</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
            onPress={() => router.push(Routes.socialFriends)}
          >
            <Ionicons name="person-add-outline" size={22} color={Colors.secondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
            onPress={() => router.push(Routes.socialMessages)}
          >
            <Ionicons name="chatbubbles-outline" size={22} color={Colors.secondary} />
          </Pressable>
        </View>
      </View>

      {/* Segment */}
      <View style={styles.segRow}>
        <View style={[styles.seg, styles.segActive]}>
          <Text style={[styles.segLabel, styles.segLabelActive]}>FEED</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.seg, pressed && styles.segPressed]}
          onPress={() => router.push(Routes.socialFriends)}
        >
          <Text style={styles.segLabel}>FRIENDS</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.seg, pressed && styles.segPressed]}
          onPress={() => router.push(Routes.socialMessages)}
        >
          <Text style={styles.segLabel}>MESSAGES</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>

        {FEED_ITEMS.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.user.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardUser}>{item.user}</Text>
                <Text style={styles.cardTime}>{item.time}</Text>
              </View>
              <View style={styles.prBadge}>
                <Text style={styles.prBadgeText}>PR</Text>
              </View>
            </View>
            <View style={styles.prRow}>
              <Text style={styles.prExercise}>{item.exercise}</Text>
              <Text style={styles.prValue}>{item.value}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Pressable style={({ pressed }) => [styles.likeBtn, pressed && { opacity: 0.5 }]}>
                <Ionicons name="heart-outline" size={16} color={Colors.muted} />
                <Text style={styles.likeCount}>{item.likes}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  heading: { fontFamily: Fonts.display, fontSize: 36, color: Colors.primary, letterSpacing: 3 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  segRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 3, gap: 2, marginHorizontal: 16, marginBottom: 16 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segActive: { backgroundColor: Colors.elevated },
  segPressed: { opacity: 0.6 },
  segLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1.5, color: Colors.muted },
  segLabelActive: { color: Colors.primary },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 3, color: Colors.muted, marginBottom: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 12, color: Colors.primary },
  cardMeta: { flex: 1 },
  cardUser: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  cardTime: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 1 },
  prBadge: { backgroundColor: Colors.accentRing, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  prBadgeText: { fontFamily: Fonts.display, fontSize: 10, color: Colors.accent, letterSpacing: 1 },
  prRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  prExercise: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.secondary },
  prValue: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary },
  cardFooter: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated, paddingTop: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeCount: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
});
