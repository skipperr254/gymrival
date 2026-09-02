import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, CheckCircle, Gift, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ChallengeInvitation } from '@/types/challenge';
import { endsInLabel } from '@/types/challenge';
import { Colors } from '@/constants/theme';

export function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  loading,
}: {
  invitation: ChallengeInvitation;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation('compete');
  const ch       = invitation.challenge;
  const inviter  = invitation.inviter;
  const title    = ch?.title ?? t('invitation.defaultTitle');
  const name     = inviter?.full_name ?? inviter?.username ?? t('invitation.someone');

  return (
    <View
      className="bg-surface rounded-2xl py-4 px-[18px] mb-3 border"
      style={{ borderColor: Colors.friend + '33' }}
    >
      <View className="flex-row items-start gap-3.5 mb-3.5">
        <View
          className="w-[46px] h-[46px] rounded-[13px] border items-center justify-center shrink-0"
          style={{ backgroundColor: Colors.friend + '15', borderColor: Colors.friend + '33' }}
        >
          <Swords size={20} strokeWidth={1.6} color={Colors.friend} />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-lg tracking-[2px] text-white mb-[3px]">{title}</Text>
          <Text className="font-sans text-xs text-[#707070] leading-[18px]">
            {t('invitation.challengedYou', { name })}
            {ch?.ends_at ? `  ·  ${endsInLabel(ch.ends_at)}` : ''}
          </Text>
        </View>
      </View>
      {!!ch?.prize_label && (
        <View className="flex-row items-center gap-[5px] mb-3">
          <Gift size={12} strokeWidth={1.8} color={Colors.friend} />
          <Text className="font-sans text-[11px]" style={{ color: Colors.friend }}>
            {ch.prize_label}
          </Text>
        </View>
      )}
      <View className="flex-row gap-2 mt-3.5">
        <Pressable
          onPress={onAccept}
          disabled={loading}
          className="flex-1"
        >
          <LinearGradient
            colors={[Colors.friend, Colors.friend + '99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            {loading
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <><CheckCircle size={13} strokeWidth={2} color={Colors.primary} /><Text className="font-heading text-xs tracking-[2px] text-white">{t('invitation.accept')}</Text></>
            }
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border-[1.5px] bg-transparent"
          style={{ borderColor: Colors.borderDefault }}
        >
          <X size={13} strokeWidth={2} color={Colors.muted} />
          <Text className="font-heading text-xs tracking-[2px]" style={{ color: Colors.muted }}>
            {t('invitation.decline')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
