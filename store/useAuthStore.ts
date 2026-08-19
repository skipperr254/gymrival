import AsyncStorage from "@react-native-async-storage/async-storage";
import { forceLocalSignOut, supabase } from "@/lib/supabase";
import { clearPushToken } from "@/lib/api";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { useProfileStore } from "@/store/useProfileStore";
import { useCompeteStore } from "@/store/useCompeteStore";
import { useSocialStore } from "@/store/useSocialStore";
import { useChatStore } from "@/store/useChatStore";
import { useTrainStore } from "@/store/useTrainStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useNutritionStore } from "@/store/useNutritionStore";

// Not sensitive (just booleans marking "mid onboarding step"), so plain
// AsyncStorage is fine — this only needs to survive an app kill, not resist
// on-disk inspection.
const PENDING_PROFILE_SETUP_KEY = "gymrival:pendingProfileSetup";
const PENDING_PASSWORD_RESET_KEY = "gymrival:pendingPasswordReset";

// Not currently harmful (initialize() is idempotent-guarded and its only
// caller mounts once for the app's lifetime), but left unassigned this was
// a latent leak: every dev Fast Refresh of the root layout re-registered a
// listener with nothing ever unsubscribing the previous one.
let _authSubscription: { unsubscribe: () => void } | null = null;

function toErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

/** Clears every domain store so a signed-out (or about-to-switch) device never
 * keeps rendering the previous account's cached data. Exported so callers
 * that react to `session` becoming null for reasons other than an explicit
 * signOut() call (e.g. a passively-detected expired/revoked session) can
 * clear the same stores — see app/_layout.tsx. */
export function resetDomainStores() {
  useProfileStore.getState().reset();
  useCompeteStore.getState().reset();
  useSocialStore.getState().reset();
  useChatStore.getState().reset();
  useTrainStore.getState().reset();
  useNotificationStore.getState().reset();
  useNutritionStore.getState().reset();
}

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  pendingPasswordReset: boolean;
  pendingProfileSetup: boolean;

  initialize: () => void;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; emailNotConfirmed?: boolean }>;
  verifyOtp: (
    email: string,
    token: string,
    type: "signup" | "recovery"
  ) => Promise<{ error: string | null }>;
  resendOtp: (
    email: string,
    type: "signup" | "recovery"
  ) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (
    email: string
  ) => Promise<{ error: string | null }>;
  updatePassword: (
    password: string
  ) => Promise<{ error: string | null }>;
  setPendingPasswordReset: (value: boolean) => void;
  setPendingProfileSetup: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  pendingPasswordReset: false,
  pendingProfileSetup: false,

  initialize: () => {
    if (get().initialized) return;

    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem(PENDING_PROFILE_SETUP_KEY),
      AsyncStorage.getItem(PENDING_PASSWORD_RESET_KEY),
    ])
      .then(([{ data: { session } }, pendingSetup, pendingReset]) => {
        set({
          session,
          user: session?.user ?? null,
          // Restored so an app kill between "OTP verified" and "setup/reset
          // submitted" doesn't silently drop the user into the app with a
          // half-finished account, or strand them holding an unconsumed
          // recovery session (see setPendingProfileSetup/setPendingPasswordReset).
          pendingProfileSetup: pendingSetup === "1",
          pendingPasswordReset: pendingReset === "1",
          initialized: true,
        });
      })
      .catch(() => {
        // A corrupt/desynced storage entry (see lib/secureStorage.ts) can make
        // this reject instead of resolving. Never let the app hang on the
        // splash screen forever — fall back to "no session" so the auth gate
        // routes to sign-in.
        set({ session: null, user: null, initialized: true });
      });

    // Unsubscribe any prior listener before creating a new one — defensive
    // against this ever running more than once (e.g. dev Fast Refresh
    // remounting the root layout), which would otherwise accumulate
    // duplicate listeners each firing set() on every auth event.
    _authSubscription?.unsubscribe();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
    _authSubscription = subscription;
  },

  signUp: async (name, email, password) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const emailNotConfirmed = error.message
          .toLowerCase()
          .includes("email not confirmed");
        return { error: error.message, emailNotConfirmed };
      }
      return { error: null };
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  verifyOtp: async (email, token, type) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  resendOtp: async (email, type) => {
    try {
      if (type === "signup") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
        });
        return { error: error?.message ?? null };
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error: error?.message ?? null };
      }
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  resetPasswordForEmail: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  updatePassword: async (password) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: toErrorMessage(e) };
    }
  },

  setPendingPasswordReset: (value) => {
    set({ pendingPasswordReset: value });
    if (value) {
      AsyncStorage.setItem(PENDING_PASSWORD_RESET_KEY, "1").catch(() => {});
    } else {
      AsyncStorage.removeItem(PENDING_PASSWORD_RESET_KEY).catch(() => {});
    }
  },
  setPendingProfileSetup: (value) => {
    set({ pendingProfileSetup: value });
    if (value) {
      AsyncStorage.setItem(PENDING_PROFILE_SETUP_KEY, "1").catch(() => {});
    } else {
      AsyncStorage.removeItem(PENDING_PROFILE_SETUP_KEY).catch(() => {});
    }
  },

  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      // Best-effort — don't block sign-out on this. Unregister the device's
      // push token so a shared/reused device stops receiving this account's
      // notifications after a different user signs in.
      await clearPushToken(userId).catch(() => {});
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      // supabase.auth.signOut() tries to invalidate the session on the
      // server first and only clears local storage if that succeeds — on a
      // network failure it leaves a fully valid session persisted on disk,
      // so the app looks signed out but silently restores it on relaunch.
      // Force a local-only clear so this device actually ends up signed out.
      await forceLocalSignOut().catch(() => {});
    }
    // Signing out is a client-side navigation, not an app reload — every
    // domain store is a module-level singleton that otherwise survives
    // untouched. Without this, a second user signing in on the same device
    // session can see the previous account's cached profile/PRs/leaderboard/
    // chat data until each screen happens to remount and refetch.
    resetDomainStores();
    set({ session: null, user: null });
  },
}));
