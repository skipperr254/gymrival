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

  if (session && pendingProfileSetup) return <Redirect href={Routes.setup} />;
  if (session && pendingPasswordReset) return <Redirect href={Routes.resetPassword} />;
  if (session) return <Redirect href={Routes.compete} />;
  return <Redirect href={Routes.splash as any} />;
}
