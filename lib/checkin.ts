import { supabase } from '@/lib/supabase';
import type { Gym, GymCheckin, GymWithCheckinCount, FriendCheckin, WeeklyStreakDay } from '@/types/train';
import { DAY_SHORT } from '@/types/train';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the Monday 00:00:00 and the following Monday 00:00:00, UTC.
 *
 * Deliberately UTC, not local time: fetchActiveCheckin/hasCheckinToday below
 * and the award_checkin_xp / gym_checkin_day DB functions (migrations 017,
 * 033) all define "day" as the UTC calendar day. Computing the streak's week
 * boundary in local time instead meant a check-in near local midnight could
 * be marked "today" in the streak UI while the DB trigger evaluated it
 * against a different UTC day — the XP banner could contradict the streak
 * display. Every day-boundary calculation in this file uses the same
 * reference now.
 */
function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

/**
 * Maps a JS Date (UTC calendar day) to a DayOfWeek index (0=Mon … 6=Sun).
 * Mirrors the DayOfWeek convention used throughout the app.
 */
function toDayIndex(date: Date): number {
  const utcDay = date.getUTCDay(); // 0=Sun … 6=Sat
  return utcDay === 0 ? 6 : utcDay - 1;
}

// ─── Gyms ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all gyms from the registry, each enriched with today's total check-in
 * count. The count comes from the `gym_today_checkin_counts` SECURITY DEFINER
 * RPC so it reflects all users at that gym, not just friends.
 */
export async function fetchGymsWithTodayCount(): Promise<{
  data: GymWithCheckinCount[];
  error: string | null;
}> {
  const [gymsResult, countsResult] = await Promise.all([
    supabase
      .from('gyms')
      .select('id, name, address, city, country, lat, lng, is_verified, created_by, created_at, updated_at')
      .order('name', { ascending: true }),
    supabase.rpc('gym_today_checkin_counts'),
  ]);

  if (gymsResult.error) return { data: [], error: gymsResult.error.message };

  const countMap = new Map<string, number>(
    ((countsResult.data as { gym_id: string; count: number }[]) ?? []).map(
      (r) => [r.gym_id, Number(r.count)]
    )
  );

  return {
    data: (gymsResult.data ?? []).map((g) => ({
      ...(g as Gym),
      lat: g.lat != null ? Number(g.lat) : null,
      lng: g.lng != null ? Number(g.lng) : null,
      today_count: countMap.get(g.id) ?? 0,
    })),
    error: null,
  };
}

// ─── Active check-in ──────────────────────────────────────────────────────────

/**
 * Returns the current user's check-in for today (UTC) if one exists, or null
 * if they haven't checked in yet today. Scoped to the UTC calendar day to
 * match gym_checkins_one_per_user_per_day (migration 033) and
 * award_checkin_xp() — without this, yesterday's check-in row (checked_out_at
 * is never set by the app; that flow is still deferred) would look "active"
 * forever and permanently block today's check-in.
 */
export async function fetchActiveCheckin(userId: string): Promise<{
  data: GymCheckin | null;
  error: string | null;
}> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('gym_checkins')
    .select('id, user_id, gym_id, checked_in_at, checked_out_at, workout_log_id, xp_awarded, note, created_at')
    .eq('user_id', userId)
    .is('checked_out_at', null)
    .gte('checked_in_at', todayStart.toISOString())
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data as GymCheckin | null, error: null };
}

/**
 * Check whether the user already has a check-in on the current UTC calendar day.
 * Used to determine if the upcoming check-in will earn XP.
 */
async function hasCheckinToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('gym_checkins')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_in_at', todayStart.toISOString());

  return (count ?? 0) > 0;
}

// ─── Check-in / undo ──────────────────────────────────────────────────────────

/**
 * Check in to a gym. Also returns whether XP was awarded (i.e. first check-in
 * of the UTC day). The XP is set by a DB trigger; this function predicts the
 * outcome by checking for an existing check-in before inserting.
 */
export async function checkinToGym(
  userId: string,
  gymId: string
): Promise<{ data: GymCheckin | null; xpAwarded: boolean; error: string | null }> {
  const alreadyCheckedInToday = await hasCheckinToday(userId);

  const { data, error } = await supabase
    .from('gym_checkins')
    .insert({ user_id: userId, gym_id: gymId })
    .select('id, user_id, gym_id, checked_in_at, checked_out_at, workout_log_id, xp_awarded, note, created_at')
    .single();

  if (error) return { data: null, xpAwarded: false, error: error.message };
  return {
    data: data as GymCheckin,
    xpAwarded: !alreadyCheckedInToday,
    error: null,
  };
}

/**
 * Undo a check-in by deleting the row. Only valid for the current user's rows.
 * The client should prevent undos after a reasonable window (e.g. today only),
 * but no time constraint is enforced at the DB level.
 */
export async function undoCheckin(checkinId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('gym_checkins')
    .delete()
    .eq('id', checkinId);

  return { error: error?.message ?? null };
}

// ─── Weekly streak ────────────────────────────────────────────────────────────

/**
 * Returns a 7-element array (Mon–Sun) indicating which days the user checked in
 * during the current local week. Uses local time for week boundaries so the
 * display matches the user's timezone.
 */
export async function fetchWeeklyStreak(userId: string): Promise<{
  data: WeeklyStreakDay[];
  error: string | null;
}> {
  const { start, end } = getWeekBounds();

  const { data, error } = await supabase
    .from('gym_checkins')
    .select('checked_in_at')
    .eq('user_id', userId)
    .gte('checked_in_at', start.toISOString())
    .lt('checked_in_at', end.toISOString());

  if (error) return { data: buildEmptyStreak(), error: error.message };

  const checkedDays = new Set(
    (data ?? []).map((row) => toDayIndex(new Date(row.checked_in_at)))
  );

  return {
    data: [0, 1, 2, 3, 4, 5, 6].map((idx) => ({
      day: DAY_SHORT[idx as keyof typeof DAY_SHORT],
      dayIndex: idx,
      checked: checkedDays.has(idx),
    })),
    error: null,
  };
}

function buildEmptyStreak(): WeeklyStreakDay[] {
  return [0, 1, 2, 3, 4, 5, 6].map((idx) => ({
    day: DAY_SHORT[idx as keyof typeof DAY_SHORT],
    dayIndex: idx,
    checked: false,
  }));
}

// ─── Friends checked in ────────────────────────────────────────────────────────

/**
 * Returns friends who checked in on the current UTC calendar day (see
 * getWeekBounds above for why UTC, not local time), joined with their
 * profile and gym name. Pass the current user's accepted friend IDs
 * (available from useSocialStore) so we only query relevant users.
 *
 * The RLS policy allows reading accepted friends' check-ins, so passing
 * friendIds here is primarily for performance (avoids scanning all users).
 */
export async function fetchFriendsCheckedIn(
  friendIds: string[]
): Promise<{ data: FriendCheckin[]; error: string | null }> {
  if (friendIds.length === 0) return { data: [], error: null };

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('gym_checkins')
    .select(`
      id, user_id, gym_id, checked_in_at,
      profile:profiles!gym_checkins_user_id_fkey(full_name, username, avatar_url),
      gym:gyms!gym_checkins_gym_id_fkey(name)
    `)
    .in('user_id', friendIds)
    .gte('checked_in_at', todayStart.toISOString())
    .order('checked_in_at', { ascending: false });

  if (error) return { data: [], error: error.message };

  const checkins: FriendCheckin[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    gym_id: row.gym_id,
    gym_name: row.gym?.name ?? 'Unknown gym',
    checked_in_at: row.checked_in_at,
    full_name: row.profile?.full_name ?? null,
    username: row.profile?.username ?? null,
    avatar_url: row.profile?.avatar_url ?? null,
  }));

  return { data: checkins, error: null };
}
