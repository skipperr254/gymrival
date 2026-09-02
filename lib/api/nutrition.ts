import { supabase } from "@/lib/supabase";
import type { Food, CreateFoodInput, MealLog, LogMealInput } from "@/types/nutrition";

const FOOD_COLUMNS = "id, user_id, name, serving_label, calories, protein_g, carbs_g, fat_g, created_at, updated_at";
const MEAL_LOG_COLUMNS = "id, user_id, food_id, name, calories, protein_g, carbs_g, fat_g, meal_type, logged_at, created_at";

// ─── My Foods ─────────────────────────────────────────────────────────────────

export async function fetchMyFoods(userId: string): Promise<{ data: Food[]; error: string | null }> {
  const { data, error } = await supabase
    .from("foods")
    .select(FOOD_COLUMNS)
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return { data: (data ?? []) as Food[], error: error?.message ?? null };
}

export async function createFood(
  userId: string,
  input: CreateFoodInput
): Promise<{ data: Food | null; error: string | null }> {
  const { data, error } = await supabase
    .from("foods")
    .insert({ user_id: userId, ...input })
    .select(FOOD_COLUMNS)
    .single();

  return { data: data as Food | null, error: error?.message ?? null };
}

export async function updateFood(
  foodId: string,
  input: CreateFoodInput
): Promise<{ data: Food | null; error: string | null }> {
  const { data, error } = await supabase
    .from("foods")
    .update(input)
    .eq("id", foodId)
    .select(FOOD_COLUMNS)
    .single();

  return { data: data as Food | null, error: error?.message ?? null };
}

export async function deleteFood(foodId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("foods").delete().eq("id", foodId);
  return { error: error?.message ?? null };
}

// ─── Meal logs ────────────────────────────────────────────────────────────────

/**
 * Meal logs for the current UTC calendar day — same day-boundary convention
 * as gym_checkins (see lib/checkin.ts) for consistency across the app.
 */
export async function fetchTodayMealLogs(userId: string): Promise<{ data: MealLog[]; error: string | null }> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("meal_logs")
    .select(MEAL_LOG_COLUMNS)
    .eq("user_id", userId)
    .gte("logged_at", todayStart.toISOString())
    .order("logged_at", { ascending: true });

  return { data: (data ?? []) as MealLog[], error: error?.message ?? null };
}

export async function logMeal(
  userId: string,
  input: LogMealInput
): Promise<{ data: MealLog | null; error: string | null }> {
  const { data, error } = await supabase
    .from("meal_logs")
    .insert({ user_id: userId, ...input })
    .select(MEAL_LOG_COLUMNS)
    .single();

  return { data: data as MealLog | null, error: error?.message ?? null };
}

export async function deleteMealLog(mealLogId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("meal_logs").delete().eq("id", mealLogId);
  return { error: error?.message ?? null };
}
