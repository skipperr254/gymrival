import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { CheckInView } from '@/components/features/CheckInView';

export default function CheckinScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.accent} />
        </Pressable>
        <View>
          <Text style={styles.appTitle}>GYM RIVAL</Text>
          <Text style={styles.pageLabel}>GYM CHECK-IN</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CheckInView />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 14,
  },
  backBtn: { padding: 4, marginBottom: 2 },
  appTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 4,
    lineHeight: 28,
  },
  pageLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
    letterSpacing: 2,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
