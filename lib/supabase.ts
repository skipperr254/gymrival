import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { secureStorage } from "./secureStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// AsyncStorage's web implementation touches `window.localStorage` with no
// guard, which crashes the Node process during Expo Router's web SSR
// (no `window` there). Only wire up storage where `window` actually exists.
const isServer = typeof window === "undefined";

// expo-secure-store (iOS Keychain / Android Keystore) has no web
// implementation, so the AES+SecureStore adapter (lib/secureStorage.ts) only
// applies on native. Web keeps AsyncStorage (browser storage isn't part of
// the "unencrypted on-disk token" threat model this addresses).
function getAuthStorage() {
  if (isServer) return undefined;
  if (Platform.OS === "web") return AsyncStorage;
  return secureStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
