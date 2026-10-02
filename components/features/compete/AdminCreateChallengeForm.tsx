import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Zap, Globe, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useCompeteStore } from '@/store/useCompeteStore';
import type { ChallengeMetric, ChallengeScope } from '@/types/challenge';
import { ExercisePicker } from './ExercisePicker';
import { MetricPicker } from './MetricPicker';
import { DurationPicker, type DurationOption } from './DurationPicker';

const DURATION_OPTIONS: DurationOption[] = [
  { labelKey: 'admin.fields.durationWeekly',  days: 7  },
  { labelKey: 'admin.fields.durationMonthly', days: 30 },
];

export function AdminCreateChallengeForm({ adminId }: { adminId: string }) {
  const { t } = useTranslation('compete');
  const exercises = useCompeteStore((s) => s.exercises);
  const loadExercises = useCompeteStore((s) => s.loadExercises);
  const adminCreateChallenge = useCompeteStore((s) => s.adminCreateChallenge);

  const [title,            setTitle]           = useState('');
  const [description,      setDescription]     = useState('');
  const [scope,            setScope]           = useState<Extract<ChallengeScope, 'global' | 'friends_only'>>('global');
  const [exercise,         setExercise]        = useState(exercises[0]?.key ?? 'bench');
  const [metric,           setMetric]          = useState<ChallengeMetric>('highest_pr');
  const [duration,         setDuration]        = useState(7);
  const [prizeLabel,       setPrizeLabel]      = useState('');
  const [rewardXp,         setRewardXp]        = useState('');
  const [maxParticipants,  setMaxParticipants] = useState('');
  const [submitting,       setSubmitting]      = useState(false);
  const [error,            setError]           = useState<string | null>(null);
  const [success,          setSuccess]         = useState(false);

  const exerciseAutoPicked = useRef(true);

  useEffect(() => { loadExercises(); }, [loadExercises]);

  useEffect(() => {
    if (exercises.length === 0 || !exerciseAutoPicked.current) return;
    setExercise(exercises[0].key);
  }, [exercises]);

  const canSubmit = title.trim().length > 0 && !submitting;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setScope('global');
    setMetric('highest_pr');
    setDuration(7);
    setPrizeLabel('');
    setRewardXp('');
    setMaxParticipants('');
    exerciseAutoPicked.current = true;
    if (exercises.length > 0) setExercise(exercises[0].key);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + duration * 86_400_000);
    const parsedXp = parseInt(rewardXp, 10);
    const parsedMax = parseInt(maxParticipants, 10);

    const { error: createError } = await adminCreateChallenge(adminId, {
      scope,
      metric,
      exercise_key: exercise,
      title: title.trim(),
      description: description.trim() || undefined,
      prize_label: prizeLabel.trim() || undefined,
      reward_xp: Number.isFinite(parsedXp) && parsedXp > 0 ? parsedXp : 0,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      max_participants: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : undefined,
    });

    setSubmitting(false);
    if (createError) {
      setError(createError);
    } else {
      setSuccess(true);
      resetForm();
    }
  };

  return (
    <View className="bg-surface rounded-2xl py-4 px-[18px] mb-5 border border-default">
      <Text className="font-heading text-sm tracking-[2px] text-white mb-4">
        {t('admin.createTitle')}
      </Text>

      {/* Title */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.title')}
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={t('admin.fields.titlePlaceholder')}
        placeholderTextColor={Colors.muted}
        className="bg-[#252525] rounded-xl border border-[#333] py-2.5 px-3.5 font-sans text-[13px] text-white mb-3.5"
      />

      {/* Description */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.description')}
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('admin.fields.descriptionPlaceholder')}
        placeholderTextColor={Colors.muted}
        multiline
        className="bg-[#252525] rounded-xl border border-[#333] py-2.5 px-3.5 font-sans text-[13px] text-white mb-3.5 min-h-[70px]"
      />

      {/* Scope */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.scope')}
      </Text>
      <View className="flex-row gap-2 mb-3.5">
        <Pressable
          onPress={() => setScope('global')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] border-[1.5px] ${
            scope === 'global' ? 'border-accent bg-[rgba(230,48,48,0.1)]' : 'border-default bg-transparent'
          }`}
        >
          <Globe size={13} strokeWidth={1.8} color={scope === 'global' ? Colors.accent : Colors.muted} />
          <Text className={`font-heading text-[10px] tracking-[1px] ${scope === 'global' ? 'text-accent' : 'text-muted'}`}>
            {t('admin.fields.scopeGlobal')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setScope('friends_only')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-[10px] border-[1.5px] ${
            scope === 'friends_only' ? 'border-accent bg-[rgba(230,48,48,0.1)]' : 'border-default bg-transparent'
          }`}
        >
          <Users size={13} strokeWidth={1.8} color={scope === 'friends_only' ? Colors.accent : Colors.muted} />
          <Text className={`font-heading text-[10px] tracking-[1px] ${scope === 'friends_only' ? 'text-accent' : 'text-muted'}`}>
            {t('admin.fields.scopeFriendsOnly')}
          </Text>
        </Pressable>
      </View>

      {/* Exercise */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.exercise')}
      </Text>
      <View className="mb-3.5">
        <ExercisePicker
          exercises={exercises}
          value={exercise}
          onChange={(key) => { exerciseAutoPicked.current = false; setExercise(key); }}
        />
      </View>

      {/* Metric */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.metric')}
      </Text>
      <View className="mb-3.5">
        <MetricPicker value={metric} onChange={setMetric} />
      </View>

      {/* Duration */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.duration')}
      </Text>
      <View className="mb-3.5">
        <DurationPicker options={DURATION_OPTIONS} value={duration} onChange={setDuration} />
      </View>

      {/* Prize label */}
      <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
        {t('admin.fields.prizeLabel')}
      </Text>
      <TextInput
        value={prizeLabel}
        onChangeText={setPrizeLabel}
        placeholder={t('admin.fields.prizeLabelPlaceholder')}
        placeholderTextColor={Colors.muted}
        className="bg-[#252525] rounded-xl border border-[#333] py-2.5 px-3.5 font-sans text-[13px] text-white mb-3.5"
      />

      {/* XP reward + max participants */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
            {t('admin.fields.rewardXp')}
          </Text>
          <TextInput
            value={rewardXp}
            onChangeText={setRewardXp}
            placeholder={t('admin.fields.rewardXpPlaceholder')}
            placeholderTextColor={Colors.muted}
            keyboardType="number-pad"
            className="bg-[#252525] rounded-xl border border-[#333] py-2.5 px-3.5 font-sans text-[13px] text-white"
          />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-[10px] tracking-[3px] text-muted mb-2">
            {t('admin.fields.maxParticipants')}
          </Text>
          <TextInput
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder={t('admin.fields.maxParticipantsPlaceholder')}
            placeholderTextColor={Colors.muted}
            keyboardType="number-pad"
            className="bg-[#252525] rounded-xl border border-[#333] py-2.5 px-3.5 font-sans text-[13px] text-white"
          />
        </View>
      </View>

      {!!error && (
        <View className="flex-row items-center gap-2 bg-[rgba(230,48,48,0.08)] rounded-[10px] border border-[rgba(230,48,48,0.2)] p-3 mb-3.5">
          <AlertCircle size={14} strokeWidth={1.8} color={Colors.accent} />
          <Text className="flex-1 font-sans text-xs text-accent leading-[18px]">{error}</Text>
        </View>
      )}

      {success && (
        <View className="flex-row items-center gap-2 bg-[rgba(0,204,68,0.08)] rounded-[10px] border border-[rgba(0,204,68,0.25)] p-3 mb-3.5">
          <Zap size={14} strokeWidth={1.8} color={Colors.success} />
          <Text className="flex-1 font-sans text-xs text-success leading-[18px]">{t('admin.createSuccess')}</Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        className={`rounded-2xl overflow-hidden ${!canSubmit ? 'opacity-35' : ''}`}
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
            paddingVertical: 14,
            borderRadius: 14,
          }}
        >
          {submitting
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <><Zap size={16} strokeWidth={2} color={Colors.primary} /><Text className="font-heading text-sm tracking-[3px] text-white">{t('admin.submit')}</Text></>
          }
        </LinearGradient>
      </Pressable>
    </View>
  );
}
