import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/theme';

export default function ChallengesScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Text style={styles.title}>COMING SOON</Text>
        <Text style={styles.sub}>{"Challenges are on their way"}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.display, fontSize: 24, letterSpacing: 3, color: '#555', marginBottom: 8 },
  sub: { fontFamily: Fonts.body, fontSize: 13, color: '#383838' },
});
