import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CheckInView } from '@/components/features/CheckInView';
import { ProgressView } from '@/components/features/progress/ProgressView';
import { ScheduleList, WorkoutDetail, CreateWorkoutSheet } from '@/components/features/train';
import { styles } from '@/components/features/train/styles';
import { DAY_NAME_TO_INDEX, type DayOfWeek, type TrainingSessionWithExercises } from '@/types/train';
import type { NewWorkout } from '@/components/features/train/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { useTrainStore } from '@/store/useTrainStore';

export default function TrainScreen() {
  const { t } = useTranslation('train');
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

  // Load sessions on mount
  useEffect(() => {
    if (user?.id) loadSessions(user.id);
  }, [user?.id]);

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

    await addSession(user.id, {
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
    setShowModal(false);
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
              <Text style={styles.appTitle}>{t('header.brand')}</Text>
              <Text style={styles.pageLabel}>
                {activeTab === 0 ? t('header.schedule') : activeTab === 1 ? t('header.checkin') : t('header.progress')}
              </Text>
            </View>
          )}
        </View>

        {/* Tab switcher — only visible at top level */}
        {!selected && (
          <View style={styles.tabSwitcher}>
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
