import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CheckInView } from '@/components/features/CheckInView';
import { ProgressView } from '@/components/features/progress/ProgressView';
import { useAuthStore } from '@/store/useAuthStore';
import { useTrainStore } from '@/store/useTrainStore';
import { DAY_NAMES, DAY_NAME_TO_INDEX, DAY_SHORT, type DayOfWeek } from '@/types/train';
import type { TrainingSessionWithExercises } from '@/types/train';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const EXERCISE_FIELDS = [
  { key: 'sets' as const, label: 'SETS', ph: '3' },
  { key: 'reps' as const, label: 'REPS', ph: '10' },
  { key: 'weight' as const, label: 'KG', ph: '0' },
];

type NewExercise = { name: string; sets: string; reps: string; weight: string };
type NewWorkout = { name: string; day: string; exercises: Array<{ name: string; sets: number; reps: string; weight: number }> };

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { sessions, loading, addSession, removeSession, beginWorkout, finishWorkout, cancelWorkout } =
    useTrainStore();

  const loadSessions = useTrainStore((s) => s.loadSessions);

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<TrainingSessionWithExercises | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWorkout, setNewWorkout] = useState<NewWorkout>({ name: '', day: 'Monday', exercises: [] });
  const [newEx, setNewEx] = useState<NewExercise>({ name: '', sets: '3', reps: '10', weight: '' });

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Load sessions on mount
  useEffect(() => {
    if (user?.id) loadSessions(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (showModal) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showModal, slideAnim, backdropAnim]);

  // Map day_of_week to full day name for display
  const sessionDay = (s: TrainingSessionWithExercises): string => {
    if (s.day_of_week == null) return 'Flexible';
    return DAY_NAMES[s.day_of_week];
  };

  const dayHasWorkout = (i: number) =>
    sessions.some((s) => s.day_of_week === i);

  const workoutForDay = (i: number) =>
    sessions.find((s) => s.day_of_week === i);

  const totalSets = selected?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const doneSets = Object.values(completedSets).filter(Boolean).length;
  const allDone = workoutStarted && selected !== null && totalSets > 0 && doneSets >= totalSets;

  const canSave = newWorkout.name.trim().length > 0 && newWorkout.exercises.length > 0 && !saving;
  const canAddEx = newEx.name.trim().length > 0;

  const toggleSet = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    setCompletedSets((p) => ({ ...p, [key]: !p[key] }));
  };

  const addExercise = () => {
    if (!canAddEx) return;
    setNewWorkout((p) => ({
      ...p,
      exercises: [
        ...p.exercises,
        {
          name: newEx.name.trim(),
          sets: parseInt(newEx.sets) || 3,
          reps: newEx.reps || '10',
          weight: parseInt(newEx.weight) || 0,
        },
      ],
    }));
    setNewEx({ name: '', sets: '3', reps: '10', weight: '' });
  };

  const saveWorkout = async () => {
    if (!canSave || !user?.id) return;
    setSaving(true);

    const dayOfWeek = DAY_NAME_TO_INDEX[newWorkout.day] ?? null;

    await addSession(user.id, {
      name: newWorkout.name,
      day_of_week: dayOfWeek as DayOfWeek | null,
      exercises: newWorkout.exercises.map((ex) => ({
        exercise_name: ex.name,
        exercise_key: null,
        sets: ex.sets,
        reps: ex.reps,
        target_weight: ex.weight > 0 ? ex.weight : null,
      })),
    });

    setSaving(false);
    setShowModal(false);
    setNewWorkout({ name: '', day: 'Monday', exercises: [] });
    setNewEx({ name: '', sets: '3', reps: '10', weight: '' });
  };

  const handleDeleteSession = async (id: string) => {
    if (selected?.id === id) goBack();
    await removeSession(id);
  };

  const openDetail = (s: TrainingSessionWithExercises) => {
    setSelected(s);
    setWorkoutStarted(false);
    setCompletedSets({});
  };

  const goBack = () => {
    setSelected(null);
    setWorkoutStarted(false);
    setCompletedSets({});
    cancelWorkout();
  };

  const handleStartWorkout = async () => {
    if (!user?.id || !selected) return;
    await beginWorkout(user.id, selected);
    setWorkoutStarted(true);
  };

  const handleFinishWorkout = async () => {
    await finishWorkout(doneSets);
    goBack();
  };

  const handleCancelWorkout = () => {
    cancelWorkout();
    setWorkoutStarted(false);
    setCompletedSets({});
  };

  return (
    <>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          {selected ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
                onPress={goBack}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.accent} />
              </Pressable>
              <View style={{ flex: 1 }} />
            </>
          ) : (
            <View>
              <Text style={styles.appTitle}>GYM RIVAL</Text>
              <Text style={styles.pageLabel}>
                {activeTab === 0 ? 'WORKOUT SCHEDULE' : activeTab === 1 ? 'GYM CHECK-IN' : 'PROGRESS'}
              </Text>
            </View>
          )}
        </View>

        {/* Tab switcher — only visible at top level */}
        {!selected && (
          <View style={styles.tabSwitcher}>
            <SegmentedControl
              options={['SCHEDULE', 'CHECK IN', 'PROGRESS']}
              selectedIndex={activeTab}
              onChange={(i) => setActiveTab(i as 0 | 1 | 2)}
            />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!selected && activeTab === 2 ? (
            <ProgressView />
          ) : !selected && activeTab === 1 ? (
            <CheckInView />
          ) : !selected ? (
            <>
              {/* Loading skeleton */}
              {loading && sessions.length === 0 && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                </View>
              )}

              {/* Weekly Calendar */}
              <View style={styles.calendarCard}>
                {DAYS_SHORT.map((day, i) => {
                  const has = dayHasWorkout(i);
                  const workout = workoutForDay(i);
                  return (
                    <Pressable
                      key={day}
                      style={styles.dayCol}
                      onPress={() => workout && openDetail(workout)}
                      disabled={!has}
                    >
                      <View style={[styles.dayDot, has && styles.dayDotActive]}>
                        {has ? (
                          <Ionicons name="barbell" size={14} color={Colors.primary} />
                        ) : (
                          <View style={styles.emptyDot} />
                        )}
                      </View>
                      <Text style={[styles.dayLabel, has && styles.dayLabelActive]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Section label + NEW button */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>
                  {`${sessions.length} WORKOUT${sessions.length !== 1 ? 'S' : ''} PLANNED`}
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowModal(true)}
                >
                  <Ionicons name="add" size={14} color={Colors.accent} />
                  <Text style={styles.newBtnText}>NEW</Text>
                </Pressable>
              </View>

              {/* Session list */}
              {sessions.map((s) => (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [styles.workoutCard, pressed && { opacity: 0.75 }]}
                  onPress={() => openDetail(s)}
                >
                  <View style={styles.workoutIconWrap}>
                    <Ionicons name="barbell" size={22} color={Colors.accent} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{s.name.toUpperCase()}</Text>
                    <Text style={styles.workoutMeta}>{`${sessionDay(s)} · ${s.exercises.length} exercises`}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.9 : 0.4 }]}
                    onPress={() => handleDeleteSession(s.id)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                </Pressable>
              ))}

              {/* Empty state */}
              {!loading && sessions.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="barbell-outline"
                    size={40}
                    color={Colors.muted}
                    style={{ opacity: 0.4, marginBottom: 14 }}
                  />
                  <Text style={styles.emptyTitle}>NO SCHEDULES YET</Text>
                  <Text style={styles.emptySubtitle}>
                    {"Tap NEW above to create your first workout"}
                  </Text>
                </View>
              )}
            </>
          ) : (
            /* Workout Detail */
            <>
              {/* Detail header card */}
              <View style={styles.detailCard}>
                <View style={styles.detailCardTop}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="barbell" size={26} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{selected.name.toUpperCase()}</Text>
                    <Text style={styles.detailMeta}>
                      {`${sessionDay(selected).toUpperCase()} · ${selected.exercises.length} EXERCISES`}
                    </Text>
                  </View>
                </View>

                {workoutStarted && (
                  <>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressLabel}>PROGRESS</Text>
                      <Text style={styles.progressLabel}>{`${doneSets} / ${totalSets} SETS`}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { flex: doneSets }]} />
                      <View style={{ flex: Math.max(totalSets - doneSets, 0) }} />
                    </View>
                  </>
                )}
              </View>

              {/* Exercise list */}
              {selected.exercises.map((ex, i) => (
                <View key={ex.id} style={styles.exCard}>
                  <View style={[styles.exCardTop, workoutStarted && { marginBottom: 12 }]}>
                    <View style={[styles.exIcon, workoutStarted && styles.exIconActive]}>
                      <Ionicons
                        name="pulse"
                        size={18}
                        color={workoutStarted ? Colors.accent : Colors.muted}
                      />
                    </View>
                    <View style={styles.exInfo}>
                      <Text style={styles.exName}>{ex.exercise_name}</Text>
                      <Text style={styles.exMeta}>
                        {`${ex.sets} sets · ${ex.reps} reps${(ex.target_weight ?? 0) > 0 ? ` · ${ex.target_weight}kg` : ''}`}
                      </Text>
                    </View>
                    {!workoutStarted && (
                      <View style={styles.exBadge}>
                        <Text style={styles.exBadgeText}>{`${ex.sets}×${ex.reps}`}</Text>
                      </View>
                    )}
                  </View>

                  {workoutStarted && (
                    <View style={styles.setsRow}>
                      {Array.from({ length: ex.sets }).map((_, j) => {
                        const done = !!completedSets[`${i}-${j}`];
                        return (
                          <Pressable
                            key={j}
                            style={({ pressed }) => [
                              styles.setBtn,
                              done && styles.setBtnDone,
                              pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => toggleSet(i, j)}
                          >
                            {done ? (
                              <Ionicons name="checkmark" size={14} color={Colors.accent} />
                            ) : (
                              <Text style={styles.setBtnLabel}>{`SET ${j + 1}`}</Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))}

              {/* CTAs */}
              {!workoutStarted ? (
                <Pressable
                  style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleStartWorkout}
                >
                  <Ionicons name="flash" size={18} color={Colors.primary} />
                  <Text style={styles.startBtnText}>START WORKOUT</Text>
                </Pressable>
              ) : allDone ? (
                <View style={styles.doneCard}>
                  <Ionicons name="trophy" size={42} color={Colors.success} style={{ marginBottom: 12 }} />
                  <Text style={styles.doneTitle}>WORKOUT DONE!</Text>
                  <Text style={styles.doneSub}>All sets completed. Great work!</Text>
                  <Pressable
                    style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
                    onPress={handleFinishWorkout}
                  >
                    <Text style={styles.doneBtnText}>BACK TO SCHEDULE</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
                  onPress={handleCancelWorkout}
                >
                  <Ionicons name="close" size={15} color={Colors.muted} />
                  <Text style={styles.cancelBtnText}>CANCEL WORKOUT</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Backdrop */}
      <Animated.View
        pointerEvents={showModal ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
      </Animated.View>

      {/* Create workout bottom sheet */}
      <Animated.View
        pointerEvents={showModal ? 'auto' : 'none'}
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>CREATE SCHEDULE</Text>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={15} color={Colors.secondary} />
              </Pressable>
            </View>

            {/* Workout name */}
            <Text style={styles.fieldLabel}>WORKOUT NAME</Text>
            <TextInput
              style={styles.input}
              value={newWorkout.name}
              onChangeText={(t) => setNewWorkout((p) => ({ ...p, name: t }))}
              placeholder="e.g. Push Day"
              placeholderTextColor={Colors.muted}
            />

            {/* Day picker */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>DAY</Text>
            <View style={styles.dayPicker}>
              {DAYS_FULL.map((d) => (
                <Pressable
                  key={d}
                  style={[styles.dayPill, newWorkout.day === d && styles.dayPillActive]}
                  onPress={() => setNewWorkout((p) => ({ ...p, day: d }))}
                >
                  <Text style={[styles.dayPillText, newWorkout.day === d && styles.dayPillTextActive]}>
                    {d.slice(0, 3).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add exercise */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>ADD EXERCISE</Text>
            <View style={styles.exerciseBuilder}>
              <TextInput
                style={[styles.input, styles.inputOnSurface, { marginBottom: 10 }]}
                value={newEx.name}
                onChangeText={(t) => setNewEx((p) => ({ ...p, name: t }))}
                placeholder="Exercise name"
                placeholderTextColor={Colors.muted}
              />
              <View style={styles.exFieldsRow}>
                {EXERCISE_FIELDS.map((f) => (
                  <View key={f.key} style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>{f.label}</Text>
                    <TextInput
                      style={[styles.input, styles.inputOnSurface, styles.inputSmall]}
                      value={newEx[f.key]}
                      onChangeText={(t) => setNewEx((p) => ({ ...p, [f.key]: t }))}
                      placeholder={f.ph}
                      placeholderTextColor={Colors.muted}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.addExBtn,
                  !canAddEx && styles.addExBtnDisabled,
                  pressed && canAddEx ? { opacity: 0.8 } : undefined,
                ]}
                onPress={addExercise}
                disabled={!canAddEx}
              >
                <Ionicons name="add" size={14} color={canAddEx ? Colors.primary : Colors.muted} />
                <Text style={[styles.addExBtnText, !canAddEx && { color: Colors.muted }]}>
                  ADD EXERCISE
                </Text>
              </Pressable>
            </View>

            {/* Added exercises list */}
            {newWorkout.exercises.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>
                  {`${newWorkout.exercises.length} EXERCISES ADDED`}
                </Text>
                {newWorkout.exercises.map((ex, i) => (
                  <View key={i} style={styles.addedExRow}>
                    <View style={styles.addedExIcon}>
                      <Ionicons name="pulse" size={14} color={Colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addedExName}>{ex.name}</Text>
                      <Text style={styles.addedExMeta}>
                        {`${ex.sets} sets · ${ex.reps} reps${ex.weight > 0 ? ` · ${ex.weight}kg` : ''}`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        setNewWorkout((p) => ({
                          ...p,
                          exercises: p.exercises.filter((_, j) => j !== i),
                        }))
                      }
                      hitSlop={8}
                      style={({ pressed }) => [{ opacity: pressed ? 1 : 0.5 }]}
                    >
                      <Ionicons name="close" size={14} color="#ff6b6b" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Save button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (!canSave || saving) && styles.saveBtnDisabled,
                pressed && canSave && !saving ? { opacity: 0.8 } : undefined,
              ]}
              onPress={saveWorkout}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={17} color={canSave ? Colors.primary : Colors.muted} />
                  <Text style={[styles.saveBtnText, !canSave && { color: Colors.muted }]}>
                    SAVE SCHEDULE
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.base },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 4,
  },
  appTitle: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 4,
    lineHeight: 28,
  },
  pageLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#606060',
    letterSpacing: 2,
    marginTop: 2,
  },
  backBtn: { padding: 4 },

  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },

  tabSwitcher: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  loadingRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Calendar
  calendarCard: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  dayCol: { flex: 1, alignItems: 'center' },
  dayDot: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: Colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayDotActive: { backgroundColor: Colors.accent },
  emptyDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333' },
  dayLabel: { fontFamily: Fonts.display, fontSize: 9, letterSpacing: 1, color: Colors.muted },
  dayLabelActive: { color: Colors.accent },

  // Section row
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: { fontFamily: Fonts.display, fontSize: 12, letterSpacing: 3, color: Colors.muted },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: Colors.accentRing,
  },
  newBtnText: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1.5, color: Colors.accent },

  // Workout card
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  workoutIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: { flex: 1 },
  workoutName: { fontFamily: Fonts.display, fontSize: 17, letterSpacing: 2, color: Colors.primary },
  workoutMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  deleteBtn: { padding: 6, borderRadius: 8 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    letterSpacing: 3,
    color: Colors.primary,
    marginBottom: 6,
  },
  emptySubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center' },

  // Detail view
  detailCard: { backgroundColor: '#000', borderRadius: 20, padding: 20, marginBottom: 14 },
  detailCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  detailIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(230,48,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,48,48,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailName: { fontFamily: Fonts.display, fontSize: 26, letterSpacing: 3, color: Colors.primary },
  detailMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.secondary, letterSpacing: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1, color: Colors.muted },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressFill: { backgroundColor: Colors.accent, borderRadius: 4 },

  // Exercise card
  exCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  exCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.base,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exIconActive: {
    backgroundColor: 'rgba(230,48,48,0.1)',
    borderColor: 'rgba(230,48,48,0.3)',
  },
  exInfo: { flex: 1 },
  exName: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.primary, marginBottom: 2 },
  exMeta: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  exBadge: {
    backgroundColor: Colors.base,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  exBadgeText: { fontFamily: Fonts.display, fontSize: 17, color: Colors.primary },
  setsRow: { flexDirection: 'row', gap: 8 },
  setBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBtnDone: { borderColor: Colors.accent, backgroundColor: 'rgba(230,48,48,0.12)' },
  setBtnLabel: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1, color: Colors.muted },

  // CTAs
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 52,
    marginTop: 6,
  },
  startBtnText: { fontFamily: Fonts.display, fontSize: 15, letterSpacing: 3, color: Colors.primary },
  doneCard: {
    backgroundColor: '#0a1f0a',
    borderWidth: 1,
    borderColor: '#1a3a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 6,
  },
  doneTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    letterSpacing: 3,
    color: Colors.primary,
    marginBottom: 4,
  },
  doneSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 18 },
  doneBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  doneBtnText: { fontFamily: Fonts.display, fontSize: 14, letterSpacing: 2, color: Colors.primary },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    borderRadius: 16,
    height: 52,
    marginTop: 6,
  },
  cancelBtnText: { fontFamily: Fonts.display, fontSize: 13, letterSpacing: 2, color: Colors.muted },

  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    zIndex: 100,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    zIndex: 101,
  },
  sheetContent: { padding: 24 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 22, letterSpacing: 3, color: Colors.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.muted,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.primary,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  inputOnSurface: { backgroundColor: Colors.surface },
  inputSmall: {
    fontFamily: Fonts.display,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dayPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  dayPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  dayPillActive: { borderColor: Colors.accent, backgroundColor: Colors.accentRing },
  dayPillText: { fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1, color: Colors.muted },
  dayPillTextActive: { color: Colors.accent },
  exerciseBuilder: {
    backgroundColor: Colors.base,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  exFieldsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  miniLabel: {
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.muted,
    marginBottom: 4,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  addExBtnDisabled: { backgroundColor: Colors.elevated },
  addExBtnText: { fontFamily: Fonts.display, fontSize: 12, letterSpacing: 2, color: Colors.primary },
  addedExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.base,
    borderRadius: 12,
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  addedExIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedExName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.primary },
  addedExMeta: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    height: 54,
  },
  saveBtnDisabled: { backgroundColor: Colors.elevated },
  saveBtnText: { fontFamily: Fonts.display, fontSize: 15, letterSpacing: 3, color: Colors.primary },
});
