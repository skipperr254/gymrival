import { useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { DetailHeader } from '@/components/ui';
import { NutritionGoalsForm } from '@/components/features/nutrition';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

export default function NutritionGoalsScreen() {
  const { t } = useTranslation('nutrition');
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const loadProfile = useProfileStore((s) => s.loadProfile);

  useEffect(() => {
    if (user?.id && !profile) loadProfile(user.id);
  }, [user?.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('goalsForm.headerTitle')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {profile ? (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <NutritionGoalsForm profile={profile} />
          </ScrollView>
        ) : (
          <View className="items-center py-16">
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
