import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, CheckCircle, Gift, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ChallengeInvitation } from '@/types/challenge';
import { endsInLabel } from '@/types/challenge';

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
      className="bg-[#1e1e1e] rounded-2xl py-4 px-[18px] mb-3 border"
      style={{ borderColor: '#4a9eff33' }}
    >
      <View className="flex-row items-start gap-3.5 mb-3.5">
        <View
          className="w-[46px] h-[46px] rounded-[13px] border items-center justify-center shrink-0"
          style={{ backgroundColor: '#4a9eff15', borderColor: '#4a9eff33' }}
        >
          <Swords size={20} strokeWidth={1.6} color="#4a9eff" />
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
          <Gift size={12} strokeWidth={1.8} color="#4a9eff" />
          <Text className="font-sans text-[11px]" style={{ color: '#4a9eff' }}>
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
            colors={['#4a9eff', '#4a9eff99']}
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
              ? <ActivityIndicator size="small" color="#fff" />
              : <><CheckCircle size={13} strokeWidth={2} color="#fff" /><Text className="font-heading text-xs tracking-[2px] text-white">{t('invitation.accept')}</Text></>
            }
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl border-[1.5px] bg-transparent"
          style={{ borderColor: '#2a2a2a' }}
        >
          <X size={13} strokeWidth={2} color="#555" />
          <Text className="font-heading text-xs tracking-[2px]" style={{ color: '#555' }}>
            {t('invitation.decline')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
