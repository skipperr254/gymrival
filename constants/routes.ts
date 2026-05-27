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
  competeGlobal: '/(tabs)/compete/global',
  competeChallenges: '/(tabs)/compete/challenges',
  challengeDetail: (id: string) => `/(tabs)/compete/challenge/${id}`,

  // Social tab
  social: '/(tabs)/social',
  socialFriends: '/(tabs)/social/friends',
  socialMessages: '/(tabs)/social/messages',
  chat: (userId: string) => `/(tabs)/social/chat/${userId}`,

  // Train tab
  train: '/(tabs)/train',
  trainWod: '/(tabs)/train/wod',
trainSchemas: '/(tabs)/train/schema',
  schemaDetail: (id: string) => `/(tabs)/train/schema/${id}`,
  trainCoach: '/(tabs)/train/coach',
  trainCheckin: '/(tabs)/train/checkin',
  trainMacros: '/(tabs)/train/macros',
  trainBodyScan: '/(tabs)/train/bodyscan',
  trainWeight: '/(tabs)/train/weight',
  trainProgress: '/(tabs)/train/progress',

  // Profile tab
  profile: '/(tabs)/profile',
  profileEdit: '/(tabs)/profile/edit',
  profilePRHistory: '/(tabs)/profile/pr-history',
  profileBadges: '/(tabs)/profile/badges',

  // Dev
  gallery: '/gallery',
} as const;
