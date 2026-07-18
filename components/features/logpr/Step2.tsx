import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import { VideoUploadZone } from '@/components/features/VideoUploadZone';
import { getIcon } from './icons';

export interface VideoAssetShape {
  uri: string;
  thumbnailUri: string;
  durationSec: number;
  fileSizeBytes: number;
}

interface Step2Props {
  selectedEx: ExerciseType;
  prValue: string;
  currentPR: number | null;
  saving: boolean;
  videoAsset: VideoAssetShape | null;
  onVideoSelected: (asset: VideoAssetShape) => void;
  onVideoRemoved: () => void;
  onSave: () => void;
  onBack: () => void;
}

export function Step2({
  selectedEx, prValue, currentPR, saving,
  videoAsset, onVideoSelected, onVideoRemoved,
  onSave,
}: Step2Props) {
  const { t } = useTranslation('logpr');
  const ExIcon = getIcon(selectedEx.key);
  const hasVideo = !!videoAsset;
  const xpLabel = hasVideo ? t('xpWithVideo') : t('xpWithoutVideo');

  return (
    <>
      {/* PR summary card */}
      <View style={s2.summaryCard}>
        <View style={{ gap: 3 }}>
          <View style={s2.summaryRow}>
            <ExIcon size={14} strokeWidth={1.8} color="#888" />
            <Text style={s2.summaryExercise}>{selectedEx.label}</Text>
          </View>
          <Text style={s2.summaryPrev}>
            {currentPR != null ? t('previousWithValue', { value: currentPR, unit: selectedEx.unit }) : t('firstPr')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s2.summaryValue}>{prValue}</Text>
          <Text style={s2.summaryUnit}>{selectedEx.unit.toUpperCase()}</Text>
        </View>
      </View>

      {/* XP indicators — active state follows video selection */}
      <View style={s2.xpRow}>
        <View style={[s2.xpCard, hasVideo ? s2.xpCardActive : s2.xpCardInactive]}>
          <Text style={[s2.xpAmount, hasVideo && { color: Colors.accent }]}>{t('xpWithVideo')}</Text>
          <Text style={s2.xpLabel}>{t('withVideo')}</Text>
        </View>
        <View style={[s2.xpCard, !hasVideo ? s2.xpCardActive : s2.xpCardInactive]}>
          <Text style={[s2.xpAmount, !hasVideo && { color: Colors.accent }]}>{t('xpWithoutVideo')}</Text>
          <Text style={s2.xpLabel}>{t('withoutVideo')}</Text>
        </View>
      </View>

      {/* Video upload zone */}
      <View style={{ marginBottom: 16 }}>
        <VideoUploadZone
          asset={videoAsset}
          onVideoSelected={onVideoSelected}
          onVideoRemoved={onVideoRemoved}
          disabled={saving}
        />
      </View>

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
          style={s2.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle size={16} strokeWidth={2} color="#fff" />
              <Text style={s2.saveBtnText}>{t('savePr', { xp: xpLabel })}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {hasVideo && (
        <Pressable
          onPress={onVideoRemoved}
          disabled={saving}
          style={({ pressed }) => [s2.skipBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s2.skipBtnText}>{t('removeVideoSave')}</Text>
        </Pressable>
      )}
    </>
  );
}

const s2 = StyleSheet.create({
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(230,48,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.2)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  summaryExercise: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: '#999',
  },
  summaryPrev: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: '#555',
  },
  summaryValue: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: Colors.accent,
    lineHeight: 36,
  },
  summaryUnit: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 1,
  },
  xpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  xpCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
  },
  xpCardActive: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  xpCardInactive: {
    backgroundColor: 'transparent',
    borderColor: '#222',
  },
  xpAmount: {
    fontFamily: Fonts.display,
    fontSize: 13,
    letterSpacing: 1,
    color: '#444',
  },
  xpLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#555',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 17,
    marginBottom: 10,
  },
  saveBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 2.5,
    color: '#fff',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555',
  },
});
