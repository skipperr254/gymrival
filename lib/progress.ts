import { supabase } from '@/lib/supabase';
import type { ExerciseUnit } from '@/types/pr';
import type { ProgressStats, StrengthSeries, ProgressPoint, CheckinDay } from '@/types/progress';

const BIG3_SET = new Set(['bench', 'squat', 'deadlift']);
const HEATMAP_DAYS = 84; // 12 weeks

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRunningSeries(
  prs: Array<{ value: number; created_at: string }>,
  exerciseKey: string,
  label: string,
  unit: ExerciseUnit
): StrengthSeries {
  const points: ProgressPoint[] = [];
  let runningBest = Number.NEGATIVE_INFINITY;

  for (const pr of prs) {
    const value = Number(pr.value);
    if (isNaN(value)) continue;
    if (value > runningBest) {
      runningBest = value;
      const date = pr.created_at.split('T')[0];
      const last = points[points.length - 1];
      // Collapse same-day improvements into a single point
      if (last && last.date === date) {
        last.value = value;
      } else {
        points.push({ date, value });
      }
    }
  }

  return { exerciseKey, label, unit, points };
}

/**
 * Computes consecutive-day check-in streak using UTC dates.
 * Mirrors the UTC date logic used by the award_checkin_xp DB trigger and
 * the hasCheckinToday helper in lib/checkin.ts.
 */
function computeStreakFromDates(dates: Set<string>): number {
  if (dates.size === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayStr = today.toISOString().split('T')[0];
  const cursor = new Date(today);

  // If today has no check-in, start counting from yesterday
  if (!dates.has(todayStr)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];
    if (dates.has(dateStr)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Fetches all personal records for a user and builds:
 *   - A running-best StrengthSeries per exercise (only exercises with >= 1 PR)
 *   - A derived Big 3 Total series (bench + squat + deadlift combined best)
 *
 * Both are derived from a single DB call, ordered by created_at ASC so the
 * running-best algorithm processes entries in chronological order.
 */
export async function fetchStrengthData(userId: string): Promise<{
  data: { series: StrengthSeries[]; bigThreeTotal: StrengthSeries | null } | null;
  error: string | null;
}> {
  const [prsResult, exercisesResult] = await Promise.all([
    supabase
      .from('personal_records')
      .select('exercise_key, value, unit, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('exercise_types')
      .select('key, label, unit'),
  ]);

  if (prsResult.error) return { data: null, error: prsResult.error.message };

  const allPRs = prsResult.data ?? [];

  const exerciseMap = new Map<string, { label: string; unit: ExerciseUnit }>(
    (exercisesResult.data ?? []).map((e) => [
      e.key,
      { label: e.label, unit: e.unit as ExerciseUnit },
    ])
  );

  // Group rows by exercise_key, preserving chronological order from ASC query
  const grouped = new Map<string, Array<{ value: number; created_at: string }>>();
  for (const pr of allPRs) {
    if (!grouped.has(pr.exercise_key)) grouped.set(pr.exercise_key, []);
    grouped.get(pr.exercise_key)!.push({
      value: Number(pr.value),
      created_at: pr.created_at,
    });
  }

  // Build per-exercise running-best series
  const series: StrengthSeries[] = [];
  for (const [key, prs] of grouped) {
    const meta = exerciseMap.get(key);
    if (!meta) continue;
    const s = buildRunningSeries(prs, key, meta.label, meta.unit);
    if (s.points.length > 0) series.push(s);
  }

  // Build Big 3 Total — derived from the same allPRs, treating missing lifts as 0
  const big3PRs = allPRs.filter((pr) => BIG3_SET.has(pr.exercise_key));
  let bigThreeTotal: StrengthSeries | null = null;

  if (big3PRs.length > 0) {
    const bests: Record<string, number> = { bench: 0, squat: 0, deadlift: 0 };
    const points: ProgressPoint[] = [];

    for (const pr of big3PRs) {
      const value = Number(pr.value);
      if (isNaN(value)) continue;
      if (value > bests[pr.exercise_key]) {
        bests[pr.exercise_key] = value;
        const total = bests.bench + bests.squat + bests.deadlift;
        const date = pr.created_at.split('T')[0];
        const last = points[points.length - 1];
        if (last && last.date === date) {
          last.value = total;
        } else {
          points.push({ date, value: total });
        }
      }
    }

    if (points.length > 0) {
      bigThreeTotal = { exerciseKey: 'big3_total', label: 'Big 3 Total', unit: 'kg', points };
    }
  }

  return { data: { series, bigThreeTotal }, error: null };
}

/**
 * Fetches the current user's progress stats:
 *   - level + xp from profiles
 *   - totalPRs: total personal_records row count
 *   - checkinStreak: consecutive-day streak computed from gym_checkins (UTC dates)
 *   - workoutsCompleted: count of completed workout_logs
 */
export async function fetchProgressStats(userId: string): Promise<{
  data: ProgressStats | null;
  error: string | null;
}> {
  // Look back up to a year for streak computation
  const streakLookback = new Date();
  streakLookback.setUTCHours(0, 0, 0, 0);
  streakLookback.setUTCDate(streakLookback.getUTCDate() - 365);

  const [profileResult, prCountResult, checkinResult, workoutCountResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', userId)
      .single(),
    supabase
      .from('personal_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('gym_checkins')
      .select('checked_in_at')
      .eq('user_id', userId)
      .gte('checked_in_at', streakLookback.toISOString())
      .order('checked_in_at', { ascending: false }),
    supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_complete', true),
  ]);

  if (profileResult.error) return { data: null, error: profileResult.error.message };

  const profile = profileResult.data;

  const distinctDates = new Set<string>(
    (checkinResult.data ?? []).map((row) => row.checked_in_at.split('T')[0])
  );

  return {
    data: {
      level: profile.level ?? 1,
      xp: profile.xp ?? 0,
      totalPRs: prCountResult.count ?? 0,
      checkinStreak: computeStreakFromDates(distinctDates),
      workoutsCompleted: workoutCountResult.count ?? 0,
    },
    error: null,
  };
}

/**
 * Fetches gym check-ins for the last 12 weeks (84 days), aggregated to
 * per-day counts for the heatmap display.
 */
export async function fetchCheckinHeatmap(userId: string): Promise<{
  data: CheckinDay[];
  error: string | null;
}> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - HEATMAP_DAYS);

  const { data, error } = await supabase
    .from('gym_checkins')
    .select('checked_in_at')
    .eq('user_id', userId)
    .gte('checked_in_at', since.toISOString())
    .order('checked_in_at', { ascending: true });

  if (error) return { data: [], error: error.message };

  const dayCount = new Map<string, number>();
  for (const row of data ?? []) {
    const date = row.checked_in_at.split('T')[0];
    dayCount.set(date, (dayCount.get(date) ?? 0) + 1);
  }

  return {
    data: Array.from(dayCount.entries()).map(([date, count]) => ({ date, count })),
    error: null,
  };
}
