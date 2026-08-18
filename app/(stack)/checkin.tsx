import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { CheckInView } from '@/components/features/CheckInView';
import { BackButton } from '@/components/ui/BackButton';

export default function CheckinScreen() {
  const { t } = useTranslation('train');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <BackButton />
        <Text className="font-heading text-[22px] tracking-[3px] text-primary flex-1 ml-1">
          {t('header.checkin')}
        </Text>
        <View className="w-9" />
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
