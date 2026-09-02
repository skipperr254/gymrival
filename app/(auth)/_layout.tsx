import { Stack } from "expo-router";
import { stackScreenOptions } from "@/constants/navigation";

export default function AuthLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
