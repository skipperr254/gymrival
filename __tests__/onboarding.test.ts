/**
 * Unit tests for the onboarding quiz → profile mapping.
 *
 * The behaviour that matters here is what happens to UNANSWERED questions.
 * The quiz is skippable at every step, and its answers are flushed into the
 * same `updateProfile` call as username/age/sex — so if an unanswered question
 * produced `{ diet_goal: null }` it would wipe a value the user may already
 * have set on the nutrition-goals screen.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_QUIZ,
  quizToProfileUpdate,
  loadQuiz,
  GOAL_OPTIONS,
  FREQUENCY_OPTIONS,
  EXPERIENCE_OPTIONS,
} from '@/lib/onboarding';

const mockGetItem = AsyncStorage.getItem as jest.Mock;

describe('quizToProfileUpdate', () => {
  it('maps a fully answered quiz onto profile columns', () => {
    expect(
      quizToProfileUpdate({
        dietGoal: 'gain',
        activityLevel: 'active',
        experienceLevel: 'intermediate',
      })
    ).toEqual({
      diet_goal: 'gain',
      activity_level: 'active',
      experience_level: 'intermediate',
    });
  });

  it('omits unanswered questions entirely rather than sending null', () => {
    const update = quizToProfileUpdate({
      dietGoal: 'lose',
      activityLevel: null,
      experienceLevel: null,
    });
    expect(update).toEqual({ diet_goal: 'lose' });
    expect('activity_level' in update).toBe(false);
    expect('experience_level' in update).toBe(false);
  });

  it('produces an empty payload for a fully skipped quiz', () => {
    expect(quizToProfileUpdate(EMPTY_QUIZ)).toEqual({});
  });
});

describe('loadQuiz', () => {
  beforeEach(() => mockGetItem.mockReset());

  it('returns the empty quiz when nothing was ever saved', async () => {
    mockGetItem.mockResolvedValue(null);
    await expect(loadQuiz()).resolves.toEqual(EMPTY_QUIZ);
  });

  it('fills gaps when an older partial shape was stored', async () => {
    // A quiz saved by a previous app version may not have every key.
    mockGetItem.mockResolvedValue(JSON.stringify({ dietGoal: 'maintain' }));
    await expect(loadQuiz()).resolves.toEqual({
      dietGoal: 'maintain',
      activityLevel: null,
      experienceLevel: null,
    });
  });

  it('survives corrupt storage instead of breaking sign-up', async () => {
    mockGetItem.mockResolvedValue('{not json');
    await expect(loadQuiz()).resolves.toEqual(EMPTY_QUIZ);
  });
});

describe('option lists', () => {
  it('never offers "sedentary" as a training frequency', () => {
    // Someone installing a gym-competition app is not sedentary, and offering
    // it would drag every calorie target down by the lowest multiplier.
    expect(FREQUENCY_OPTIONS.map((o) => o.value)).not.toContain('sedentary');
  });

  it('covers every diet goal the TDEE calculation understands', () => {
    expect(GOAL_OPTIONS.map((o) => o.value).sort()).toEqual(['gain', 'lose', 'maintain']);
  });

  it('matches the experience values the database CHECK constraint allows', () => {
    expect(EXPERIENCE_OPTIONS.map((o) => o.value)).toEqual([
      'beginner',
      'intermediate',
      'advanced',
    ]);
  });

  it('stores i18n key paths, not resolved copy', () => {
    for (const opt of [...GOAL_OPTIONS, ...FREQUENCY_OPTIONS, ...EXPERIENCE_OPTIONS]) {
      expect(opt.labelKey).toMatch(/^quiz\./);
      expect(opt.subKey).toMatch(/^quiz\./);
    }
  });
});
