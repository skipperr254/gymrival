import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TILES: { label: string; sub: string; icon: IoniconName; route: string; accent?: boolean }[] = [
  { label: 'WORKOUT OF THE DAY', sub: 'Push Day Blast · 5 exercises', icon: 'flash', route: Routes.trainWod, accent: true },
  { label: 'MY SCHEMA', sub: '3 active programs', icon: 'list', route: Routes.trainSchemas },
  { label: 'AI COACH', sub: 'Get personalised insights', icon: 'sparkles', route: Routes.trainCoach },
  { label: 'GYM CHECK-IN', sub: 'Track your sessions', icon: 'location', route: Routes.trainCheckin },
  { label: 'MACROS', sub: '1060 / 2400 kcal today', icon: 'nutrition', route: Routes.trainMacros },
  { label: 'BODY SCAN', sub: '5 scans logged', icon: 'body', route: Routes.trainBodyScan },
  { label: 'WEIGHT LOG', sub: '76 kg · -6 kg total', icon: 'analytics', route: Routes.trainWeight },
  { label: 'PROGRESS', sub: 'View PR charts', icon: 'trending-up', route: Routes.trainProgress },
];

export default function TrainScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>TRAIN</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color={Colors.warning ?? '#ffaa00'} />
            <Text style={styles.streakText}>4 DAY STREAK</Text>
          </View>
        </View>

        {/* Tiles grid */}
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.label}
              style={({ pressed }) => [
                styles.tile,
                tile.accent && styles.tileAccent,
                pressed && styles.tilePressed,
              ]}
              onPress={() => router.push(tile.route as never)}
            >
              <View style={[styles.tileIcon, tile.accent && styles.tileIconAccent]}>
                <Ionicons
                  name={tile.icon}
                  size={20}
                  color={tile.accent ? Colors.primary : Colors.accent}
                />
              </View>
              <Text style={[styles.tileLabel, tile.accent && styles.tileLabelAccent]}>
                {tile.label}
              </Text>
              <Text style={[styles.tileSub, tile.accent && styles.tileSubAccent]}>
                {tile.sub}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={tile.accent ? 'rgba(255,255,255,0.5)' : Colors.hint}
                style={styles.tileArrow}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heading: { fontFamily: Fonts.display, fontSize: 36, color: Colors.primary, letterSpacing: 3 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  streakText: { fontFamily: Fonts.display, fontSize: 11, color: Colors.warning ?? '#ffaa00', letterSpacing: 1 },
  grid: { gap: 10 },
  tile: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, position: 'relative' },
  tileAccent: { backgroundColor: Colors.accent },
  tilePressed: { opacity: 0.75 },
  tileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentRing, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  tileIconAccent: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tileLabel: { fontFamily: Fonts.display, fontSize: 14, color: Colors.primary, letterSpacing: 1.5, marginBottom: 3 },
  tileLabelAccent: { color: Colors.primary },
  tileSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  tileSubAccent: { color: 'rgba(255,255,255,0.7)' },
  tileArrow: { position: 'absolute', right: 14, top: '50%' },
});
