import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const NAV_ITEMS: { label: string; sub: string; icon: IoniconName; route: string }[] = [
  { label: 'Edit Profile', sub: 'Update your info', icon: 'pencil', route: Routes.profileEdit },
  { label: 'PR History', sub: 'All your personal records', icon: 'trophy', route: Routes.profilePRHistory },
  { label: 'Badges', sub: '6 earned · 4 locked', icon: 'ribbon', route: Routes.profileBadges },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Athlete';

  const handleSignOut = async () => {
    await signOut();
    router.replace(Routes.onboarding as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>PROFILE</Text>
          <Pressable
            style={({ pressed }) => [styles.settingsBtn, pressed && { opacity: 0.5 }]}
          >
            <Ionicons name="settings-outline" size={22} color={Colors.secondary} />
          </Pressable>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.username}>@{displayName.toLowerCase().replace(/\s/g, '_')}</Text>
          <Text style={styles.bio}>On the way to my best self 💪</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'PRs', value: '17' },
              { label: 'LEVEL', value: '12' },
              { label: 'POINTS', value: '3.2K' },
            ].map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Nav items */}
        {NAV_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [styles.navRow, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(item.route as never)}
          >
            <View style={styles.navIcon}>
              <Ionicons name={item.icon} size={18} color={Colors.accent} />
            </View>
            <View style={styles.navText}>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Text style={styles.navSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.hint} />
          </Pressable>
        ))}

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.muted} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heading: { fontFamily: Fonts.display, fontSize: 36, color: Colors.primary, letterSpacing: 3 },
  settingsBtn: { padding: 4 },
  profileCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accentDark, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontFamily: Fonts.display, fontSize: 22, color: Colors.primary },
  name: { fontFamily: Fonts.display, fontSize: 22, color: Colors.primary, letterSpacing: 1, marginBottom: 2 },
  username: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 8 },
  bio: { fontFamily: Fonts.body, fontSize: 13, color: Colors.secondary, marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.elevated, paddingTop: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.display, fontSize: 24, color: Colors.primary },
  statLabel: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 2, color: Colors.muted, marginTop: 2 },
  navRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 8, gap: 14 },
  navIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentRing, alignItems: 'center', justifyContent: 'center' },
  navText: { flex: 1 },
  navLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.primary },
  navSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 16, height: 50, marginTop: 8 },
  signOutText: { fontFamily: Fonts.bodyMedium, fontSize: 14, color: Colors.muted },
});
