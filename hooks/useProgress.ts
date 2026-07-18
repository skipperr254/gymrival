import { useState, useEffect, useCallback } from 'react';
import { fetchStrengthData, fetchProgressStats, fetchCheckinHeatmap } from '@/lib/progress';
import type { ProgressData } from '@/types/progress';

const EMPTY_STATS = {
  level: 1,
  xp: 0,
  totalPRs: 0,
  checkinStreak: 0,
  workoutsCompleted: 0,
} as const;

/**
 * Fetches all progress data for a single user in parallel.
 * Does not use global Zustand state — this is view-local data consumed only
 * by the Progress tab. Does not fetch when userId is undefined.
 */
export function useProgress(userId: string | undefined): {
  data: ProgressData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    const [strengthResult, statsResult, heatmapResult] = await Promise.all([
      fetchStrengthData(userId),
      fetchProgressStats(userId),
      fetchCheckinHeatmap(userId),
    ]);

    const firstError =
      strengthResult.error ?? statsResult.error ?? heatmapResult.error ?? null;

    if (firstError) {
      setError(firstError);
      setLoading(false);
      return;
    }

    setData({
      stats: statsResult.data ?? { ...EMPTY_STATS },
      series: strengthResult.data?.series ?? [],
      bigThreeTotal: strengthResult.data?.bigThreeTotal ?? null,
      checkins: heatmapResult.data,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
