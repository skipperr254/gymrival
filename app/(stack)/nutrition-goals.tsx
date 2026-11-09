import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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

  // Keyed on whether a profile exists, not the profile object, so edits made
  // on this screen don't re-run it.
  const hasProfile = profile != null;
  useEffect(() => {
    if (user?.id && !hasProfile) loadProfile(user.id);
  }, [user?.id, hasProfile, loadProfile]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('goalsForm.headerTitle')} />
      {profile ? (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          bottomOffset={24}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <NutritionGoalsForm profile={profile} />
        </KeyboardAwareScrollView>
      ) : (
        <View className="items-center py-16">
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}
