import { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useCompeteStore } from '@/store/useCompeteStore';
import type { ChallengeWithStats, ChallengeStatus } from '@/types/challenge';

function statusBadgeColor(status: ChallengeStatus): string {
  switch (status) {
    case 'active':    return Colors.success;
    case 'completed': return '#d4a017';
    case 'cancelled': return Colors.muted;
    default:          return Colors.muted;
  }
}

export function AdminChallengeList({ adminId }: { adminId: string }) {
  const { t } = useTranslation('compete');
  const myAdminChallenges = useCompeteStore((s) => s.myAdminChallenges);
  const loading = useCompeteStore((s) => s.loadingMyAdminChallenges);
  const error = useCompeteStore((s) => s.myAdminChallengesError);
  const loadMyAdminChallenges = useCompeteStore((s) => s.loadMyAdminChallenges);
  const cancelChallenge = useCompeteStore((s) => s.cancelChallenge);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadMyAdminChallenges(adminId);
  }, [adminId, loadMyAdminChallenges]);

  const statusLabel = (status: ChallengeStatus) => {
    switch (status) {
      case 'active':    return t('admin.manage.statusActive');
      case 'completed': return t('admin.manage.statusCompleted');
      case 'cancelled': return t('admin.manage.statusCancelled');
      default:          return t('admin.manage.statusDraft');
    }
  };

  const handleCancel = (challenge: ChallengeWithStats) => {
    Alert.alert(
      t('admin.manage.cancelConfirmTitle'),
      t('admin.manage.cancelConfirmMessage'),
      [
        { text: t('admin.manage.cancelConfirmNo'), style: 'cancel' },
        {
          text: t('admin.manage.cancelConfirmYes'),
          style: 'destructive',
          onPress: async () => {
            setCancellingId(challenge.id);
            await cancelChallenge(challenge.id, adminId);
            setCancellingId(null);
          },
        },
      ],
    );
  };

  return (
    <View>
      <Text className="font-heading text-[11px] tracking-[3px] text-muted mb-2.5">
        {t('admin.manageTitle')}
      </Text>

      {loading && myAdminChallenges.length === 0 && (
        <View className="items-center py-8">
          <ActivityIndicator color={Colors.accent} />
        </View>
      )}

      {!loading && error && myAdminChallenges.length === 0 && (
        <View className="items-center bg-[rgba(230,48,48,0.06)] rounded-2xl border border-[rgba(230,48,48,0.2)] py-7 px-5 gap-2">
          <AlertCircle size={22} strokeWidth={1.6} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-secondary">{t('admin.manage.loadError')}</Text>
          <Pressable
            onPress={() => loadMyAdminChallenges(adminId)}
            className="flex-row items-center gap-1.5 mt-1 bg-accent py-2 px-4 rounded-[10px]"
          >
            <RefreshCw size={13} strokeWidth={2} color={Colors.primary} />
            <Text className="font-heading text-xs tracking-[2px] text-white">{t('admin.manage.retry')}</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && myAdminChallenges.length === 0 && (
        <View className="items-center bg-surface rounded-2xl py-10 px-5 gap-2 border border-default">
          <ShieldCheck size={28} strokeWidth={1.4} color="#333" />
          <Text className="font-heading text-base tracking-[2px] text-white">
            {t('admin.manage.emptyTitle')}
          </Text>
          <Text className="font-sans text-xs text-muted text-center">{t('admin.manage.emptySub')}</Text>
        </View>
      )}

      {myAdminChallenges.map((ch) => (
        <View key={ch.id} className="bg-surface rounded-2xl py-3.5 px-4 mb-2.5 border border-default">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="flex-1 font-sans-medium text-sm text-white" numberOfLines={1}>
              {ch.title}
            </Text>
            <View
              className="rounded-full px-2.5 py-1 ml-2"
              style={{ backgroundColor: statusBadgeColor(ch.status) + '22' }}
            >
              <Text
                className="font-heading text-[9px] tracking-[1px]"
                style={{ color: statusBadgeColor(ch.status) }}
              >
                {statusLabel(ch.status)}
              </Text>
            </View>
          </View>
          <Text className="font-sans text-xs text-muted">
            {ch.scope === 'global' ? t('admin.fields.scopeGlobal') : t('admin.fields.scopeFriendsOnly')}
          </Text>

          {ch.status === 'active' && (
            <Pressable
              onPress={() => handleCancel(ch)}
              disabled={cancellingId === ch.id}
              className="self-start mt-2.5 py-1.5 px-3 rounded-lg border border-[rgba(230,48,48,0.3)]"
            >
              {cancellingId === ch.id ? (
                <ActivityIndicator size="small" color={Colors.accent} />
              ) : (
                <Text className="font-heading text-[10px] tracking-[1px] text-accent">
                  {t('admin.manage.cancel')}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
