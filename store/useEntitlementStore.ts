import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { fetchSubscription } from '@/lib/api/billing';
import {
  isEntitled,
  type EntitlementSnapshot,
  type EntitlementSource,
  type EntitlementTier,
} from '@/lib/billing/types';

/**
 * Who is Pro, and how we know.
 *
 * Three inputs, unioned rather than ranked:
 *
 *   server  — `public.subscriptions`, written only by the billing webhook.
 *             The authority. Every RLS policy and gating RPC reads the
 *             `profiles.is_pro` mirror of exactly this row.
 *   device  — the store SDK's local receipt cache. Instant, but client-side and
 *             therefore never trusted for enforcement.
 *   cache   — the last snapshot we persisted, replayed at cold start.
 *
 * The union is deliberate. Server alone makes a just-completed purchase feel
 * broken for the second or two the webhook takes to land. Device alone loses
 * access offline and can be spoofed. Neither is dangerous on its own here,
 * because nothing in this store *enforces* anything — the server does. This
 * only decides how the UI looks.
 */

const CACHE_PREFIX = 'gymrival:entitlement:';

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

async function readCache(userId: string): Promise<EntitlementSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as EntitlementSnapshot) : null;
  } catch {
    // A corrupt entry just means one cold start renders free until the server
    // answers — never a reason to fail the boot.
    return null;
  }
}

async function writeCache(userId: string, snapshot: EntitlementSnapshot | null): Promise<void> {
  try {
    if (snapshot) await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(snapshot));
    else await AsyncStorage.removeItem(cacheKey(userId));
  } catch {
    // Losing the cache costs a brief free-tier flash on the next cold start.
  }
}

interface EntitlementState {
  server: EntitlementSnapshot | null;
  device: EntitlementSnapshot | null;
  /** Replayed from disk at cold start; ignored once `resolved` is true. */
  cached: EntitlementSnapshot | null;
  /** True once the server has answered at least once this session. */
  resolved: boolean;
  loading: boolean;
  error: string | null;
  /**
   * __DEV__-only local override for exercising gates without a sandbox
   * purchase. Purely client-side — it cannot and must not affect anything the
   * server enforces. To test a *server* gate, insert a `provider: 'manual'`
   * row in `subscriptions` with the service role.
   */
  devOverride: boolean;

  load: (userId: string) => Promise<void>;
  refresh: (userId: string) => Promise<void>;
  setDeviceSnapshot: (snapshot: EntitlementSnapshot | null) => void;
  setDevOverride: (value: boolean) => void;
  reset: () => void;
}

const initial = {
  server: null,
  device: null,
  cached: null,
  resolved: false,
  loading: false,
  error: null,
  devOverride: false,
} as const;

export const useEntitlementStore = create<EntitlementState>((set, get) => ({
  ...initial,

  /** Cold-start path: replay the cache immediately, then confirm with the server. */
  load: async (userId) => {
    set({ loading: true, error: null });
    const cached = await readCache(userId);
    // Only apply the cache if the server hasn't already answered — `load` can
    // race a `refresh` triggered by the app returning to the foreground.
    if (!get().resolved) set({ cached });
    await get().refresh(userId);
  },

  refresh: async (userId) => {
    const { data, error } = await fetchSubscription(userId);
    if (error) {
      // Offline or a transient failure: keep whatever we already believe rather
      // than downgrading a paying user to free on a dropped request.
      set({ loading: false, error });
      return;
    }
    set({ server: data, resolved: true, loading: false, error: null });
    writeCache(userId, data);
  },

  /** Fed by the billing adapter's own listener (Phase 1). */
  setDeviceSnapshot: (snapshot) => set({ device: snapshot }),

  setDevOverride: (value) => {
    if (!__DEV__) return;
    set({ devOverride: value });
  },

  reset: () => set({ ...initial }),
}));

/**
 * Resolves the effective tier from the union above.
 *
 * Exported as a plain function (not a hook) so non-React callers — API helpers,
 * the paywall registry — can ask the same question the UI asks, and get the
 * same answer.
 */
export function selectIsPro(state: EntitlementState): boolean {
  if (state.devOverride) return true;
  if (isEntitled(state.server)) return true;
  if (isEntitled(state.device)) return true;
  // The cache is only allowed to speak before the server has.
  if (!state.resolved && isEntitled(state.cached)) return true;
  return false;
}

export function selectTier(state: EntitlementState): EntitlementTier {
  return selectIsPro(state) ? 'pro' : 'free';
}

export function selectSource(state: EntitlementState): EntitlementSource {
  if (isEntitled(state.server)) return 'server';
  if (isEntitled(state.device)) return 'device';
  if (!state.resolved && isEntitled(state.cached)) return 'cache';
  return 'none';
}

/** Clears the persisted tier for a user — call on sign-out, before the store reset. */
export async function clearEntitlementCache(userId: string): Promise<void> {
  await writeCache(userId, null);
}
