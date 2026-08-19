import "../global.css";

import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { reloadAppAsync } from "expo";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { stackScreenOptions } from "@/constants/navigation";
import i18n, { initI18n } from "@/lib/i18n";
import { isSupportedLanguage } from "@/lib/i18n/languages";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n/languageDetector";
import { applyLayoutDirection } from "@/lib/i18n/rtl";

// Once a user has explicitly picked a language (profiles.language is set),
// that choice is the cross-device source of truth and wins over whatever
// the device's own locale detects. NULL means "keep following the device".
async function syncProfileLanguage(userId: string) {
  const { data: language } = await getUserLanguage(userId);
  if (language && isSupportedLanguage(language) && language !== i18n.language) {
    await i18n.changeLanguage(language);
    // Crossing the LTR/RTL boundary (e.g. first sign-in on a new device with
    // an Arabic profile) needs a reload for the flipped layout to apply.
    // Cache the language explicitly first so the post-reload detector reads
    // the synced value deterministically instead of racing i18next's own
    // fire-and-forget cacheUserLanguage write.
    if (Platform.OS !== "web" && applyLayoutDirection(language)) {
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // best-effort — worst case the sync runs once more after reload
      }
      reloadAppAsync("rtl-direction-sync");
    }
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

  // Per-field selectors — the root layout must not re-render on unrelated
  // store changes (e.g. every realtime notification insert re-rendered the
  // entire navigation tree when this subscribed to the whole store).
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const pendingPasswordReset = useAuthStore((s) => s.pendingPasswordReset);
  const pendingProfileSetup = useAuthStore((s) => s.pendingProfileSetup);
  const initialize = useAuthStore((s) => s.initialize);
  const segments = useSegments();
  const router = useRouter();
  const startPresenceHeartbeat = useChatStore((s) => s.startPresenceHeartbeat);
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const subscribeToNotifications = useNotificationStore((s) => s.subscribeToNotifications);
  const notifCleanupRef = useRef<(() => void) | null>(null);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    initI18n().then(() => {
      // A fresh install on an Arabic-locale device detects `ar` before
      // forceRTL has ever been called — reconcile and reload (behind the
      // splash screen, which stays up until i18nReady). On later cold starts
      // the persisted native direction already matches, so this no-ops.
      if (Platform.OS !== "web" && applyLayoutDirection(i18n.language)) {
        reloadAppAsync("rtl-direction-sync");
        return;
      }
      setI18nReady(true);
    });
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
    // "(stack)" holds every drill-down screen pushed on top of the tab
    // navigator (chat, challenge detail, settings, ...) — it's just as much
    // a signed-in-only area as "(tabs)" itself, so a session lost while
    // sitting on one of those screens must redirect too.
    const inAuthenticatedGroup = segments[0] === "(tabs)" || segments[0] === "(stack)";

    if (session && inAuthGroup && !pendingPasswordReset && !pendingProfileSetup) {
      router.replace(Routes.compete);
    } else if (!session && inAuthenticatedGroup) {
      router.replace(Routes.splash as any);
    }
  }, [session, initialized, segments, pendingPasswordReset, pendingProfileSetup, fontsLoaded, fontError, i18nReady, router]);

  if ((!fontsLoaded && !fontError) || !initialized || !i18nReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The push from a tab into a drill-down screen is a cross-group
          transition — (tabs) to (stack) — handled by THIS root stack, not
          (stack)/_layout.tsx's own nested Stack (that one only governs
          navigation between screens already inside the group). Without this
          explicit override the transition silently fell back to each
          platform's raw native-stack default: a fine slide on iOS, but an
          Android default that reads as a fade, not the WhatsApp-style slide
          both platforms should have. */}
      <Stack.Screen name="(stack)" options={stackScreenOptions} />
    </Stack>
  );
}
