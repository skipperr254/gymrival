import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
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
        className="flex-1"
        bottomOffset={24}
        contentContainerClassName="px-4 pt-4 pb-24"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AdminCreateChallengeForm adminId={user.id} />
        <AdminChallengeList adminId={user.id} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
