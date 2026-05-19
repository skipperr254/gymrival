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

  const { session, initialized, pendingPasswordReset, initialize } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

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

    if (session && inAuthGroup && !pendingPasswordReset) {
      router.replace(Routes.compete);
    } else if (!session && inTabsGroup) {
      router.replace(Routes.onboarding);
    }
  }, [session, initialized, segments, pendingPasswordReset, fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || !initialized) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
