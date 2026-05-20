import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/user";
import type { PersonalRecordWithExercise, ExerciseType, ExerciseUnit } from "@/types/pr";

type ProfileUpdate = Partial<
  Pick<Profile, "username" | "full_name" | "height_cm" | "weight_kg" | "gym" | "goal" | "bio" | "quote">
>;

export async function updateProfile(
  userId: string,
  data: ProfileUpdate
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  return { error: error?.message ?? null };
}

export async function fetchProfile(
  userId: string
): Promise<{ data: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data: data as Profile | null, error: error?.message ?? null };
}

export async function fetchBestPRs(
  userId: string,
  limit: number
): Promise<{ data: PersonalRecordWithExercise[]; count: number; error: string | null }> {
  const [prsResult, exercisesResult] = await Promise.all([
    supabase
      .from("personal_records")
      .select("id, user_id, exercise_key, value, unit, created_at")
      .eq("user_id", userId)
      .order("value", { ascending: false }),
    supabase
      .from("exercise_types")
      .select("key, label, icon, unit"),
  ]);

  if (prsResult.error) {
    return { data: [], count: 0, error: prsResult.error.message };
  }

  const exerciseMap = new Map<string, ExerciseType>(
    (exercisesResult.data ?? []).map((e) => [e.key, e as ExerciseType])
  );

  const seen = new Set<string>();
  const deduped: PersonalRecordWithExercise[] = [];

  for (const row of prsResult.data ?? []) {
    if (seen.has(row.exercise_key)) continue;
    seen.add(row.exercise_key);

    const exercise = exerciseMap.get(row.exercise_key);
    if (!exercise) continue;

    deduped.push({
      id: row.id,
      user_id: row.user_id,
      exercise_key: row.exercise_key,
      value: Number(row.value),
      unit: row.unit as ExerciseUnit,
      created_at: row.created_at,
      exercise,
    });
  }

  return { data: deduped.slice(0, limit), count: deduped.length, error: null };
}

export async function togglePro(
  userId: string,
  isPro: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("id", userId);
  return { error: error?.message ?? null };
}
