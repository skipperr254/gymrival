import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Zap, VideoOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import { getExerciseIcon } from '@/constants/exerciseIcons';

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
  const ExIcon = getExerciseIcon(exercise.key);
  const xpEarned = hasVideo && videoUploadDone ? t('xpEarnedWithVideo') : t('xpEarnedWithoutVideo');

  return (
    <View className="items-center pt-6 pb-4">
      {/* Trophy icon with glow ring — shows spinner while video uploads */}
      <View className="w-24 h-24 rounded-full border-2 border-[rgba(230,48,48,0.3)] items-center justify-center mb-5">
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          {videoUploading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <Trophy size={36} strokeWidth={1.4} color={Colors.primary} />
          )}
        </LinearGradient>
      </View>

      <Text className="font-heading text-[32px] tracking-[4px] text-primary mb-1.5">
        {t('prSaved')}
      </Text>
      <Text className="font-heading text-[15px] tracking-[2px] text-accent mb-6">{xpEarned}</Text>

      {/* PR card */}
      <View className="w-full bg-[rgba(230,48,48,0.06)] border border-[rgba(230,48,48,0.22)] rounded-2xl py-5 px-6 items-center mb-5 gap-1">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <ExIcon size={14} strokeWidth={1.8} color="#888" />
          <Text className="font-heading text-xs tracking-[2px] text-[#666]">
            {exercise.label.toUpperCase()}
          </Text>
        </View>
        <Text className="font-heading text-[9px] tracking-[3px] text-muted mb-1">
          {t('newBest')}
        </Text>
        <View className="flex-row items-end gap-1.5">
          <Text className="font-heading text-accent text-[52px] leading-[52px]">{savedValue}</Text>
          <Text className="font-heading text-base text-[#999] pb-1.5">{exercise.unit}</Text>
        </View>
      </View>

      {/* Video upload status row */}
      {hasVideo && (
        <View className="flex-row items-center gap-[7px] mb-3.5">
          {videoUploading && (
            <>
              <ActivityIndicator size="small" color={Colors.muted} />
              <Text className="font-sans text-[11px] text-muted">{t('uploadingVideoProof')}</Text>
            </>
          )}
          {videoUploadDone && (
            <>
              <Zap size={13} strokeWidth={2} color={Colors.success} />
              <Text className="font-sans text-[11px] text-success">{t('videoProofSaved')}</Text>
            </>
          )}
          {videoUploadFailed && (
            <>
              <VideoOff size={13} strokeWidth={2} color={Colors.muted} />
              <Text className="font-sans text-[11px] text-muted">{t('videoUploadFailed')}</Text>
            </>
          )}
        </View>
      )}

      <View className="flex-row items-center gap-2">
        <Zap size={13} strokeWidth={2} color={Colors.accent} />
        <Text className="font-sans text-xs text-muted">{t('addedToLeaderboard')}</Text>
        <Zap size={13} strokeWidth={2} color={Colors.accent} />
      </View>
    </View>
  );
}
