import { Redirect } from "expo-router";
import { Routes } from "@/constants/routes";
import { useAuthStore } from "@/store/useAuthStore";

// Root layout keeps the native splash screen up until auth is initialized,
// so by the time this mounts `session`/pending flags already reflect
// reality — no loading UI needed here, just the routing decision.
export default function Index() {
  const session = useAuthStore((s) => s.session);
  const pendingProfileSetup = useAuthStore((s) => s.pendingProfileSetup);
  const pendingPasswordReset = useAuthStore((s) => s.pendingPasswordReset);
  const pendingOnboardingPayoff = useAuthStore((s) => s.pendingOnboardingPayoff);

  if (session && pendingProfileSetup) return <Redirect href={Routes.setup} />;
  if (session && pendingPasswordReset) return <Redirect href={Routes.resetPassword} />;
  // Killed the app on the payoff screen: resume it rather than skipping past.
  // Without this the flag would stay set in AsyncStorage forever, and the
  // root layout's auth gate would refuse to release them from (auth) if they
  // ever landed back there.
  if (session && pendingOnboardingPayoff) return <Redirect href={Routes.planReady as never} />;
  if (session) return <Redirect href={Routes.compete} />;
  return <Redirect href={Routes.splash as any} />;
}
