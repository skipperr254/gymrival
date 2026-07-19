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
import { resetDomainStores, useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { savePushToken, getUserLanguage, reconcileStaleVideoUploads } from "@/lib/api";
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

// Routes a tapped push notification to the relevant screen. Falls back to
// the Messages inbox for new_message taps rather than a specific chat: the
// push payload carries conversation_id (see migration 021), not the other
// participant's user id that Routes.chat() needs — precise deep-linking
// would need the edge function to also include actor_id in the push data,
// which is a separate, deliberate follow-up, not done here.
function routeForNotificationTap(data: Record<string, unknown> | undefined): string | null {
  switch (data?.type) {
    case "new_message":
      return Routes.socialMessages;
    case "friend_request":
    case "friend_request_accepted":
      return Routes.socialFriends;
    case "pr_liked":
    case "friend_pr":
      return Routes.social;
    default:
      return null;
  }
}

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
    handleNotification: async (notification) => {
      // Suppress the alert/sound (not the badge/notification-center entry —
      // the message still happened and should still count) for a message in
      // the conversation the user is actively looking at right now. The
      // edge function includes conversation_id in the push payload's data
      // for new_message (see migration 021's notifications.data), and
      // useChatStore tracks which conversation is open — read directly via
      // getState() since this handler runs outside any component.
      const data = notification.request.content.data as
        | { type?: string; conversation_id?: string }
        | undefined;
      const isOpenConversation =
        data?.type === "new_message" &&
        !!data.conversation_id &&
        useChatStore.getState().activeConversationId === data.conversation_id;

      return {
        shouldShowAlert: !isOpenConversation,
        shouldPlaySound: !isOpenConversation,
        shouldSetBadge: true,
        shouldShowBanner: !isOpenConversation,
        shouldShowList: true,
      };
    },
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
  const { loadNotifications, subscribeToNotifications } = useNotificationStore();
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

  // Load notifications + subscribe to realtime when authenticated. Also the
  // single place that reacts to a session becoming null for ANY reason —
  // explicit sign-out (which already clears stores itself, see
  // useAuthStore.signOut) or a passively-detected expired/revoked session —
  // so stale personal data never lingers in a domain store after the app no
  // longer considers itself signed in.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      resetDomainStores();
      return;
    }

    loadNotifications(userId);
    notifCleanupRef.current = subscribeToNotifications(userId);

    return () => {
      notifCleanupRef.current?.();
      notifCleanupRef.current = null;
    };
  }, [session?.user?.id, loadNotifications, subscribeToNotifications]);

  // Register device push token — silently skipped in Expo Go
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    registerPushToken(userId);
  }, [session?.user?.id]);

  // Tapping a push notification previously just opened the app to its
  // default route with no navigation at all — route to the relevant screen.
  useEffect(() => {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

    let Notifications: typeof import("expo-notifications");
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Notifications = require("expo-notifications");
    } catch {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      const target = routeForNotificationTap(data);
      if (target) router.push(target as never);
    });

    return () => subscription.remove();
  }, [router]);

  // Self-heal any of the user's own PR video uploads that got interrupted
  // (app killed / network dropped mid-upload) and are stuck showing
  // "uploading" forever — see reconcileStaleVideoUploads for details.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    reconcileStaleVideoUploads(userId);
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
