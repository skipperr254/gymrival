import "../global.css";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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
import { Routes } from "@/constants/routes";

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Keep presence alive for the entire authenticated session
  useEffect(() => {
    if (!session?.user?.id) return;
    return startPresenceHeartbeat(session.user.id);
  }, [session?.user?.id, startPresenceHeartbeat]);

  // Hide splash once fonts AND auth state are ready
  useEffect(() => {
    if ((fontsLoaded || fontError) && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, initialized]);

  // Auth gate
  useEffect(() => {
    if (!initialized || (!fontsLoaded && !fontError)) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (session && inAuthGroup && !pendingPasswordReset && !pendingProfileSetup) {
      router.replace(Routes.compete);
    } else if (!session && inTabsGroup) {
      router.replace(Routes.splash as any);
    }
  }, [session, initialized, segments, pendingPasswordReset, pendingProfileSetup, fontsLoaded, fontError, router]);

  if ((!fontsLoaded && !fontError) || !initialized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
