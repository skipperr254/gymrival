import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { calculateTargets } from '@/lib/nutrition';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import type { Profile } from '@/types/user';
import type { ActivityLevel, DietGoal, Sex } from '@/types/nutrition';

const SEX_OPTIONS: Sex[] = ['male', 'female'];
const ACTIVITY_OPTIONS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const DIET_GOAL_OPTIONS: DietGoal[] = ['lose', 'maintain', 'gain'];

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  labelKey,
  t,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  labelKey: string;
  t: (key: string) => string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            className={`px-4 py-2.5 rounded-full border-[1.5px] ${
              active ? 'bg-[rgba(230,48,48,0.1)] border-accent' : 'border-default'
            }`}
          >
            <Text className={`font-sans-medium text-xs ${active ? 'text-accent' : 'text-secondary'}`}>
              {t(`${labelKey}.${opt}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NutritionGoalsForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation('nutrition');
  const user = useAuthStore((s) => s.user);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const [weightKg, setWeightKg] = useState(profile.weight_kg != null ? String(profile.weight_kg) : '');
  const [heightCm, setHeightCm] = useState(profile.height_cm != null ? String(profile.height_cm) : '');
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '');
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile.activity_level);
  const [dietGoal, setDietGoal] = useState<DietGoal | null>(profile.diet_goal);

  const hasOverride =
    profile.target_calories != null ||
    profile.target_protein_g != null ||
    profile.target_carbs_g != null ||
    profile.target_fat_g != null;
  const [overrideEnabled, setOverrideEnabled] = useState(hasOverride);
  const [overrideCalories, setOverrideCalories] = useState(profile.target_calories != null ? String(profile.target_calories) : '');
  const [overrideProtein, setOverrideProtein] = useState(profile.target_protein_g != null ? String(profile.target_protein_g) : '');
  const [overrideCarbs, setOverrideCarbs] = useState(profile.target_carbs_g != null ? String(profile.target_carbs_g) : '');
  const [overrideFat, setOverrideFat] = useState(profile.target_fat_g != null ? String(profile.target_fat_g) : '');

  const [saving, setSaving] = useState(false);

  const preview = calculateTargets({
    ...profile,
    weight_kg: weightKg ? parseFloat(weightKg) : null,
    height_cm: heightCm ? parseFloat(heightCm) : null,
    age: age ? parseInt(age, 10) : null,
    sex,
    activity_level: activityLevel,
    diet_goal: dietGoal,
  });

  const canSave = weightKg.trim() !== '' && heightCm.trim() !== '' && age.trim() !== '' && !!sex && !!activityLevel && !!dietGoal;

  const handleSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);

    const { error } = await updateProfile(user.id, {
      weight_kg: parseFloat(weightKg),
      height_cm: parseFloat(heightCm),
      age: parseInt(age, 10),
      sex,
      activity_level: activityLevel,
      diet_goal: dietGoal,
      target_calories: overrideEnabled && overrideCalories ? parseInt(overrideCalories, 10) : null,
      target_protein_g: overrideEnabled && overrideProtein ? parseInt(overrideProtein, 10) : null,
      target_carbs_g: overrideEnabled && overrideCarbs ? parseInt(overrideCarbs, 10) : null,
      target_fat_g: overrideEnabled && overrideFat ? parseInt(overrideFat, 10) : null,
    });

    setSaving(false);

    if (error) {
      Alert.alert(t('goalsForm.saveErrorTitle'), t('goalsForm.saveError'));
      return;
    }
    router.back();
  };

  return (
    <View>
      <Text className="font-heading text-[10px] tracking-[2.5px] text-muted mb-2.5">{t('goalsForm.bodyStats')}</Text>
      <View className="flex-row gap-2.5 mb-4">
        <View className="flex-1">
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('goalsForm.weightKg')}</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            placeholder="70"
            placeholderTextColor={Colors.hint}
            className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
          />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('goalsForm.heightCm')}</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="numeric"
            placeholder="175"
            placeholderTextColor={Colors.hint}
            className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
          />
        </View>
        <View className="flex-1">
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('goalsForm.age')}</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholder="25"
            placeholderTextColor={Colors.hint}
            className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
          />
        </View>
      </View>

      <Text className="font-heading text-[10px] tracking-[2.5px] text-muted mb-2.5">{t('goalsForm.sex')}</Text>
      <ChipRow options={SEX_OPTIONS} value={sex} onChange={setSex} labelKey="goalsForm.sexOptions" t={t} />

      <Text className="font-heading text-[10px] tracking-[2.5px] text-muted mb-2.5">{t('goalsForm.activityLevel')}</Text>
      <ChipRow options={ACTIVITY_OPTIONS} value={activityLevel} onChange={setActivityLevel} labelKey="goalsForm.activityOptions" t={t} />

      <Text className="font-heading text-[10px] tracking-[2.5px] text-muted mb-2.5">{t('goalsForm.dietGoal')}</Text>
      <ChipRow options={DIET_GOAL_OPTIONS} value={dietGoal} onChange={setDietGoal} labelKey="goalsForm.dietGoalOptions" t={t} />

      {preview && (
        <View className="bg-surface rounded-2xl p-4 mb-4">
          <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-2">{t('goalsForm.calculatedPreview')}</Text>
          <Text className="font-sans text-xs text-secondary">
            {t('logSheet.macroSummary', {
              calories: preview.calories,
              protein: preview.protein_g,
              carbs: preview.carbs_g,
              fat: preview.fat_g,
            })}
          </Text>
        </View>
      )}

      <Pressable onPress={() => setOverrideEnabled(!overrideEnabled)} className="flex-row items-center gap-2.5 mb-4">
        <View
          className={`w-5 h-5 rounded-md items-center justify-center border-[1.5px] ${
            overrideEnabled ? 'bg-accent border-accent' : 'border-default'
          }`}
        >
          {overrideEnabled && <Check size={13} strokeWidth={3} color={Colors.primary} />}
        </View>
        <Text className="font-sans text-xs text-secondary">{t('goalsForm.customizeTargets')}</Text>
      </Pressable>

      {overrideEnabled && (
        <View className="flex-row flex-wrap gap-2.5 mb-2">
          <View className="flex-1 min-w-[45%]">
            <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('logSheet.calories')}</Text>
            <TextInput
              value={overrideCalories}
              onChangeText={setOverrideCalories}
              keyboardType="numeric"
              placeholder={preview ? String(preview.calories) : '0'}
              placeholderTextColor={Colors.hint}
              className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('logSheet.protein')}</Text>
            <TextInput
              value={overrideProtein}
              onChangeText={setOverrideProtein}
              keyboardType="numeric"
              placeholder={preview ? String(preview.protein_g) : '0'}
              placeholderTextColor={Colors.hint}
              className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('logSheet.carbs')}</Text>
            <TextInput
              value={overrideCarbs}
              onChangeText={setOverrideCarbs}
              keyboardType="numeric"
              placeholder={preview ? String(preview.carbs_g) : '0'}
              placeholderTextColor={Colors.hint}
              className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
            />
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text className="font-heading text-[9px] tracking-[2px] text-muted mb-1.5">{t('logSheet.fat')}</Text>
            <TextInput
              value={overrideFat}
              onChangeText={setOverrideFat}
              keyboardType="numeric"
              placeholder={preview ? String(preview.fat_g) : '0'}
              placeholderTextColor={Colors.hint}
              className="font-heading text-xl text-primary bg-surface border-[1.5px] border-default rounded-xl px-3 py-2.5"
            />
          </View>
        </View>
      )}

      <View className="h-2" />

      <Pressable onPress={() => canSave && !saving && handleSave()} disabled={!canSave || saving}>
        {canSave ? (
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}
          >
            <Text className="font-heading text-sm tracking-[2.5px] text-white">
              {saving ? t('goalsForm.saving') : t('goalsForm.saveGoals')}
            </Text>
          </LinearGradient>
        ) : (
          <View className="rounded-2xl py-[17px] bg-elevated items-center">
            <Text className="font-heading text-sm tracking-[2.5px] text-muted">{t('goalsForm.saveGoals')}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
