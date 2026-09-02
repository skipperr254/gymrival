import { supabase } from "@/lib/supabase";
import type { ExerciseType } from "@/types/pr";

export async function fetchExerciseTypes(): Promise<{ data: ExerciseType[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_types")
    .select("key, label, unit")
    .order("key");
  return {
    data: (data ?? []) as ExerciseType[],
    error: error?.message ?? null,
  };
}
