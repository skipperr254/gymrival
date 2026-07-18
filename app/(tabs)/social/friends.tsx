import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Users, ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';

export default function FriendsScreen() {
  const { t } = useTranslation('social');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
        <Text style={styles.backText}>{t('friendsStub.back')}</Text>
      </Pressable>

      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Users size={32} strokeWidth={1.4} color="#333" />
        </View>
        <Text style={styles.title}>{t('friendsStub.title')}</Text>
        <Text style={styles.subtitle}>{t('friendsStub.subtitle')}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{t('friendsStub.comingSoon')}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.accent,
    letterSpacing: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -60,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    letterSpacing: 3,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1e1e1e',
  },
  pillText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: '#404040',
    letterSpacing: 2,
  },
});
