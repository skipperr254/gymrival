import { supabase } from "@/lib/supabase";
import type { ExerciseType } from "@/types/pr";
import { exerciseLabel } from "@/lib/i18n/exercises";

export async function fetchExerciseTypes(): Promise<{ data: ExerciseType[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exercise_types")
    .select("key, label, unit")
    .order("key");
  return {
    data: ((data ?? []) as ExerciseType[]).map((e) => ({ ...e, label: exerciseLabel(e.key, e.label) })),
    error: error?.message ?? null,
  };
}
