import type { Profile } from '@/types/user';
import type { ActivityLevel, DietGoal, NutritionTargets } from '@/types/nutrition';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT_KCAL: Record<DietGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

// Macro split of the final calorie target — protein/carbs at 4 kcal/g, fat at 9 kcal/g.
const PROTEIN_RATIO = 0.3;
const CARBS_RATIO = 0.4;
const FAT_RATIO = 0.3;

/**
 * Mifflin-St Jeor BMR → TDEE → goal-adjusted calorie target, split into
 * macros. Returns null when any required profile input is missing — the UI
 * then prompts the user to complete their nutrition profile instead of
 * showing numbers derived from incomplete data.
 */
export function calculateTargets(profile: Profile): NutritionTargets | null {
  const { weight_kg, height_cm, age, sex, activity_level, diet_goal } = profile;

  if (
    weight_kg == null ||
    height_cm == null ||
    age == null ||
    sex == null ||
    activity_level == null ||
    diet_goal == null
  ) {
    return null;
  }

  const bmr =
    sex === 'male'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[activity_level];
  const calories = Math.max(0, Math.round(tdee + GOAL_ADJUSTMENT_KCAL[diet_goal]));

  return {
    calories,
    protein_g: Math.round((calories * PROTEIN_RATIO) / 4),
    carbs_g: Math.round((calories * CARBS_RATIO) / 4),
    fat_g: Math.round((calories * FAT_RATIO) / 9),
  };
}

/**
 * The targets actually shown to the user: each field falls back to the
 * calculated value only where the user hasn't set an explicit override.
 * Returns null only when there's no override AND no calculated value
 * (profile incomplete) — i.e. nothing to show at all.
 */
export function resolveTargets(profile: Profile): NutritionTargets | null {
  const calculated = calculateTargets(profile);

  const calories = profile.target_calories ?? calculated?.calories;
  const protein_g = profile.target_protein_g ?? calculated?.protein_g;
  const carbs_g = profile.target_carbs_g ?? calculated?.carbs_g;
  const fat_g = profile.target_fat_g ?? calculated?.fat_g;

  if (calories == null || protein_g == null || carbs_g == null || fat_g == null) {
    return null;
  }

  return { calories, protein_g, carbs_g, fat_g };
}
