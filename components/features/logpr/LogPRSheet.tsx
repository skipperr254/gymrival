import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { useProfileStore } from '@/store/useProfileStore';
import { logPersonalRecord, fetchBestPRs, uploadPRVideo } from '@/lib/api';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';

interface VideoAsset {
  uri: string;
  thumbnailUri: string;
  durationSec: number;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

// personal_records.value is NUMERIC(8,2) — a value at or beyond this silently
// fails the save (surfaced now via saveError, but better to catch it before
// the request). Comfortably below the column's real ~999999.99 ceiling; no
// legitimate kg/reps/sec entry needs six digits.
const MAX_PR_VALUE = 99999;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LogPRSheet({ visible, onClose }: Props) {
  const { t } = useTranslation('logpr');
  const insets = useSafeAreaInsets();
  // Per-field selectors: this sheet is mounted permanently at the tabs-layout
  // level, so a whole-store subscription re-rendered it (even while closed)
  // on every compete/profile store change anywhere in the app.
  const user = useAuthStore((s) => s.user);
  const exercises = useCompeteStore((s) => s.exercises);
  const loadExercises = useCompeteStore((s) => s.loadExercises);
  const loadRivals = useCompeteStore((s) => s.loadRivals);
  const loadBestPRs = useProfileStore((s) => s.loadBestPRs);
  const loadProfile = useProfileStore((s) => s.loadProfile);
  const loadPRHistory = useProfileStore((s) => s.loadPRHistory);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedExKey, setSelectedExKey] = useState<string | null>(null);
  const [prValue, setPrValue] = useState('');
  const [prMap, setPrMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedValue, setSavedValue] = useState(0);

  // Video upload state
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadDone, setVideoUploadDone] = useState(false);
  const [videoUploadFailed, setVideoUploadFailed] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  // Bumped every time the sheet opens for a new PR. LogPRSheet is mounted
  // once, persistently, at the tabs-layout level (it only toggles `visible`)
  // — a video upload kicked off by handleSave() keeps running after the
  // sheet auto-closes, and if the user reopens it for a second PR before
  // that upload settles, its completion callback must not overwrite the new
  // session's saving/video-upload UI state with the previous PR's result.
  const sessionRef = useRef(0);

  const selectedEx = exercises.find(e => e.key === selectedExKey);
  // parseFloat (not parseInt) — half-plate PR increments (e.g. 82.5kg) are
  // extremely common in barbell training; truncating them would silently
  // misrecord the user's actual result.
  const numValue = parseFloat(prValue);
  const isTooLarge = !isNaN(numValue) && numValue > MAX_PR_VALUE;
  const isValidValue = !!prValue && !isNaN(numValue) && numValue > 0 && !isTooLarge;
  const currentPR = selectedExKey != null ? (prMap[selectedExKey] ?? null) : null;
  const isBelowCurrent = isValidValue && currentPR !== null && numValue <= currentPR;
  const canProceed = !!selectedExKey && isValidValue;

  // Animate sheet in when visible becomes true
  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(SHEET_HEIGHT);
      // Give the Modal a frame to mount before animating
      const raf = requestAnimationFrame(() => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 340,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
          useNativeDriver: true,
        }).start();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, translateY]);

  // Track mount state to avoid setState after unmount during async upload
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset state and load data each time sheet opens
  useEffect(() => {
    if (!visible) {
      clearTimeout(closeTimer.current);
      return;
    }
    sessionRef.current += 1;
    setStep(1);
    setSelectedExKey(null);
    setPrValue('');
    setSaving(false);
    setSaveError(null);
    setVideoAsset(null);
    setVideoUploading(false);
    setVideoUploadDone(false);
    setVideoUploadFailed(false);
    loadExercises();
    if (user?.id) {
      fetchBestPRs(user.id, 100).then(({ data }) => {
        const map: Record<string, number> = {};
        for (const pr of data) map[pr.exercise_key] = pr.value;
        setPrMap(map);
      });
    }
  }, [visible, user?.id, loadExercises]);

  // Auto-close logic:
  // • No video — close after 2.8 s (original behaviour)
  // • Video uploading — wait; close 1.5 s after upload completes
  // • Video failed — close after 3.5 s so user sees the error
  // • Safety net — always close after 15 s maximum
  useEffect(() => {
    if (step !== 3) {
      clearTimeout(closeTimer.current);
      return;
    }
    if (!videoAsset) {
      // No video: original 2.8 s close
      closeTimer.current = setTimeout(onClose, 2800);
    } else if (videoUploadDone) {
      closeTimer.current = setTimeout(onClose, 1500);
    } else if (videoUploadFailed) {
      closeTimer.current = setTimeout(onClose, 3500);
    } else {
      // Video is still uploading; set a 15 s safety-net close
      closeTimer.current = setTimeout(onClose, 15000);
    }
    return () => clearTimeout(closeTimer.current);
  }, [step, onClose, videoAsset, videoUploadDone, videoUploadFailed]);

  const handleSave = useCallback(async () => {
    if (!user?.id || !selectedExKey || !selectedEx || !isValidValue) return;
    const mySession = sessionRef.current;
    setSaving(true);
    setSaveError(null);
    const { data: prData, error } = await logPersonalRecord(user.id, selectedExKey, numValue, selectedEx.unit);

    // The sheet was closed and reopened for a different PR while this was in
    // flight — don't let a stale response touch the new session's state.
    if (sessionRef.current !== mySession) return;

    setSaving(false);
    if (error || !prData) {
      setSaveError(error ?? t('saveError'));
      return;
    }

    setSavedValue(numValue);
    setStep(3);

    // Refresh stores in background so all screens reflect the new PR
    loadRivals(user.id);
    loadBestPRs(user.id);
    loadPRHistory(user.id);
    loadProfile(user.id);

    // If a video was attached, upload it now (continues even if sheet closes)
    if (videoAsset && user.id && prData.id) {
      const uid = user.id;
      const pid = prData.id;
      const asset = videoAsset;
      if (mountedRef.current && sessionRef.current === mySession) setVideoUploading(true);

      const { error: uploadError } = await uploadPRVideo(
        uid,
        pid,
        asset.uri,
        asset.thumbnailUri || null,
        asset.durationSec,
        asset.fileSizeBytes,
        asset.width,
        asset.height,
      );

      // Same guard: the upload itself always completes and correctly tags
      // `pid` regardless (that part can't cross-contaminate), but the UI
      // feedback (spinner/"saved"/"failed") must only apply to whichever
      // session is currently on screen.
      if (mountedRef.current && sessionRef.current === mySession) {
        setVideoUploading(false);
        if (uploadError) {
          setVideoUploadFailed(true);
        } else {
          setVideoUploadDone(true);
        }
      }
    }
  }, [user?.id, selectedExKey, selectedEx, isValidValue, numValue, videoAsset, loadRivals, loadBestPRs, loadPRHistory, loadProfile, t]);

  // Drag-to-dismiss on the handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black/[0.78] justify-end">
        {/* Backdrop tap-to-close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View
            className="bg-surface rounded-t-[22px] overflow-hidden"
            style={{
              height: SHEET_HEIGHT,
              paddingBottom: Math.max(insets.bottom + 16, 28),
              transform: [{ translateY }],
            }}
          >

            {/* ── Draggable header ────────────────────────────────────── */}
            <View
              {...panResponder.panHandlers}
              className="px-5 pt-3 pb-3.5 bg-surface rounded-t-[22px]"
              style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderDefault }}
            >
              <View className="w-9 h-1 rounded-full bg-[#3a3a3a] self-center mb-3.5" />

              <View className="flex-row justify-between items-center mb-3.5">
                <View className="flex-row items-center gap-2">
                  {step === 2 && (
                    <Pressable onPress={() => setStep(1)} hitSlop={14} className="mr-0.5">
                      <ChevronLeft size={22} strokeWidth={2.2} color="#888" />
                    </Pressable>
                  )}
                  <View>
                    {step < 3 && (
                      <Text className="font-heading text-[9px] tracking-[2.5px] text-muted mb-[3px]">
                        {t('step.stepOf', { step })}
                      </Text>
                    )}
                    <Text className="font-heading text-[22px] tracking-[1px] text-primary leading-6">
                      {step === 1 ? t('step.logYourPr') : step === 2 ? t('step.addProof') : ''}
                    </Text>
                  </View>
                </View>
                {step < 3 && (
                  <Pressable
                    onPress={onClose}
                    hitSlop={8}
                    className="w-8 h-8 rounded-2xl bg-elevated items-center justify-center"
                  >
                    <X size={16} strokeWidth={2.8} color="#888" />
                  </Pressable>
                )}
              </View>

              {step < 3 && (
                <View className="flex-row gap-1.5">
                  <View
                    className={`flex-1 h-[3px] rounded-full ${step >= 1 ? 'bg-accent' : 'bg-elevated'}`}
                  />
                  <View
                    className={`flex-1 h-[3px] rounded-full ${step >= 2 ? 'bg-accent' : 'bg-elevated'}`}
                  />
                </View>
              )}
            </View>

            {/* ── Scrollable content ───────────────────────────────────── */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              {step === 1 && (
                <Step1
                  exercises={exercises}
                  selectedExKey={selectedExKey}
                  onSelectEx={setSelectedExKey}
                  prValue={prValue}
                  onChangePR={setPrValue}
                  currentPR={currentPR}
                  isBelowCurrent={isBelowCurrent}
                  isTooLarge={isTooLarge}
                  selectedEx={selectedEx}
                  canProceed={canProceed}
                  onNext={() => setStep(2)}
                  prMap={prMap}
                />
              )}
              {step === 2 && selectedEx && (
                <Step2
                  selectedEx={selectedEx}
                  prValue={prValue}
                  currentPR={currentPR}
                  saving={saving}
                  saveError={saveError}
                  videoAsset={videoAsset}
                  onVideoSelected={setVideoAsset}
                  onVideoRemoved={() => setVideoAsset(null)}
                  onSave={handleSave}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && selectedEx && (
                <Step3
                  exercise={selectedEx}
                  savedValue={savedValue}
                  hasVideo={!!videoAsset}
                  videoUploading={videoUploading}
                  videoUploadDone={videoUploadDone}
                  videoUploadFailed={videoUploadFailed}
                />
              )}
            </ScrollView>
          </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
  },
});
