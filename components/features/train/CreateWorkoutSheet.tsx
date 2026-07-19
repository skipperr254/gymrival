import { useState, useRef, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { DAYS_FULL, type NewWorkout, type NewExercise } from './constants';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface CreateWorkoutSheetProps {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (workout: NewWorkout) => void;
}

export function CreateWorkoutSheet({ visible, saving, onClose, onSave }: CreateWorkoutSheetProps) {
  const { t } = useTranslation('train');
  const insets = useSafeAreaInsets();

  const [newWorkout, setNewWorkout] = useState<NewWorkout>({ name: '', day: 'Monday', exercises: [] });
  const [newEx, setNewEx] = useState<NewExercise>({ name: '', sets: '3', reps: '10', weight: '' });

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
  }, [visible, slideAnim, backdropAnim]);

  const canSave = newWorkout.name.trim().length > 0 && newWorkout.exercises.length > 0 && !saving;
  const canAddEx = newEx.name.trim().length > 0;

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

  const handleSave = () => {
    if (!canSave) return;
    onSave(newWorkout);
    setNewWorkout({ name: '', day: 'Monday', exercises: [] });
    setNewEx({ name: '', sets: '3', reps: '10', weight: '' });
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        className="absolute inset-0 bg-black/[0.82] z-[100]"
        style={{ opacity: backdropAnim }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Create workout bottom sheet */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl max-h-[88%] z-[101]"
        style={{ transform: [{ translateY: slideAnim }] }}
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
            <View className="flex-row items-center justify-between mb-5">
              <Text className="font-heading text-[22px] tracking-[3px] text-primary">
                {t('createSchedule')}
              </Text>
              <Pressable
                className="w-8 h-8 rounded-2xl bg-elevated items-center justify-center"
                style={({ pressed }) => pressed && { opacity: 0.6 }}
                onPress={onClose}
              >
                <Ionicons name="close" size={15} color={Colors.secondary} />
              </Pressable>
            </View>

            {/* Workout name */}
            <Text className="font-heading text-[10px] tracking-[2px] text-muted mb-[5px]">
              {t('workoutName')}
            </Text>
            <TextInput
              className="bg-base rounded-xl border border-default px-3.5 py-[11px] text-primary font-sans text-sm"
              value={newWorkout.name}
              onChangeText={(v) => setNewWorkout((p) => ({ ...p, name: v }))}
              placeholder={t('workoutNamePlaceholder')}
              placeholderTextColor={Colors.muted}
              maxLength={60}
            />

            {/* Day picker */}
            <Text className="font-heading text-[10px] tracking-[2px] text-muted mb-[5px] mt-4">
              {t('day')}
            </Text>
            <View className="flex-row flex-wrap gap-1.5 mb-1">
              {DAYS_FULL.map((d, i) => (
                <Pressable
                  key={d}
                  className={`py-1.5 px-3 rounded-full border-[1.5px] ${
                    newWorkout.day === d ? 'border-accent bg-accent-ring' : 'border-default'
                  }`}
                  onPress={() => setNewWorkout((p) => ({ ...p, day: d }))}
                >
                  <Text
                    className={`font-heading text-[11px] tracking-[1px] ${
                      newWorkout.day === d ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {t(`days.short.${i}`).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add exercise */}
            <Text className="font-heading text-[10px] tracking-[2px] text-muted mb-[5px] mt-[18px]">
              {t('addExercise')}
            </Text>
            <View className="bg-base rounded-2xl p-3.5 mb-3.5">
              <TextInput
                className="bg-surface rounded-xl border border-default px-3.5 py-[11px] text-primary font-sans text-sm mb-2.5"
                value={newEx.name}
                onChangeText={(v) => setNewEx((p) => ({ ...p, name: v }))}
                placeholder={t('exerciseNamePlaceholder')}
                placeholderTextColor={Colors.muted}
                maxLength={60}
              />
              <View className="flex-row gap-2 mb-2.5">
                {(
                  [
                    { key: 'sets' as const, label: t('fields.sets'), ph: '3' },
                    { key: 'reps' as const, label: t('fields.reps'), ph: '10' },
                    { key: 'weight' as const, label: t('fields.weight'), ph: '0' },
                  ]
                ).map((f) => (
                  <View key={f.key} className="flex-1">
                    <Text className="font-heading text-[9px] tracking-[1px] text-muted mb-1">
                      {f.label}
                    </Text>
                    <TextInput
                      className="bg-surface rounded-xl border border-default px-2.5 py-2 text-primary font-heading text-base"
                      value={newEx[f.key]}
                      onChangeText={(v) => setNewEx((p) => ({ ...p, [f.key]: v }))}
                      placeholder={f.ph}
                      placeholderTextColor={Colors.muted}
                      keyboardType="numeric"
                    />
                  </View>
                ))}
              </View>
              <Pressable
                className={`flex-row items-center justify-center gap-2 rounded-[10px] py-2.5 ${
                  canAddEx ? 'bg-accent' : 'bg-elevated'
                }`}
                style={({ pressed }) => pressed && canAddEx ? { opacity: 0.8 } : undefined}
                onPress={addExercise}
                disabled={!canAddEx}
              >
                <Ionicons name="add" size={14} color={canAddEx ? Colors.primary : Colors.muted} />
                <Text
                  className={`font-heading text-xs tracking-[2px] ${
                    canAddEx ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {t('addExercise')}
                </Text>
              </Pressable>
            </View>

            {/* Added exercises list */}
            {newWorkout.exercises.length > 0 && (
              <View className="mb-4">
                <Text className="font-heading text-[10px] tracking-[2px] text-muted mb-2">
                  {t('exercisesAdded', { count: newWorkout.exercises.length })}
                </Text>
                {newWorkout.exercises.map((ex, i) => (
                  <View
                    key={i}
                    className="flex-row items-center gap-2.5 bg-base rounded-xl py-2.5 px-3.5 mb-2"
                  >
                    <View className="w-7 h-7 rounded-lg bg-surface items-center justify-center">
                      <Ionicons name="pulse" size={14} color={Colors.muted} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-sans-semibold text-[13px] text-primary">{ex.name}</Text>
                      <Text className="font-sans text-[11px] text-muted">
                        {ex.weight > 0
                          ? t('exerciseMetaWithWeight', { sets: ex.sets, reps: ex.reps, weight: ex.weight })
                          : t('exerciseMeta', { sets: ex.sets, reps: ex.reps })}
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
                      style={({ pressed }) => ({ opacity: pressed ? 1 : 0.5 })}
                    >
                      <Ionicons name="close" size={14} color="#ff6b6b" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Save button */}
            <Pressable
              className={`flex-row items-center justify-center gap-2.5 rounded-2xl h-[54px] ${
                !canSave || saving ? 'bg-elevated' : 'bg-accent'
              }`}
              style={({ pressed }) => (pressed && canSave && !saving ? { opacity: 0.8 } : undefined)}
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={17} color={canSave ? Colors.primary : Colors.muted} />
                  <Text
                    className={`font-heading text-[15px] tracking-[3px] ${
                      canSave ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {t('saveSchedule')}
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
  sheetContent: { padding: 24 },
});
