import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Users, ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

export default function FriendsScreen() {
  const { t } = useTranslation('social');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5 px-4 py-3.5">
        <ArrowLeft size={20} strokeWidth={2} color={Colors.accent} />
        <Text className="font-heading text-[13px] text-accent tracking-[1px]">
          {t('friendsStub.back')}
        </Text>
      </Pressable>

      <View className="flex-1 items-center justify-center px-8 -mt-[60px]">
        <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-4 border border-default">
          <Users size={32} strokeWidth={1.4} color="#333" />
        </View>
        <Text className="font-heading text-xl tracking-[3px] text-white mb-2">
          {t('friendsStub.title')}
        </Text>
        <Text className="font-sans text-[13px] text-[#555] text-center mb-5">
          {t('friendsStub.subtitle')}
        </Text>
        <View className="py-1.5 px-4 rounded-full border border-default bg-surface">
          <Text className="font-heading text-[10px] text-[#404040] tracking-[2px]">
            {t('friendsStub.comingSoon')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
