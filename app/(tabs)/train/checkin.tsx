import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import { CheckInView } from '@/components/features/CheckInView';

export default function CheckinScreen() {
  const { t } = useTranslation('train');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <View className="flex-row items-end gap-3 px-4 pt-2.5 mb-3.5">
        <Pressable
          className="p-1 mb-0.5"
          style={({ pressed }) => pressed && { opacity: 0.5 }}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.accent} style={rtlIconFlip} />
        </Pressable>
        <View>
          <Text className="font-heading text-primary tracking-[4px] text-[26px] leading-7">
            {t('header.brand')}
          </Text>
          <Text className="font-heading text-[11px] text-[#606060] tracking-[2px] mt-0.5">
            {t('header.checkin')}
          </Text>
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
