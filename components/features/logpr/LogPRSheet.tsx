import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { useProfileStore } from '@/store/useProfileStore';
import { logPersonalRecord, fetchBestPRs, uploadPRVideo } from '@/lib/api';
import { showPaywall } from '@/lib/billing';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useKeyboardOverlap } from '@/hooks/useKeyboardOverlap';
import { FEATURE_TRIGGER, type ProFeature } from '@/constants/entitlements';
import type { PRVisibility } from '@/types/pr';
import type { PickedVideoAsset } from '@/lib/media/pickVideoAsset';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { LogPRSheetHeader } from './LogPRSheetHeader';

type VideoAsset = PickedVideoAsset;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

// personal_records.value is NUMERIC(8,2) — a value at or beyond this silently
// fails the save (surfaced now via saveError, but better to catch it before
// the request). Comfortably below the column's real ~999999.99 ceiling; no
// legitimate kg/reps/sec entry needs six digits.
const MAX_PR_VALUE = 99999;

// Mirrors LogSheet: iOS keeps a Modal's host view mounted until the OS reports
// the dismissal. If that report never arrives we still have to proceed, or a
// queued paywall never opens and the lock row looks dead.
const DISMISS_CONFIRM_TIMEOUT_MS = 400;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LogPRSheet({ visible, onClose }: Props) {
  const { t } = useTranslation('logpr');
  const insets = useSafeAreaInsets();
  // Android edge-to-edge: the keyboard covers the sheet instead of resizing it.
  const keyboard = useKeyboardOverlap(SCREEN_HEIGHT);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (keyboard.overlap > 0) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [keyboard.overlap]);
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
  // What the server actually stored, not what we asked for — a free user's
  // 'public' request comes back as 'private' (migration 054).
  const [savedVisibility, setSavedVisibility] = useState<PRVisibility>('private');

  const { isPro } = useEntitlement();
  // Pro's per-PR switch, defaulted to public. Free users have no switch and
  // the server forces private regardless of what the client sends.
  const [publish, setPublish] = useState(true);

  // Video upload state
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadDone, setVideoUploadDone] = useState(false);
  const [videoUploadFailed, setVideoUploadFailed] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  // Latest `visible`, readable from an exit animation callback that can
  // resolve after the prop has already flipped back — see the effect below.
  const visibleRef = useRef(visible);
  // Bumped every time the sheet opens for a new PR. LogPRSheet is mounted
  // once, persistently, at the tabs-layout level (it only toggles `visible`)
  // — a video upload kicked off by handleSave() keeps running after the
  // sheet auto-closes, and if the user reopens it for a second PR before
  // that upload settles, its completion callback must not overwrite the new
  // session's saving/video-upload UI state with the previous PR's result.
  const sessionRef = useRef(0);

  // A gate tapped inside this sheet must not open the paywall on top of it:
  // two live RN <Modal>s make UIKit silently drop the second presentation and
  // leave an invisible, touch-eating view (see app/(tabs)/_layout.tsx). So the
  // request is parked, the sheet closes, and the paywall opens only once the
  // dismissal is confirmed.
  const pendingPaywall = useRef<ProFeature | null>(null);
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const firePendingPaywall = useCallback(() => {
    clearTimeout(dismissTimeout.current);
    const feature = pendingPaywall.current;
    pendingPaywall.current = null;
    if (feature) showPaywall({ trigger: FEATURE_TRIGGER[feature] });
  }, []);

  const requestUpgrade = useCallback((feature: ProFeature) => {
    pendingPaywall.current = feature;
    onClose();
  }, [onClose]);

  useEffect(() => () => clearTimeout(dismissTimeout.current), []);

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
    visibleRef.current = visible;

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
      }).start(() => {
        // Deliberately not gated on `finished`. Any interruption — a reopen,
        // the value being reset, the native driver dropping the animation
        // while the modal is mid-transition — left `mounted` stuck true, and
        // a transparent Modal that never unmounts is exactly what makes iOS
        // stop responding to touches (it stays an overFullScreen view
        // controller sitting over the app). Re-read `visible` instead, so a
        // reopen still wins the race.
        if (visibleRef.current) return;
        setMounted(false);
        if (Platform.OS === 'ios') {
          // Wait for the real dismissal (Modal onDismiss below); the timeout
          // is the fallback so a missed callback can't strand the paywall.
          dismissTimeout.current = setTimeout(firePendingPaywall, DISMISS_CONFIRM_TIMEOUT_MS);
        } else {
          firePendingPaywall();
        }
      });
    }
  }, [visible, translateY, firePendingPaywall]);

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
    setPublish(true);
    setSavedVisibility('private');
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
  // • No video (the free-tier path) — nothing to wait for, close promptly
  // • Video uploading — wait; close 1.5 s after upload completes
  // • Video failed — close after 3.5 s so user sees the error
  // • Safety net — always close after 15 s maximum
  useEffect(() => {
    if (step !== 3) {
      clearTimeout(closeTimer.current);
      return;
    }
    if (!videoAsset) {
      closeTimer.current = setTimeout(onClose, 1800);
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
    // Non-Pro callers always send 'private'; even if they didn't, the database
    // trigger would store it that way. The response tells us what was really
    // saved, which is what Step 3 reports back to the user.
    const { data: prData, error } = await logPersonalRecord(
      user.id,
      selectedExKey,
      numValue,
      selectedEx.unit,
      isPro && publish ? 'public' : 'private'
    );

    // The sheet was closed and reopened for a different PR while this was in
    // flight — don't let a stale response touch the new session's state.
    if (sessionRef.current !== mySession) return;

    setSaving(false);
    if (error || !prData) {
      setSaveError(error ?? t('saveError'));
      return;
    }

    setSavedValue(numValue);
    setSavedVisibility(prData.visibility);
    setStep(3);

    // Refresh stores in background so all screens reflect the new PR
    loadRivals(user.id);
    loadBestPRs(user.id);
    loadPRHistory(user.id);
    loadProfile(user.id);

    // Upload the video if one was attached — continues even if the sheet
    // closes. Video proof is Pro-only, so this is skipped entirely on the
    // free path.
    if (!videoAsset) return;
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
  }, [user?.id, selectedExKey, selectedEx, isValidValue, numValue, videoAsset, isPro, publish, loadRivals, loadBestPRs, loadPRHistory, loadProfile, t]);

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
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={firePendingPaywall}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/[0.78] justify-end" onLayout={keyboard.onLayout}>
        {/* Backdrop tap-to-close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View
            className="bg-surface rounded-t-[22px] overflow-hidden"
            style={{
              height: Math.min(SHEET_HEIGHT, keyboard.height - insets.top),
              paddingBottom: keyboard.overlap > 0 ? keyboard.overlap : Math.max(insets.bottom + 16, 28),
              transform: [{ translateY }],
            }}
          >

            {/* ── Draggable header ────────────────────────────────────── */}
            <LogPRSheetHeader
              step={step}
              panHandlers={panResponder.panHandlers}
              onBack={() => setStep(1)}
              onClose={onClose}
            />

            {/* ── Scrollable content ───────────────────────────────────── */}
            <ScrollView
              className="flex-1"
              ref={scrollRef}
              contentContainerClassName="p-5 pb-4"
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
                  isPro={isPro}
                  publish={publish}
                  onTogglePublish={setPublish}
                  onRequestUpgrade={requestUpgrade}
                />
              )}
              {step === 3 && selectedEx && (
                <Step3
                  exercise={selectedEx}
                  savedValue={savedValue}
                  visibility={savedVisibility}
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
