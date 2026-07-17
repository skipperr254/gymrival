import "../global.css";

import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { savePushToken, getUserLanguage } from "@/lib/api";
import { Routes } from "@/constants/routes";
import i18n, { initI18n } from "@/lib/i18n";
import { isSupportedLanguage } from "@/lib/i18n/languages";

// Once a user has explicitly picked a language (profiles.language is set),
// that choice is the cross-device source of truth and wins over whatever
// the device's own locale detects. NULL means "keep following the device".
async function syncProfileLanguage(userId: string) {
  const { data: language } = await getUserLanguage(userId);
  if (language && isSupportedLanguage(language) && language !== i18n.language) {
    await i18n.changeLanguage(language);
  }
}

SplashScreen.preventAutoHideAsync();

// Push-notification registration.
// expo-notifications requires a custom dev/standalone build — its native module
// is not present in Expo Go (removed since SDK 53) and is also absent from a
// dev client built before the package was added. We skip Expo Go up front and
// wrap the require() so a missing native module can never crash the app.
async function registerPushToken(userId: string) {
  // storeClient = running inside Expo Go; remote push is unsupported there.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  let Notifications: typeof import("expo-notifications");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications");
  } catch {
    // Native module not compiled into this build (e.g. stale dev client).
    // Rebuild the dev client to enable push. Skip silently for now.
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await savePushToken(userId, tokenData.data);
  } catch {
    // Best-effort — never crash the app over push registration.
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const { session, initialized, pendingPasswordReset, pendingProfileSetup, initialize } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const startPresenceHeartbeat = useChatStore((s) => s.startPresenceHeartbeat);
  const { loadNotifications, subscribeToNotifications, reset: resetNotifications } =
    useNotificationStore();
  const notifCleanupRef = useRef<(() => void) | null>(null);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  // Once signed in, an explicit language choice stored on the profile
  // overrides the device-detected language used at first launch.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    syncProfileLanguage(userId);
  }, [session?.user?.id]);

  // Keep presence alive for the entire authenticated session
  useEffect(() => {
    if (!session?.user?.id) return;
    return startPresenceHeartbeat(session.user.id);
  }, [session?.user?.id, startPresenceHeartbeat]);

  // Load notifications + subscribe to realtime when authenticated
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      resetNotifications();
      return;
    }

    loadNotifications(userId);
    notifCleanupRef.current = subscribeToNotifications(userId);

    return () => {
      notifCleanupRef.current?.();
      notifCleanupRef.current = null;
    };
  }, [session?.user?.id, loadNotifications, subscribeToNotifications, resetNotifications]);

  // Register device push token — silently skipped in Expo Go
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    registerPushToken(userId);
  }, [session?.user?.id]);

  // Hide splash once fonts, auth state, AND i18n are ready
  useEffect(() => {
    if ((fontsLoaded || fontError) && initialized && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, initialized, i18nReady]);

  // Auth gate
  useEffect(() => {
    if (!initialized || (!fontsLoaded && !fontError) || !i18nReady) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (session && inAuthGroup && !pendingPasswordReset && !pendingProfileSetup) {
      router.replace(Routes.compete);
    } else if (!session && inTabsGroup) {
      router.replace(Routes.splash as any);
    }
  }, [session, initialized, segments, pendingPasswordReset, pendingProfileSetup, fontsLoaded, fontError, i18nReady, router]);

  if ((!fontsLoaded && !fontError) || !initialized || !i18nReady) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
