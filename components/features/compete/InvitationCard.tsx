import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swords, CheckCircle, Gift, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ChallengeInvitation } from '@/types/challenge';
import { endsInLabel } from '@/types/challenge';
import { cStyles } from './styles';

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
    <View style={[cStyles.card, { borderColor: '#4a9eff33' }]}>
      <View style={cStyles.cardHeader}>
        <View style={[cStyles.iconBox, { backgroundColor: '#4a9eff15', borderColor: '#4a9eff33' }]}>
          <Swords size={20} strokeWidth={1.6} color="#4a9eff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cStyles.cardTitle}>{title}</Text>
          <Text style={cStyles.cardDesc}>
            {t('invitation.challengedYou', { name })}
            {ch?.ends_at ? `  ·  ${endsInLabel(ch.ends_at)}` : ''}
          </Text>
        </View>
      </View>
      {!!ch?.prize_label && (
        <View style={[cStyles.statItem, { marginBottom: 12 }]}>
          <Gift size={12} strokeWidth={1.8} color="#4a9eff" />
          <Text style={[cStyles.statText, { color: '#4a9eff' }]}>{ch.prize_label}</Text>
        </View>
      )}
      <View style={cStyles.btnRow}>
        <Pressable
          onPress={onAccept}
          disabled={loading}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={['#4a9eff', '#4a9eff99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cStyles.btnJoin}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <><CheckCircle size={13} strokeWidth={2} color="#fff" /><Text style={cStyles.btnJoinText}>{t('invitation.accept')}</Text></>
            }
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onDecline}
          disabled={loading}
          style={[cStyles.btnViewAll, { borderColor: '#2a2a2a', flex: 1 }]}
        >
          <X size={13} strokeWidth={2} color="#555" />
          <Text style={[cStyles.btnViewAllText, { color: '#555' }]}>{t('invitation.decline')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
