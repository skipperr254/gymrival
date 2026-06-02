export const Routes = {
  // Auth
  splash: '/(auth)/splash',
  onboarding: '/(auth)/onboarding',
  signIn: '/(auth)/sign-in',
  signUp: '/(auth)/sign-up',
  verify: '/(auth)/verify',
  setup: '/(auth)/setup',
  forgotPassword: '/(auth)/forgot-password',
  resetPassword: '/(auth)/reset-password',

  // Compete tab
  compete: '/(tabs)/compete',
  challengeDetail: (id: string) => `/(tabs)/compete/challenge/${id}`,

  // Social tab
  social: '/(tabs)/social',
  socialFriends: '/(tabs)/social/friends',
  chat: (userId: string) => `/(tabs)/social/chat/${userId}`,

  // Train tab
  train: '/(tabs)/train',
  trainCheckin: '/(tabs)/train/checkin',

  // Profile tab
  profile: '/(tabs)/profile',
  profileEdit: '/(tabs)/profile/edit',
  profilePRHistory: '/(tabs)/profile/pr-history',
  profileBadges: '/(tabs)/profile/badges',
  notifications: '/(tabs)/profile/notifications',
} as const;
