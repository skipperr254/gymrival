import { useCallback } from 'react';
import { View, Text, Pressable, Switch, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertCircle, Lock, Video, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import type { ExerciseType } from '@/types/pr';
import type { ProFeature } from '@/constants/entitlements';
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
  /** Resolved once in LogPRSheet so both gates and the save path agree. */
  isPro: boolean;
  publish: boolean;
  onTogglePublish: (value: boolean) => void;
  /** Closes this sheet first, then opens the paywall — see LogPRSheet. */
  onRequestUpgrade: (feature: ProFeature) => void;
}

/** A locked row standing in for a Pro-only control. Taps through to the paywall. */
function LockedRow({
  icon: Icon,
  title,
  sub,
  onPress,
}: {
  icon: typeof Video;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  const { t } = useTranslation('logpr');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-3 bg-[#1a1a1a] border border-[#2e2a2a] rounded-2xl px-4 py-3.5 mb-2.5"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View className="w-10 h-10 rounded-xl bg-[rgba(230,48,48,0.1)] items-center justify-center">
        <Icon size={18} strokeWidth={1.8} color={Colors.accent} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-sans-semibold text-[13px] text-primary">{title}</Text>
          <View className="bg-accent rounded-full px-1.5 py-px">
            <Text className="font-heading text-[8px] text-primary tracking-[1px]">
              {t('gate.proBadge')}
            </Text>
          </View>
        </View>
        <Text className="font-sans text-[11px] text-[#707070] mt-px">{sub}</Text>
      </View>
      <Lock size={15} strokeWidth={2} color={Colors.hint} />
    </Pressable>
  );
}

export function Step2({
  selectedEx, prValue, currentPR, saving, saveError,
  videoAsset, onVideoSelected, onVideoRemoved,
  onSave, isPro, publish, onTogglePublish, onRequestUpgrade,
}: Step2Props) {
  const { t } = useTranslation('logpr');
  const ExIcon = getExerciseIcon(selectedEx.key);

  // Hoisted out of JSX: these are feature identifiers, not copy, but inline
  // they trip the i18next no-literal-string rule.
  const upgradeForVideo = useCallback(() => onRequestUpgrade('prVideo'), [onRequestUpgrade]);
  const upgradeForPublish = useCallback(() => onRequestUpgrade('publishPR'), [onRequestUpgrade]);

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

      {/* XP reward indicator */}
      <View className="flex-row justify-center rounded-xl py-2.5 mb-4 border bg-[#1a1a1a] border-[#333]">
        <Text className="font-heading text-[13px] tracking-[1px] text-accent">
          {t('xpReward')}
        </Text>
      </View>

      {/* ── Video proof — Pro ───────────────────────────────────────────── */}
      {isPro ? (
        <View className="mb-2.5">
          <VideoUploadZone
            asset={videoAsset}
            onVideoSelected={onVideoSelected}
            onVideoRemoved={onVideoRemoved}
            disabled={saving}
          />
        </View>
      ) : (
        <LockedRow
          icon={Video}
          title={t('gate.videoLockedTitle')}
          sub={t('gate.videoLockedSub')}
          onPress={upgradeForVideo}
        />
      )}

      {/* ── Share to the feed — Pro ─────────────────────────────────────── */}
      {isPro ? (
        <View className="flex-row items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 mb-2.5">
          <View className="w-10 h-10 rounded-xl bg-[rgba(230,48,48,0.1)] items-center justify-center">
            <Globe size={18} strokeWidth={1.8} color={Colors.accent} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-[13px] text-primary">
              {t('gate.publishTitle')}
            </Text>
            <Text className="font-sans text-[11px] text-[#707070] mt-px">
              {publish ? t('gate.publishSub') : t('gate.publishOffSub')}
            </Text>
          </View>
          <Switch
            value={publish}
            onValueChange={onTogglePublish}
            disabled={saving}
            trackColor={{ false: Colors.elevated, true: Colors.accent }}
            thumbColor={Colors.primary}
            ios_backgroundColor={Colors.elevated}
          />
        </View>
      ) : (
        <LockedRow
          icon={Globe}
          title={t('gate.publishTitle')}
          sub={t('gate.publishLockedSub')}
          onPress={upgradeForPublish}
        />
      )}

      {/* Reassurance: a private PR is not a lesser PR. It still ranks. */}
      {!isPro && (
        <Text className="font-sans text-[11px] text-muted text-center mb-3 px-2 leading-4">
          {t('gate.privateNote')}
        </Text>
      )}

      {!!saveError && (
        <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.1)] rounded-[10px] p-3 mb-3">
          <AlertCircle size={14} strokeWidth={2} color={Colors.accent} />
          <Text className="font-sans text-[13px] text-accent flex-1">{saveError}</Text>
        </View>
      )}

      {/* Video is no longer required to save. It could not stay required once
          video proof became Pro-only — a free user would have been unable to
          log a PR at all, and logging is explicitly free. */}
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
                {t('savePr')}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </>
  );
}
