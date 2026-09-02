export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type DietGoal = 'lose' | 'maintain' | 'gain';

export type Sex = 'male' | 'female';

export interface Food {
  id: string;
  user_id: string;
  name: string;
  serving_label: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
}

export type CreateFoodInput = Pick<
  Food,
  'name' | 'serving_label' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
>;

export interface MealLog {
  id: string;
  user_id: string;
  food_id: string | null;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  logged_at: string;
  created_at: string;
}

export type LogMealInput = Pick<
  MealLog,
  'food_id' | 'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'meal_type'
>;

export interface NutritionTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailyNutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
