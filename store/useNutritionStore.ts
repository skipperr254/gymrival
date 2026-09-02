import { create } from 'zustand';
import type { Food, CreateFoodInput, MealLog, LogMealInput, DailyNutritionTotals } from '@/types/nutrition';
import {
  fetchMyFoods,
  createFood as createFoodAPI,
  updateFood as updateFoodAPI,
  deleteFood as deleteFoodAPI,
  fetchTodayMealLogs,
  logMeal as logMealAPI,
  deleteMealLog as deleteMealLogAPI,
} from '@/lib/api/nutrition';

interface NutritionState {
  myFoods: Food[];
  todayLogs: MealLog[];
  loading: boolean;
  error: string | null;

  /** Load My Foods and today's logs in parallel. Call on mount. */
  loadNutritionData: (userId: string) => Promise<void>;

  addFood: (userId: string, input: CreateFoodInput) => Promise<{ data: Food | null; error: string | null }>;
  editFood: (foodId: string, input: CreateFoodInput) => Promise<{ error: string | null }>;
  removeFood: (foodId: string) => Promise<{ error: string | null }>;

  /** Log a meal and optimistically append it to today's logs. */
  logMeal: (userId: string, input: LogMealInput) => Promise<{ error: string | null }>;
  /** Remove a logged meal and optimistically drop it from today's logs. */
  removeMealLog: (mealLogId: string) => Promise<{ error: string | null }>;

  reset: () => void;
}

export function todayTotals(logs: MealLog[]): DailyNutritionTotals {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + log.calories,
      protein_g: totals.protein_g + log.protein_g,
      carbs_g: totals.carbs_g + log.carbs_g,
      fat_g: totals.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  myFoods: [],
  todayLogs: [],
  loading: false,
  error: null,

  loadNutritionData: async (userId) => {
    set({ loading: true, error: null });
    const [foodsResult, logsResult] = await Promise.all([
      fetchMyFoods(userId),
      fetchTodayMealLogs(userId),
    ]);
    set({
      myFoods: foodsResult.data,
      todayLogs: logsResult.data,
      loading: false,
      error: foodsResult.error ?? logsResult.error,
    });
  },

  addFood: async (userId, input) => {
    const { data, error } = await createFoodAPI(userId, input);
    if (data) {
      set((state) => ({ myFoods: [...state.myFoods, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    }
    return { data, error };
  },

  editFood: async (foodId, input) => {
    const { data, error } = await updateFoodAPI(foodId, input);
    if (data) {
      set((state) => ({
        myFoods: state.myFoods
          .map((f) => (f.id === foodId ? data : f))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
    }
    return { error };
  },

  removeFood: async (foodId) => {
    const { error } = await deleteFoodAPI(foodId);
    if (!error) {
      set((state) => ({ myFoods: state.myFoods.filter((f) => f.id !== foodId) }));
    }
    return { error };
  },

  logMeal: async (userId, input) => {
    const { data, error } = await logMealAPI(userId, input);
    if (error || !data) return { error };
    set((state) => ({ todayLogs: [...state.todayLogs, data] }));
    return { error: null };
  },

  removeMealLog: async (mealLogId) => {
    const previous = get().todayLogs;
    set({ todayLogs: previous.filter((l) => l.id !== mealLogId) });
    const { error } = await deleteMealLogAPI(mealLogId);
    if (error) {
      // Roll back — the delete didn't actually happen.
      set({ todayLogs: previous });
    }
    return { error };
  },

  reset: () => {
    set({ myFoods: [], todayLogs: [], loading: false, error: null });
  },
}));
