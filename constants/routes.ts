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
  challengeDetail: (id: string) => `/(stack)/challenge/${id}`,

  // Social tab
  social: '/(tabs)/social',
  socialFriends: '/(stack)/friends',
  socialMessages: '/(stack)/messages',
  chat: (userId: string) => `/(stack)/chat/${userId}`,

  // Train tab
  train: '/(tabs)/train',
  trainCheckin: '/(stack)/checkin',
  nutritionGoals: '/(stack)/nutrition-goals',

  // Profile tab
  profile: '/(tabs)/profile',
  profileEdit: '/(stack)/edit-profile',
  profilePRHistory: '/(stack)/pr-history',
  profileBadges: '/(stack)/badges',
  profileLanguage: '/(stack)/language',
  profileSettings: '/(stack)/settings',
  profileChangePassword: '/(stack)/change-password',
  notifications: '/(stack)/notifications',
} as const;
