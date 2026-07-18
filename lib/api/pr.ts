import { supabase } from "@/lib/supabase";
import type {
  PersonalRecordWithExercise,
  ExerciseType,
  ExerciseUnit,
  PRHistoryGroup,
  PRHistoryEntry,
  PRVideoStatus,
} from "@/types/pr";

const PR_VIDEOS_BUCKET = 'pr-videos';

/** Compute the public URL for a file path inside the pr-videos bucket. */
export function getPRVideoPublicUrl(path: string): string {
  return supabase.storage.from(PR_VIDEOS_BUCKET).getPublicUrl(path).data.publicUrl;
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

export async function logPersonalRecord(
  userId: string,
  exerciseKey: string,
  value: number,
  unit: ExerciseUnit
): Promise<{ data: { id: string } | null; error: string | null }> {
  const { data, error } = await supabase
    .from("personal_records")
    .insert({ user_id: userId, exercise_key: exerciseKey, value, unit })
    .select("id")
    .single();
  return { data: data ? { id: data.id } : null, error: error?.message ?? null };
}

export async function fetchPRHistory(
  userId: string
): Promise<{ data: PRHistoryGroup[]; error: string | null }> {
  const [prsResult, exercisesResult] = await Promise.all([
    supabase
      .from("personal_records")
      .select("id, exercise_key, value, unit, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("exercise_types")
      .select("key, label, icon, unit"),
  ]);

  if (prsResult.error) return { data: [], error: prsResult.error.message };

  const exerciseMap = new Map<string, ExerciseType>(
    (exercisesResult.data ?? []).map((e) => [e.key, e as ExerciseType])
  );

  const groupMap = new Map<string, PRHistoryGroup>();

  for (const row of prsResult.data ?? []) {
    const exercise = exerciseMap.get(row.exercise_key);
    if (!exercise) continue;

    const entry: PRHistoryEntry = {
      id: row.id,
      value: Number(row.value),
      unit: row.unit as ExerciseUnit,
      created_at: row.created_at,
    };

    if (!groupMap.has(row.exercise_key)) {
      groupMap.set(row.exercise_key, { exercise, best: entry.value, entries: [] });
    }

    const group = groupMap.get(row.exercise_key)!;
    group.entries.push(entry);
    if (entry.value > group.best) group.best = entry.value;
  }

  return { data: Array.from(groupMap.values()), error: null };
}

/**
 * Upload a video (and optional thumbnail) to Storage, create the pr_videos row,
 * and mark it ready on success.
 *
 * Returns the pr_videos row id on success.  The PR itself was already logged
 * before this is called — this function only handles the video side.
 */
export async function uploadPRVideo(
  userId: string,
  prId: string,
  videoUri: string,
  thumbnailUri: string | null,
  durationSec: number | null,
  fileSizeBytes: number | null
): Promise<{ prVideoId: string | null; error: string | null }> {
  // Derive extension and MIME type from the local URI
  const rawExt = videoUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'mp4';
  const videoExt = rawExt === 'mov' ? 'mov' : 'mp4';
  const videoMime = videoExt === 'mov' ? 'video/quicktime' : 'video/mp4';
  const videoPath = `${userId}/${prId}.${videoExt}`;
  const thumbnailPath = thumbnailUri ? `${userId}/${prId}_thumb.jpg` : null;

  // 1 — insert the row immediately so the owner's feed shows an "uploading" state
  const { data: inserted, error: insertErr } = await supabase
    .from('pr_videos')
    .insert({
      pr_id: prId,
      user_id: userId,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      duration_sec: durationSec,
      file_size_bytes: fileSizeBytes,
      status: 'uploading',
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return { prVideoId: null, error: insertErr?.message ?? 'Failed to create video record' };
  }

  const prVideoId = inserted.id as string;

  // 2 — upload thumbnail first (small, fast — failure is non-fatal)
  if (thumbnailUri && thumbnailPath) {
    try {
      const thumbForm = new FormData();
      thumbForm.append('file', { uri: thumbnailUri, type: 'image/jpeg', name: `${prId}_thumb.jpg` } as unknown as Blob);
      await supabase.storage
        .from(PR_VIDEOS_BUCKET)
        .upload(thumbnailPath, thumbForm, { contentType: 'image/jpeg', upsert: false });
    } catch {
      // Thumbnail failure is non-fatal; continue with video upload
    }
  }

  // 3 — upload video (FormData is required for local file URIs in React Native;
  //     fetch().blob() produces a non-serialisable object that the JS client cannot upload)
  let videoUploadError: string | null = null;
  try {
    const videoForm = new FormData();
    videoForm.append('file', { uri: videoUri, type: videoMime, name: `${prId}.${videoExt}` } as unknown as Blob);
    const { error: storageErr } = await supabase.storage
      .from(PR_VIDEOS_BUCKET)
      .upload(videoPath, videoForm, { contentType: videoMime, upsert: false });
    if (storageErr) videoUploadError = storageErr.message;
  } catch (e) {
    videoUploadError = e instanceof Error ? e.message : 'Upload failed';
  }

  // 4 — mark ready or failed
  const newStatus: PRVideoStatus = videoUploadError ? 'failed' : 'ready';
  const { error: updateErr } = await supabase
    .from('pr_videos')
    .update({ status: newStatus })
    .eq('id', prVideoId);

  if (videoUploadError) {
    return { prVideoId, error: videoUploadError };
  }
  if (updateErr) {
    return { prVideoId, error: updateErr.message };
  }
  return { prVideoId, error: null };
}

/**
 * Delete a PR's video — removes the pr_videos row and both Storage files.
 * Called when a user removes their video or when the PR itself is deleted
 * (the DB cascade handles the row; this cleans up Storage).
 */
export async function deletePRVideoFiles(
  userId: string,
  prId: string,
  videoPath: string,
  thumbnailPath: string | null
): Promise<{ error: string | null }> {
  const paths = [videoPath, ...(thumbnailPath ? [thumbnailPath] : [])];
  const { error } = await supabase.storage.from(PR_VIDEOS_BUCKET).remove(paths);
  // Also delete the DB row in case the caller doesn't cascade-delete the PR
  await supabase.from('pr_videos').delete().eq('pr_id', prId).eq('user_id', userId);
  return { error: error?.message ?? null };
}
