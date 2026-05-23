import { create } from "zustand";
import type { ExerciseType } from "@/types/pr";
import type { RivalEntry } from "@/types/compete";
import { fetchExerciseTypes, fetchRivalsLeaderboard } from "@/lib/api";

interface CompeteState {
  exercises: ExerciseType[];
  selectedExercise: string;
  rivals: RivalEntry[];
  loadingExercises: boolean;
  loadingRivals: boolean;
  error: string | null;

  loadExercises: () => Promise<void>;
  loadRivals: (userId: string) => Promise<void>;
  setSelectedExercise: (key: string, userId: string) => Promise<void>;
  reset: () => void;
}

export const useCompeteStore = create<CompeteState>((set, get) => ({
  exercises: [],
  selectedExercise: "bench",
  rivals: [],
  loadingExercises: false,
  loadingRivals: false,
  error: null,

  loadExercises: async () => {
    if (get().exercises.length > 0) return;
    set({ loadingExercises: true });
    const { data, error } = await fetchExerciseTypes();
    set({ exercises: data, loadingExercises: false, error });
  },

  loadRivals: async (userId) => {
    set({ loadingRivals: true, error: null });
    const { data, error } = await fetchRivalsLeaderboard(userId, get().selectedExercise);
    set({ rivals: data, loadingRivals: false, error });
  },

  setSelectedExercise: async (key, userId) => {
    set({ selectedExercise: key });
    await get().loadRivals(userId);
  },

  reset: () =>
    set({
      exercises: [],
      selectedExercise: "bench",
      rivals: [],
      loadingExercises: false,
      loadingRivals: false,
      error: null,
    }),
}));
