import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

interface AuthState {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  pendingPasswordReset: boolean;

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
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  pendingPasswordReset: false,

  initialize: () => {
    if (get().initialized) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });
  },

  signUp: async (name, email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
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
  },

  verifyOtp: async (email, token, type) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type });
    return { error: error?.message ?? null };
  },

  resendOtp: async (email, type) => {
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
  },

  resetPasswordForEmail: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  },

  setPendingPasswordReset: (value) => set({ pendingPasswordReset: value }),

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
