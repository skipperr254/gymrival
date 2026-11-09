import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { DetailHeader } from '@/components/ui/DetailHeader';
import { AdminCreateChallengeForm } from '@/components/features/compete/AdminCreateChallengeForm';
import { AdminChallengeList } from '@/components/features/compete/AdminChallengeList';

export default function AdminChallengesScreen() {
  const { t } = useTranslation('compete');
  const { user } = useAuthStore();

  if (!user?.id) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
      <DetailHeader title={t('admin.entry')} />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        bottomOffset={24}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AdminCreateChallengeForm adminId={user.id} />
        <AdminChallengeList adminId={user.id} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
});
