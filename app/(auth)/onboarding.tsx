import { Routes } from "@/constants/routes";
import { Colors } from "@/constants/theme";
import { Trophy, Zap, Users, type LucideIcon } from "lucide-react-native";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Slide {
  icon: LucideIcon;
  tagKey: string;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  {
    icon: Trophy,
    tagKey: "onboarding.slide1.tag",
    titleKey: "onboarding.slide1.title",
    bodyKey: "onboarding.slide1.body",
  },
  {
    icon: Zap,
    tagKey: "onboarding.slide2.tag",
    titleKey: "onboarding.slide2.title",
    bodyKey: "onboarding.slide2.body",
  },
  {
    icon: Users,
    tagKey: "onboarding.slide3.tag",
    titleKey: "onboarding.slide3.title",
    bodyKey: "onboarding.slide3.body",
  },
];

export default function OnboardingScreen() {
  const { t } = useTranslation("auth");
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (activeIndex + 1) * width,
        animated: true,
      });
    } else {
      router.replace(Routes.signUp);
    }
  };

  const skip = () => router.replace(Routes.signIn);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      {/* Top bar */}
      <View className="h-13 px-5 items-end justify-center">
        {!isLast && (
          <Pressable onPress={skip} hitSlop={12}>
            <Text className="font-sans-medium text-[15px] text-secondary">
              {t("onboarding.skip")}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={32}
        className="flex-1"
      >
        {SLIDES.map((slide, i) => (
          // width must be inline — dynamic value from useWindowDimensions
          <View
            key={i}
            style={{ width }}
            className="flex-1 items-center justify-center px-8"
          >
            {/* Icon illustration */}
            <View className="w-55 h-55 rounded-[110px] border border-accent-ring items-center justify-center mb-11">
              <View className="w-43.5 h-43.5 rounded-[87px] bg-surface items-center justify-center">
                <slide.icon size={76} strokeWidth={1.4} color={Colors.accent} />
              </View>
            </View>

            {/* Text */}
            <View className="items-center">
              <Text className="font-sans-semibold text-xs text-accent tracking-[3px] mb-3">
                {t(slide.tagKey)}
              </Text>
              <Text className="font-heading text-[52px] text-primary text-center leading-[56px] mb-4">
                {t(slide.titleKey)}
              </Text>
              <Text className="font-sans text-[15px] text-secondary text-center leading-5.75">
                {t(slide.bodyKey)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View className="px-4 pb-5 gap-5">
        {/* Pagination dots */}
        <View className="flex-row justify-center items-center gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-[3px] ${
                i === activeIndex ? "w-6 bg-accent" : "w-1.5 bg-elevated"
              }`}
            />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          className="bg-accent rounded-2xl h-14 items-center justify-center"
          style={({ pressed }) =>
            pressed ? { backgroundColor: Colors.accentDark } : undefined
          }
          onPress={goNext}
        >
          <Text className="font-heading text-xl text-primary tracking-[3px]">
            {isLast ? t("onboarding.getStarted") : t("onboarding.next")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
