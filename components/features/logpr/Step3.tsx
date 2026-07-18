import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Zap, VideoOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import { getIcon } from './icons';

interface Step3Props {
  exercise: ExerciseType;
  savedValue: number;
  hasVideo: boolean;
  videoUploading: boolean;
  videoUploadDone: boolean;
  videoUploadFailed: boolean;
}

export function Step3({ exercise, savedValue, hasVideo, videoUploading, videoUploadDone, videoUploadFailed }: Step3Props) {
  const { t } = useTranslation('logpr');
  const ExIcon = getIcon(exercise.key);
  const xpEarned = hasVideo && videoUploadDone ? t('xpEarnedWithVideo') : t('xpEarnedWithoutVideo');

  return (
    <View style={s3.container}>
      {/* Trophy icon with glow ring — shows spinner while video uploads */}
      <View style={s3.trophyRing}>
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={s3.trophyBg}
        >
          {videoUploading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Trophy size={36} strokeWidth={1.4} color="#fff" />
          )}
        </LinearGradient>
      </View>

      <Text style={s3.heading}>{t('prSaved')}</Text>
      <Text style={s3.xpLabel}>{xpEarned}</Text>

      {/* PR card */}
      <View style={s3.prCard}>
        <View style={s3.prCardHeader}>
          <ExIcon size={14} strokeWidth={1.8} color="#888" />
          <Text style={s3.prCardExercise}>{exercise.label.toUpperCase()}</Text>
        </View>
        <Text style={s3.prCardLabel}>{t('newBest')}</Text>
        <View style={s3.prCardValueRow}>
          <Text style={s3.prCardValue}>{savedValue}</Text>
          <Text style={s3.prCardUnit}>{exercise.unit}</Text>
        </View>
      </View>

      {/* Video upload status row */}
      {hasVideo && (
        <View style={s3.videoStatusRow}>
          {videoUploading && (
            <>
              <ActivityIndicator size="small" color="#555" />
              <Text style={s3.videoStatusText}>{t('uploadingVideoProof')}</Text>
            </>
          )}
          {videoUploadDone && (
            <>
              <Zap size={13} strokeWidth={2} color={Colors.success} />
              <Text style={[s3.videoStatusText, { color: Colors.success }]}>{t('videoProofSaved')}</Text>
            </>
          )}
          {videoUploadFailed && (
            <>
              <VideoOff size={13} strokeWidth={2} color="#555" />
              <Text style={s3.videoStatusText}>{t('videoUploadFailed')}</Text>
            </>
          )}
        </View>
      )}

      <View style={s3.celebRow}>
        <Zap size={13} strokeWidth={2} color={Colors.accent} />
        <Text style={s3.celebText}>{t('addedToLeaderboard')}</Text>
        <Zap size={13} strokeWidth={2} color={Colors.accent} />
      </View>
    </View>
  );
}

const s3 = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  trophyRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(230,48,48,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  trophyBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 32,
    letterSpacing: 4,
    color: Colors.primary,
    marginBottom: 6,
  },
  xpLabel: {
    fontFamily: Fonts.display,
    fontSize: 15,
    letterSpacing: 2,
    color: Colors.accent,
    marginBottom: 24,
  },
  prCard: {
    width: '100%',
    backgroundColor: 'rgba(230,48,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.22)',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  prCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  prCardExercise: {
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    color: '#666',
  },
  prCardLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 3,
    color: '#555',
    marginBottom: 4,
  },
  prCardValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  prCardValue: {
    fontFamily: Fonts.display,
    fontSize: 52,
    color: Colors.accent,
    lineHeight: 52,
  },
  prCardUnit: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#999',
    paddingBottom: 6,
  },
  videoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  videoStatusText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  celebRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  celebText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#555',
  },
});
