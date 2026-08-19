import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppHeader, BackButton } from '@/components/ui';
import { CheckInView } from '@/components/features/CheckInView';
import { ProgressView } from '@/components/features/progress/ProgressView';
import { ScheduleList, WorkoutDetail, CreateWorkoutSheet } from '@/components/features/train';
import { DAY_NAME_TO_INDEX, type DayOfWeek, type TrainingSessionWithExercises } from '@/types/train';
import type { NewWorkout } from '@/components/features/train/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { useTrainStore } from '@/store/useTrainStore';

export default function TrainScreen() {
  const { t } = useTranslation('train');
  const user = useAuthStore((s) => s.user);

  const {
    sessions,
    loading,
    activeSessionId,
    addSession,
    removeSession,
    beginWorkout,
    finishWorkout,
    cancelWorkout,
    restoreActiveWorkout,
  } = useTrainStore();

  const loadSessions = useTrainStore((s) => s.loadSessions);

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<TrainingSessionWithExercises | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load sessions on mount, and rehydrate any workout that was in progress
  // when the app was last killed (see useTrainStore.restoreActiveWorkout).
  useEffect(() => {
    if (!user?.id) return;
    loadSessions(user.id);
    restoreActiveWorkout();
  }, [user?.id]);

  // Once both the session list and a restored in-progress workout are
  // available, jump straight to that session's detail view instead of
  // silently leaving the workout_log row active with no UI reflecting it.
  useEffect(() => {
    if (selected || !activeSessionId || sessions.length === 0) return;
    const match = sessions.find((s) => s.id === activeSessionId);
    if (match) {
      setSelected(match);
      setWorkoutStarted(true);
    }
  }, [activeSessionId, sessions, selected]);

  const totalSets = selected?.exercises.reduce((a, e) => a + e.sets, 0) ?? 0;
  const doneSets = Object.values(completedSets).filter(Boolean).length;
  const allDone = workoutStarted && selected !== null && totalSets > 0 && doneSets >= totalSets;

  const toggleSet = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    setCompletedSets((p) => ({ ...p, [key]: !p[key] }));
  };

  const saveWorkout = async (workout: NewWorkout) => {
    if (!user?.id) return;
    setSaving(true);

    const dayOfWeek = DAY_NAME_TO_INDEX[workout.day] ?? null;

    const newId = await addSession(user.id, {
      name: workout.name,
      day_of_week: dayOfWeek as DayOfWeek | null,
      exercises: workout.exercises.map((ex) => ({
        exercise_name: ex.name,
        exercise_key: null,
        sets: ex.sets,
        reps: ex.reps,
        target_weight: ex.weight > 0 ? ex.weight : null,
      })),
    });

    setSaving(false);
    // Only close the sheet on success — otherwise a failed insert (dropped
    // network, RLS/auth hiccup) looked identical to a successful save, with
    // the workout silently never appearing in the schedule.
    if (newId) {
      setShowModal(false);
    } else {
      Alert.alert(t('saveErrorTitle'), t('saveScheduleError'));
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (selected?.id === id) goBack();
    const { error } = await removeSession(id);
    // Previously this just quietly did nothing on failure — the workout
    // stayed in the list with no indication the delete didn't take.
    if (error) Alert.alert(t('saveErrorTitle'), t('deleteSessionError'));
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
    if (!user?.id || !selected || startingWorkout) return;
    setStartingWorkout(true);
    await beginWorkout(user.id, selected);
    setStartingWorkout(false);
    setWorkoutStarted(true);
  };

  const handleFinishWorkout = async () => {
    const { error } = await finishWorkout(doneSets);
    // Only navigate away on success — otherwise a failed completion write
    // left the workout_log row permanently is_complete=false (no XP ever
    // awarded) while the user was already shown the "WORKOUT DONE" screen
    // and sent back to the schedule as if nothing was wrong.
    if (error) {
      Alert.alert(t('saveErrorTitle'), t('finishWorkoutError'));
      return;
    }
    goBack();
  };

  const handleCancelWorkout = () => {
    cancelWorkout();
    setWorkoutStarted(false);
    setCompletedSets({});
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }} edges={['top']}>
        {/* Header */}
        {selected ? (
          <View className="px-4 pt-2.5 mb-1">
            <BackButton onPress={goBack} />
          </View>
        ) : (
          <AppHeader />
        )}

        {/* Tab switcher — only visible at top level */}
        {!selected && (
          <View className="px-4 pb-2.5">
            <SegmentedControl
              options={[t('tabs.schedule'), t('tabs.checkin'), t('tabs.progress')]}
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
            <ScheduleList
              sessions={sessions}
              loading={loading}
              onOpenDetail={openDetail}
              onDelete={handleDeleteSession}
              onNew={() => setShowModal(true)}
            />
          ) : (
            <WorkoutDetail
              session={selected}
              workoutStarted={workoutStarted}
              starting={startingWorkout}
              completedSets={completedSets}
              totalSets={totalSets}
              doneSets={doneSets}
              allDone={allDone}
              onToggleSet={toggleSet}
              onStart={handleStartWorkout}
              onFinish={handleFinishWorkout}
              onCancel={handleCancelWorkout}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      <CreateWorkoutSheet
        visible={showModal}
        saving={saving}
        onClose={() => setShowModal(false)}
        onSave={saveWorkout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
});
