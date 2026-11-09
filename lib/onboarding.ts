import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActivityLevel, DietGoal } from '@/types/nutrition';

/**
 * The pre-sign-up onboarding quiz.
 *
 * The questions are asked before the user has an account, so the answers have
 * nowhere to live yet. They are cached here and flushed to `profiles` by the
 * setup screen once a user id exists.
 *
 * Two of the three answers feed Mifflin-St Jeor directly, which is what makes
 * the "your plan is ready" screen able to show a real number computed from
 * their own body rather than a generic welcome.
 */

const QUIZ_KEY = 'gymrival:onboardingQuiz';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingQuiz {
  /** -> profiles.diet_goal */
  dietGoal: DietGoal | null;
  /** -> profiles.activity_level */
  activityLevel: ActivityLevel | null;
  /** -> profiles.experience_level (migration 058) */
  experienceLevel: ExperienceLevel | null;
}

export const EMPTY_QUIZ: OnboardingQuiz = {
  dietGoal: null,
  activityLevel: null,
  experienceLevel: null,
};

/**
 * Option lists live at module level, so they store i18n **key paths** and are
 * resolved with `t()` at render time — the pattern used by TABS in the compete
 * screen. A module constant cannot call hooks.
 */
export const GOAL_OPTIONS: { value: DietGoal; labelKey: string; subKey: string }[] = [
  { value: 'lose', labelKey: 'quiz.goal.lose.label', subKey: 'quiz.goal.lose.sub' },
  { value: 'maintain', labelKey: 'quiz.goal.maintain.label', subKey: 'quiz.goal.maintain.sub' },
  { value: 'gain', labelKey: 'quiz.goal.gain.label', subKey: 'quiz.goal.gain.sub' },
];

/**
 * Training frequency maps onto the activity multiplier used by the TDEE
 * formula. `sedentary` is deliberately not offered: someone installing a
 * gym-competition app is not sedentary, and offering it would skew every
 * calorie target downwards.
 */
export const FREQUENCY_OPTIONS: { value: ActivityLevel; labelKey: string; subKey: string }[] = [
  { value: 'light', labelKey: 'quiz.frequency.light.label', subKey: 'quiz.frequency.light.sub' },
  { value: 'moderate', labelKey: 'quiz.frequency.moderate.label', subKey: 'quiz.frequency.moderate.sub' },
  { value: 'active', labelKey: 'quiz.frequency.active.label', subKey: 'quiz.frequency.active.sub' },
  { value: 'very_active', labelKey: 'quiz.frequency.veryActive.label', subKey: 'quiz.frequency.veryActive.sub' },
];

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; labelKey: string; subKey: string }[] = [
  { value: 'beginner', labelKey: 'quiz.experience.beginner.label', subKey: 'quiz.experience.beginner.sub' },
  { value: 'intermediate', labelKey: 'quiz.experience.intermediate.label', subKey: 'quiz.experience.intermediate.sub' },
  { value: 'advanced', labelKey: 'quiz.experience.advanced.label', subKey: 'quiz.experience.advanced.sub' },
];

export async function saveQuiz(quiz: OnboardingQuiz): Promise<void> {
  try {
    await AsyncStorage.setItem(QUIZ_KEY, JSON.stringify(quiz));
  } catch {
    // Losing the cache costs the user re-answering three taps, never a crash.
  }
}

export async function loadQuiz(): Promise<OnboardingQuiz> {
  try {
    const raw = await AsyncStorage.getItem(QUIZ_KEY);
    if (!raw) return EMPTY_QUIZ;
    const parsed = JSON.parse(raw) as Partial<OnboardingQuiz>;
    return { ...EMPTY_QUIZ, ...parsed };
  } catch {
    return EMPTY_QUIZ;
  }
}

export async function clearQuiz(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUIZ_KEY);
  } catch {
    // Worst case a stale answer set is re-applied on the next sign-up on this
    // device, which is harmless — setup overwrites all three fields anyway.
  }
}

/**
 * The quiz answers as a `profiles` update payload, with nulls dropped so an
 * unanswered question never overwrites an existing value with null.
 */
export function quizToProfileUpdate(quiz: OnboardingQuiz): {
  diet_goal?: DietGoal;
  activity_level?: ActivityLevel;
  experience_level?: ExperienceLevel;
} {
  return {
    ...(quiz.dietGoal ? { diet_goal: quiz.dietGoal } : {}),
    ...(quiz.activityLevel ? { activity_level: quiz.activityLevel } : {}),
    ...(quiz.experienceLevel ? { experience_level: quiz.experienceLevel } : {}),
  };
}
