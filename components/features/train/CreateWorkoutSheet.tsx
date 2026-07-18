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
import { styles } from './styles';

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
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Create workout bottom sheet */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
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
              <Text style={styles.sheetTitle}>{t('createSchedule')}</Text>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
                onPress={onClose}
              >
                <Ionicons name="close" size={15} color={Colors.secondary} />
              </Pressable>
            </View>

            {/* Workout name */}
            <Text style={styles.fieldLabel}>{t('workoutName')}</Text>
            <TextInput
              style={styles.input}
              value={newWorkout.name}
              onChangeText={(v) => setNewWorkout((p) => ({ ...p, name: v }))}
              placeholder={t('workoutNamePlaceholder')}
              placeholderTextColor={Colors.muted}
            />

            {/* Day picker */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('day')}</Text>
            <View style={styles.dayPicker}>
              {DAYS_FULL.map((d, i) => (
                <Pressable
                  key={d}
                  style={[styles.dayPill, newWorkout.day === d && styles.dayPillActive]}
                  onPress={() => setNewWorkout((p) => ({ ...p, day: d }))}
                >
                  <Text style={[styles.dayPillText, newWorkout.day === d && styles.dayPillTextActive]}>
                    {t(`days.short.${i}`).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add exercise */}
            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t('addExercise')}</Text>
            <View style={styles.exerciseBuilder}>
              <TextInput
                style={[styles.input, styles.inputOnSurface, { marginBottom: 10 }]}
                value={newEx.name}
                onChangeText={(v) => setNewEx((p) => ({ ...p, name: v }))}
                placeholder={t('exerciseNamePlaceholder')}
                placeholderTextColor={Colors.muted}
              />
              <View style={styles.exFieldsRow}>
                {(
                  [
                    { key: 'sets' as const, label: t('fields.sets'), ph: '3' },
                    { key: 'reps' as const, label: t('fields.reps'), ph: '10' },
                    { key: 'weight' as const, label: t('fields.weight'), ph: '0' },
                  ]
                ).map((f) => (
                  <View key={f.key} style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>{f.label}</Text>
                    <TextInput
                      style={[styles.input, styles.inputOnSurface, styles.inputSmall]}
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
                  {t('addExercise')}
                </Text>
              </Pressable>
            </View>

            {/* Added exercises list */}
            {newWorkout.exercises.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>
                  {t('exercisesAdded', { count: newWorkout.exercises.length })}
                </Text>
                {newWorkout.exercises.map((ex, i) => (
                  <View key={i} style={styles.addedExRow}>
                    <View style={styles.addedExIcon}>
                      <Ionicons name="pulse" size={14} color={Colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addedExName}>{ex.name}</Text>
                      <Text style={styles.addedExMeta}>
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
              onPress={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={17} color={canSave ? Colors.primary : Colors.muted} />
                  <Text style={[styles.saveBtnText, !canSave && { color: Colors.muted }]}>
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
