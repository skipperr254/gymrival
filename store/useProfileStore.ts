import { create } from "zustand";
import type { Profile } from "@/types/user";
import type { PersonalRecordWithExercise, PRHistoryGroup } from "@/types/pr";
import {
  fetchProfile,
  fetchBestPRs,
  fetchPRHistory,
  deletePersonalRecord,
  updateProfile as updateProfileApi,
  uploadAvatar as uploadAvatarApi,
  removeAvatar as removeAvatarApi,
  updatePushEnabled as updatePushEnabledApi,
} from "@/lib/api";

type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "username"
    | "full_name"
    | "height_cm"
    | "weight_kg"
    | "gym"
    | "goal"
    | "bio"
    | "quote"
    | "age"
    | "sex"
    | "activity_level"
    | "diet_goal"
    | "target_calories"
    | "target_protein_g"
    | "target_carbs_g"
    | "target_fat_g"
  >
>;

interface ProfileState {
  profile: Profile | null;
  bestPRs: PersonalRecordWithExercise[];
  prCount: number;
  prHistory: PRHistoryGroup[];
  loading: boolean;
  /** Own flag for loadPRHistory — it previously had none, so pr-history.tsx's
   * loading check (bound to the shared `loading`, only ever set by
   * loadProfile) was already false by the time this screen opened, and it
   * flashed the "No PRs yet" empty state before the real list arrived. */
  prHistoryLoading: boolean;
  saving: boolean;
  avatarUploading: boolean;
  error: string | null;

  loadProfile: (userId: string) => Promise<void>;
  loadBestPRs: (userId: string) => Promise<void>;
  loadPRHistory: (userId: string) => Promise<void>;
  /**
   * Deletes a PR the user owns. The XP/level clawback happens server-side
   * (delete_personal_record RPC), so on success this just re-fetches the
   * profile, best-PRs, and history rather than hand-patching every derived
   * aggregate (best-per-exercise, distinct-exercise count) locally.
   */
  deletePR: (userId: string, prId: string) => Promise<{ error: string | null }>;
  // No setProStatus: `is_pro` is server-owned as of migration 044 and mirrors
  // `public.subscriptions`. Read Pro state with useEntitlement(), never from
  // `profile.is_pro` — see store/useEntitlementStore.ts.
  setPushEnabled: (userId: string, enabled: boolean) => Promise<{ error: string | null }>;
  updateProfile: (userId: string, data: ProfileUpdate) => Promise<{ error: string | null; code: string | null }>;
  uploadAvatar: (userId: string, imageUri: string, mimeType: string) => Promise<{ error: string | null }>;
  removeAvatar: (userId: string) => Promise<{ error: string | null }>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  bestPRs: [],
  prCount: 0,
  prHistory: [],
  loading: false,
  prHistoryLoading: false,
  saving: false,
  avatarUploading: false,
  error: null,

  loadProfile: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await fetchProfile(userId);
    set({ profile: data, loading: false, error });
  },

  loadBestPRs: async (userId) => {
    const { data, count } = await fetchBestPRs(userId, 5);
    set({ bestPRs: data, prCount: count });
  },

  loadPRHistory: async (userId) => {
    set({ prHistoryLoading: true });
    const { data } = await fetchPRHistory(userId);
    set({ prHistory: data, prHistoryLoading: false });
  },

  deletePR: async (userId, prId) => {
    const { error } = await deletePersonalRecord(prId);
    if (!error) {
      await Promise.all([
        get().loadProfile(userId),
        get().loadBestPRs(userId),
        get().loadPRHistory(userId),
      ]);
    }
    return { error };
  },

  setPushEnabled: async (userId, enabled) => {
    const { error } = await updatePushEnabledApi(userId, enabled);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, push_enabled: enabled } : null,
      }));
    }
    return { error };
  },

  updateProfile: async (userId, data) => {
    set({ saving: true });
    const { error, code } = await updateProfileApi(userId, data);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...data } : null,
        saving: false,
      }));
    } else {
      set({ saving: false });
    }
    return { error, code };
  },

  uploadAvatar: async (userId, imageUri, mimeType) => {
    set({ avatarUploading: true });
    const { avatarUrl, error } = await uploadAvatarApi(userId, imageUri, mimeType);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatar_url: avatarUrl } : null,
        avatarUploading: false,
      }));
    } else {
      set({ avatarUploading: false });
    }
    return { error };
  },

  removeAvatar: async (userId) => {
    set({ avatarUploading: true });
    const { error } = await removeAvatarApi(userId);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, avatar_url: null } : null,
        avatarUploading: false,
      }));
    } else {
      set({ avatarUploading: false });
    }
    return { error };
  },

  reset: () =>
    set({
      profile: null,
      bestPRs: [],
      prCount: 0,
      prHistory: [],
      loading: false,
      prHistoryLoading: false,
      saving: false,
      avatarUploading: false,
      error: null,
    }),
}));
