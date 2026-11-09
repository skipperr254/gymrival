import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { Routes } from '@/constants/routes';
import { rtlIconFlip } from '@/lib/i18n/rtl';
import {
  EMPTY_QUIZ,
  GOAL_OPTIONS,
  FREQUENCY_OPTIONS,
  EXPERIENCE_OPTIONS,
  saveQuiz,
  type OnboardingQuiz,
} from '@/lib/onboarding';

/**
 * Three questions, asked before sign-up.
 *
 * Why before and not after: answering builds investment before the ask, and
 * the answers are what let the post-setup screen show a calorie target
 * computed from this user's own body instead of a generic welcome. There is
 * no account yet, so answers are cached in AsyncStorage and flushed to
 * `profiles` by the setup screen.
 *
 * One route with internal step state rather than three routes — the back
 * button should walk the questions, not the navigation stack, and a half
 * finished quiz should not leave three entries in history.
 */

const STEP_COUNT = 3;

export default function QuizScreen() {
  const { t } = useTranslation('onboarding');
  const [step, setStep] = useState(0);
  const [quiz, setQuiz] = useState<OnboardingQuiz>(EMPTY_QUIZ);

  const questions = [
    {
      titleKey: 'quiz.goal.title',
      subKey: 'quiz.goal.subtitle',
      options: GOAL_OPTIONS,
      selected: quiz.dietGoal as string | null,
      pick: (v: string) => setQuiz((q) => ({ ...q, dietGoal: v as OnboardingQuiz['dietGoal'] })),
    },
    {
      titleKey: 'quiz.frequency.title',
      subKey: 'quiz.frequency.subtitle',
      options: FREQUENCY_OPTIONS,
      selected: quiz.activityLevel as string | null,
      pick: (v: string) =>
        setQuiz((q) => ({ ...q, activityLevel: v as OnboardingQuiz['activityLevel'] })),
    },
    {
      titleKey: 'quiz.experience.title',
      subKey: 'quiz.experience.subtitle',
      options: EXPERIENCE_OPTIONS,
      selected: quiz.experienceLevel as string | null,
      pick: (v: string) =>
        setQuiz((q) => ({ ...q, experienceLevel: v as OnboardingQuiz['experienceLevel'] })),
    },
  ];

  const current = questions[step];
  const isLast = step === STEP_COUNT - 1;

  const goBack = () => {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  const goNext = async () => {
    if (!current.selected) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    // Persist before leaving: sign-up and email verification can take the user
    // out of the app entirely, and the answers have to survive that.
    await saveQuiz(quiz);
    router.replace(Routes.signUp);
  };

  const skip = async () => {
    // Partial answers are still worth keeping — two of three still improves
    // the calorie target over nothing.
    await saveQuiz(quiz);
    router.replace(Routes.signUp);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      {/* Header: back + progress + skip */}
      <View className="px-4 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={goBack} hitSlop={14} className="w-8">
            <ChevronLeft size={24} strokeWidth={2.2} color={Colors.secondary} style={rtlIconFlip} />
          </Pressable>
          <Text className="font-heading text-[10px] tracking-[2.5px] text-muted">
            {t('quiz.stepOf', { step: step + 1, total: STEP_COUNT })}
          </Text>
          <Pressable onPress={skip} hitSlop={14}>
            <Text className="font-sans-medium text-[13px] text-muted">{t('quiz.skip')}</Text>
          </Pressable>
        </View>

        <View className="flex-row gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              className={`flex-1 h-[3px] rounded-full ${i <= step ? 'bg-accent' : 'bg-elevated'}`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-heading text-[38px] text-primary tracking-[1px] leading-[42px] mb-2">
          {t(current.titleKey)}
        </Text>
        <Text className="font-sans text-[14px] text-secondary leading-5 mb-7">
          {t(current.subKey)}
        </Text>

        <View className="gap-2.5">
          {current.options.map((opt) => {
            const selected = current.selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => current.pick(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 rounded-2xl border-[1.5px] px-4 py-4 ${
                  selected ? 'bg-[#241a1a] border-accent' : 'bg-surface border-default'
                }`}
                style={({ pressed }) => pressed && { opacity: 0.82 }}
              >
                <View className="flex-1">
                  <Text className="font-sans-semibold text-[15px] text-primary">
                    {t(opt.labelKey)}
                  </Text>
                  <Text className="font-sans text-[12px] text-[#787878] mt-0.5">
                    {t(opt.subKey)}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full items-center justify-center border-2 ${
                    selected ? 'bg-accent border-accent' : 'border-[#3a3a3a]'
                  }`}
                >
                  {selected && <Check size={13} color={Colors.primary} strokeWidth={3.5} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-4 pb-5 pt-2">
        <Pressable
          onPress={goNext}
          disabled={!current.selected}
          className="bg-accent rounded-2xl h-14 items-center justify-center"
          style={({ pressed }) => [
            !current.selected && { opacity: 0.35 },
            pressed && current.selected && { backgroundColor: Colors.accentDark },
          ]}
        >
          <Text className="font-heading text-xl text-primary tracking-[3px]">
            {isLast ? t('quiz.finish') : t('quiz.next')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
