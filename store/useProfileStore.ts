import { create } from "zustand";
import type { Profile } from "@/types/user";
import type { PersonalRecordWithExercise, PRHistoryGroup } from "@/types/pr";
import { fetchProfile, fetchBestPRs, fetchPRHistory, togglePro as toggleProApi, updateProfile as updateProfileApi } from "@/lib/api";

type ProfileUpdate = Partial<
  Pick<Profile, "username" | "full_name" | "height_cm" | "weight_kg" | "gym" | "goal" | "bio" | "quote">
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
  error: string | null;

  loadProfile: (userId: string) => Promise<void>;
  loadBestPRs: (userId: string) => Promise<void>;
  loadPRHistory: (userId: string) => Promise<void>;
  setProStatus: (userId: string, isPro: boolean) => Promise<void>;
  updateProfile: (userId: string, data: ProfileUpdate) => Promise<{ error: string | null; code: string | null }>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  bestPRs: [],
  prCount: 0,
  prHistory: [],
  loading: false,
  prHistoryLoading: false,
  saving: false,
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

  setProStatus: async (userId, isPro) => {
    const { error } = await toggleProApi(userId, isPro);
    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, is_pro: isPro } : null,
      }));
    }
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

  reset: () =>
    set({
      profile: null,
      bestPRs: [],
      prCount: 0,
      prHistory: [],
      loading: false,
      prHistoryLoading: false,
      saving: false,
      error: null,
    }),
}));
