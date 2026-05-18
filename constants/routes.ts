export const Routes = {
  splash: "/(auth)/splash",
  onboarding: "/(auth)/onboarding",
  signIn: "/(auth)/sign-in",
  signUp: "/(auth)/sign-up",
  compete: "/(tabs)/compete",
  social: "/(tabs)/social",
  train: "/(tabs)/train",
  profile: "/(tabs)/profile",
  challengeDetail: (id: string) => `/(tabs)/compete/challenge/${id}`,
  chat: (userId: string) => `/(tabs)/social/chat/${userId}`,
  schemaDetail: (id: string) => `/(tabs)/train/schema/${id}`,
} as const;
