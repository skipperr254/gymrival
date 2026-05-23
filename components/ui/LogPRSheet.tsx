import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  ChevronLeft,
  Dumbbell,
  TrendingUp,
  Activity,
  Target,
  Timer,
  Trophy,
  Video,
  Upload,
  CheckCircle,
  AlertTriangle,
  Zap,
  Star,
  BarChart2,
  Repeat,
  PersonStanding,
} from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCompeteStore } from '@/store/useCompeteStore';
import { logPersonalRecord, fetchBestPRs } from '@/lib/api';
import type { ExerciseType } from '@/types/pr';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;

type LucideIcon = typeof Dumbbell;

const EXERCISE_ICON_MAP: Record<string, LucideIcon> = {
  bench:     Dumbbell,
  squat:     Activity,
  deadlift:  BarChart2,
  pullups:   TrendingUp,
  overhead:  Dumbbell,
  bulgarian: PersonStanding,
  rdl:       Dumbbell,
  incline:   TrendingUp,
  dips:      Repeat,
  row:       Dumbbell,
  curl:      Dumbbell,
  legpress:  Activity,
  lunge:     PersonStanding,
  facepull:  Target,
  hipthrust: Dumbbell,
  plank:     Timer,
  muscle_up: Star,
};

function getIcon(key: string): LucideIcon {
  return EXERCISE_ICON_MAP[key] ?? Dumbbell;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LogPRSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { exercises, loadExercises } = useCompeteStore();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedExKey, setSelectedExKey] = useState<string | null>(null);
  const [prValue, setPrValue] = useState('');
  const [prMap, setPrMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [savedValue, setSavedValue] = useState(0);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selectedEx = exercises.find(e => e.key === selectedExKey);
  const numValue = parseInt(prValue, 10);
  const isValidValue = !!prValue && !isNaN(numValue) && numValue > 0;
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

  // Reset state and load data each time sheet opens
  useEffect(() => {
    if (!visible) {
      clearTimeout(closeTimer.current);
      return;
    }
    setStep(1);
    setSelectedExKey(null);
    setPrValue('');
    setSaving(false);
    loadExercises();
    if (user?.id) {
      fetchBestPRs(user.id, 100).then(({ data }) => {
        const map: Record<string, number> = {};
        for (const pr of data) map[pr.exercise_key] = pr.value;
        setPrMap(map);
      });
    }
  }, [visible, user?.id, loadExercises]);

  // Auto-close 2.8 s after success
  useEffect(() => {
    if (step === 3) {
      closeTimer.current = setTimeout(onClose, 2800);
    }
    return () => clearTimeout(closeTimer.current);
  }, [step, onClose]);

  const handleSave = useCallback(async () => {
    if (!user?.id || !selectedExKey || !selectedEx || !isValidValue) return;
    setSaving(true);
    const { error } = await logPersonalRecord(user.id, selectedExKey, numValue, selectedEx.unit);
    setSaving(false);
    if (!error) {
      setSavedValue(numValue);
      setStep(3);
    }
  }, [user?.id, selectedExKey, selectedEx, isValidValue, numValue]);

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
      <View style={styles.overlay}>
        {/* Backdrop tap-to-close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 16, 28), transform: [{ translateY }] }]}>

            {/* ── Draggable header ────────────────────────────────────── */}
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  {step === 2 && (
                    <Pressable onPress={() => setStep(1)} hitSlop={14} style={styles.backBtn}>
                      <ChevronLeft size={22} strokeWidth={2.2} color="#888" />
                    </Pressable>
                  )}
                  <View>
                    {step < 3 && (
                      <Text style={styles.stepLabel}>STEP {step} OF 2</Text>
                    )}
                    <Text style={styles.stepTitle}>
                      {step === 1 ? 'Log Your PR' : step === 2 ? 'Add Proof' : ''}
                    </Text>
                  </View>
                </View>
                {step < 3 && (
                  <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                    <X size={16} strokeWidth={2.8} color="#888" />
                  </Pressable>
                )}
              </View>

              {step < 3 && (
                <View style={styles.progressRow}>
                  <View style={[styles.progressSeg, step >= 1 && styles.progressActive]} />
                  <View style={[styles.progressSeg, step >= 2 && styles.progressActive]} />
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
                  onSave={handleSave}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && selectedEx && (
                <Step3
                  exercise={selectedEx}
                  savedValue={savedValue}
                />
              )}
            </ScrollView>
          </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  exercises: ExerciseType[];
  selectedExKey: string | null;
  onSelectEx: (key: string) => void;
  prValue: string;
  onChangePR: (v: string) => void;
  currentPR: number | null;
  isBelowCurrent: boolean;
  selectedEx: ExerciseType | undefined;
  canProceed: boolean;
  onNext: () => void;
  prMap: Record<string, number>;
}

function Step1({ exercises, selectedExKey, onSelectEx, prValue, onChangePR, currentPR, isBelowCurrent, selectedEx, canProceed, onNext, prMap }: Step1Props) {
  return (
    <>
      <Text style={s1.sectionLabel}>SELECT EXERCISE</Text>

      <View style={s1.grid}>
        {exercises.map(ex => {
          const active = selectedExKey === ex.key;
          const ExIcon = getIcon(ex.key);
          const exPR = prMap[ex.key];
          return (
            <Pressable
              key={ex.key}
              onPress={() => onSelectEx(ex.key)}
              style={({ pressed }) => [
                s1.exCard,
                active && s1.exCardActive,
                pressed && !active && { opacity: 0.7 },
              ]}
            >
              <View style={[s1.iconWrap, active && s1.iconWrapActive]}>
                <ExIcon size={18} strokeWidth={1.8} color={active ? Colors.accent : '#666'} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s1.exLabel, active && s1.exLabelActive]} numberOfLines={1}>
                  {ex.label}
                </Text>
                <Text style={s1.exPR}>
                  {exPR != null ? `PR  ${exPR} ${ex.unit}` : 'No PR yet'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedExKey && selectedEx && (
        <View style={s1.inputSection}>
          <Text style={s1.sectionLabel}>YOUR NEW PR</Text>
          <View style={[s1.inputRow, !!prValue && s1.inputRowActive]}>
            <TextInput
              value={prValue}
              onChangeText={onChangePR}
              placeholder={currentPR != null ? String(currentPR + 5) : '0'}
              placeholderTextColor="#444"
              keyboardType="numeric"
              returnKeyType="done"
              autoFocus
              style={s1.input}
            />
            <Text style={s1.unit}>{selectedEx.unit.toUpperCase()}</Text>
          </View>
          {isBelowCurrent && (
            <View style={s1.warnRow}>
              <AlertTriangle size={12} strokeWidth={2} color={Colors.warning} />
              <Text style={s1.warnText}>
                {'Not higher than your current PR (' + currentPR + ' ' + selectedEx.unit + ')'}
              </Text>
            </View>
          )}
        </View>
      )}

      <Pressable
        onPress={() => canProceed && onNext()}
        disabled={!canProceed}
        style={({ pressed }) => [pressed && canProceed && { opacity: 0.85 }]}
      >
        {canProceed ? (
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s1.nextBtn}
          >
            <Text style={s1.nextBtnText}>NEXT — ADD PROOF</Text>
            <TrendingUp size={16} strokeWidth={2} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[s1.nextBtn, s1.nextBtnDisabled]}>
            <Text style={[s1.nextBtnText, s1.nextBtnTextDisabled]}>NEXT — ADD PROOF</Text>
          </View>
        )}
      </Pressable>
    </>
  );
}

const s1 = StyleSheet.create({
  sectionLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#555',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  exCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.base,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  exCardActive: {
    backgroundColor: 'rgba(230,48,48,0.08)',
    borderColor: Colors.accent,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(230,48,48,0.12)',
  },
  exLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  exLabelActive: {
    color: Colors.accent,
  },
  exPR: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#555',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.base,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  inputRowActive: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 42,
    color: Colors.primary,
    padding: 0,
  },
  unit: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#555',
    letterSpacing: 1,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  warnText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.warning,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 17,
  },
  nextBtnDisabled: {
    backgroundColor: '#2a2a2a',
  },
  nextBtnText: {
    fontFamily: Fonts.display,
    fontSize: 14,
    letterSpacing: 2.5,
    color: '#fff',
  },
  nextBtnTextDisabled: {
    color: '#555',
  },
});

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  selectedEx: ExerciseType;
  prValue: string;
  currentPR: number | null;
  saving: boolean;
  onSave: () => void;
  onBack: () => void;
}

function Step2({ selectedEx, prValue, currentPR, saving, onSave, onBack }: Step2Props) {
  const ExIcon = getIcon(selectedEx.key);
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
            {currentPR != null ? 'Previous: ' + currentPR + ' ' + selectedEx.unit : 'First PR'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s2.summaryValue}>{prValue}</Text>
          <Text style={s2.summaryUnit}>{selectedEx.unit.toUpperCase()}</Text>
        </View>
      </View>

      {/* XP indicators */}
      <View style={s2.xpRow}>
        <View style={[s2.xpCard, s2.xpCardInactive]}>
          <Text style={s2.xpAmount}>+100 XP</Text>
          <Text style={s2.xpLabel}>With video</Text>
        </View>
        <View style={[s2.xpCard, s2.xpCardActive]}>
          <Text style={[s2.xpAmount, { color: Colors.accent }]}>+50 XP</Text>
          <Text style={s2.xpLabel}>Without video</Text>
        </View>
      </View>

      {/* Video upload zone (deferred feature) */}
      <View style={s2.videoZone}>
        <View style={s2.videoComingSoon}>
          <Video size={28} strokeWidth={1.4} color="#444" />
          <Text style={s2.videoComingSoonTitle}>VIDEO PROOF</Text>
          <Text style={s2.videoComingSoonSub}>Coming in a future update</Text>
        </View>
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
              <Text style={s2.saveBtnText}>SAVE PR — +50 XP</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Skip / save without video */}
      <Pressable
        onPress={onSave}
        disabled={saving}
        style={({ pressed }) => [s2.skipBtn, pressed && { opacity: 0.6 }]}
      >
        <Text style={s2.skipBtnText}>Skip video, save anyway</Text>
      </Pressable>
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
  videoZone: {
    height: 130,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#252525',
    borderStyle: 'dashed',
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  videoComingSoon: {
    alignItems: 'center',
    gap: 6,
  },
  videoComingSoonTitle: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    color: '#3a3a3a',
  },
  videoComingSoonSub: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: '#333',
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

// ─── Step 3 — Success ─────────────────────────────────────────────────────────

interface Step3Props {
  exercise: ExerciseType;
  savedValue: number;
}

function Step3({ exercise, savedValue }: Step3Props) {
  const ExIcon = getIcon(exercise.key);
  return (
    <View style={s3.container}>
      {/* Trophy icon with glow ring */}
      <View style={s3.trophyRing}>
        <LinearGradient
          colors={[Colors.accent, Colors.accentDark]}
          style={s3.trophyBg}
        >
          <Trophy size={36} strokeWidth={1.4} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={s3.heading}>PR SAVED!</Text>
      <Text style={s3.xpLabel}>+50 XP EARNED</Text>

      {/* PR card */}
      <View style={s3.prCard}>
        <View style={s3.prCardHeader}>
          <ExIcon size={14} strokeWidth={1.8} color="#888" />
          <Text style={s3.prCardExercise}>{exercise.label.toUpperCase()}</Text>
        </View>
        <Text style={s3.prCardLabel}>NEW BEST</Text>
        <View style={s3.prCardValueRow}>
          <Text style={s3.prCardValue}>{savedValue}</Text>
          <Text style={s3.prCardUnit}>{exercise.unit}</Text>
        </View>
      </View>

      <View style={s3.celebRow}>
        <Zap size={13} strokeWidth={2} color={Colors.accent} />
        <Text style={s3.celebText}>Added to the leaderboard</Text>
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

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    height: SHEET_HEIGHT,
    overflow: 'hidden',
  },
  handleArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderDefault,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#3a3a3a',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: 2,
  },
  stepLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 2.5,
    color: '#555',
    marginBottom: 3,
  },
  stepTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 1,
    color: Colors.primary,
    lineHeight: 24,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 99,
    backgroundColor: '#2a2a2a',
  },
  progressActive: {
    backgroundColor: Colors.accent,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
  },
});
