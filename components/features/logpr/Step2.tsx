import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import { VideoUploadZone } from '@/components/features/VideoUploadZone';
import { getExerciseIcon } from '@/constants/exerciseIcons';

export interface VideoAssetShape {
  uri: string;
  thumbnailUri: string;
  durationSec: number;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
}

interface Step2Props {
  selectedEx: ExerciseType;
  prValue: string;
  currentPR: number | null;
  saving: boolean;
  saveError: string | null;
  videoAsset: VideoAssetShape | null;
  onVideoSelected: (asset: VideoAssetShape) => void;
  onVideoRemoved: () => void;
  onSave: () => void;
  onBack: () => void;
}

export function Step2({
  selectedEx, prValue, currentPR, saving, saveError,
  videoAsset, onVideoSelected, onVideoRemoved,
  onSave,
}: Step2Props) {
  const { t } = useTranslation('logpr');
  const ExIcon = getExerciseIcon(selectedEx.key);
  const hasVideo = !!videoAsset;
  const xpLabel = hasVideo ? t('xpWithVideo') : t('xpWithoutVideo');

  return (
    <>
      {/* PR summary card */}
      <View className="flex-row items-center justify-between bg-[rgba(230,48,48,0.06)] border border-[rgba(230,48,48,0.2)] rounded-[14px] py-3.5 px-4 mb-4">
        <View className="gap-[3px]">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <ExIcon size={14} strokeWidth={1.8} color="#888" />
            <Text className="font-sans-medium text-[13px] text-[#999]">{selectedEx.label}</Text>
          </View>
          <Text className="font-sans text-[11px] text-muted">
            {currentPR != null ? t('previousWithValue', { value: currentPR, unit: selectedEx.unit }) : t('firstPr')}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-heading text-4xl text-accent leading-9">{prValue}</Text>
          <Text className="font-heading text-[11px] text-accent tracking-[1px]">
            {selectedEx.unit.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* XP indicators — active state follows video selection */}
      <View className="flex-row gap-2 mb-4">
        <View
          className={`flex-1 rounded-xl py-2.5 items-center gap-[3px] border ${
            hasVideo ? 'bg-[#1a1a1a] border-[#333]' : 'bg-transparent border-[#222]'
          }`}
        >
          <Text
            className={`font-heading text-[13px] tracking-[1px] ${hasVideo ? 'text-accent' : 'text-[#444]'}`}
          >
            {t('xpWithVideo')}
          </Text>
          <Text className="font-sans text-[10px] text-muted">{t('withVideo')}</Text>
        </View>
        <View
          className={`flex-1 rounded-xl py-2.5 items-center gap-[3px] border ${
            !hasVideo ? 'bg-[#1a1a1a] border-[#333]' : 'bg-transparent border-[#222]'
          }`}
        >
          <Text
            className={`font-heading text-[13px] tracking-[1px] ${!hasVideo ? 'text-accent' : 'text-[#444]'}`}
          >
            {t('xpWithoutVideo')}
          </Text>
          <Text className="font-sans text-[10px] text-muted">{t('withoutVideo')}</Text>
        </View>
      </View>

      {/* Video upload zone */}
      <View className="mb-4">
        <VideoUploadZone
          asset={videoAsset}
          onVideoSelected={onVideoSelected}
          onVideoRemoved={onVideoRemoved}
          disabled={saving}
        />
      </View>

      {!!saveError && (
        <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.1)] rounded-[10px] p-3 mb-3">
          <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-accent flex-1">{saveError}</Text>
        </View>
      )}

      {/* Primary save button */}
      <Pressable
        onPress={onSave}
        disabled={saving}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 16,
            paddingVertical: 17,
            marginBottom: 10,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <CheckCircle size={16} strokeWidth={2} color={Colors.primary} />
              <Text className="font-heading text-sm tracking-[2.5px] text-white">
                {t('savePr', { xp: xpLabel })}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {hasVideo && (
        <Pressable
          onPress={onVideoRemoved}
          disabled={saving}
          className="items-center py-3"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text className="font-sans text-[13px] text-muted">{t('removeVideoSave')}</Text>
        </Pressable>
      )}
    </>
  );
}
