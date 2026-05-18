import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { Routes } from "@/constants/routes";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface Slide {
  icon: IoniconName;
  tag: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: "trophy-outline",
    tag: "TRACK YOUR PRs",
    title: "COMPETE &\nCONQUER",
    body: "Log your best lifts, climb the leaderboard, and challenge friends to beat your personal records.",
  },
  {
    icon: "flash-outline",
    tag: "TRAIN SMARTER",
    title: "LEVEL UP YOUR\nWORKOUT",
    body: "Follow structured programs, log every session, and get tailored guidance from your AI coach.",
  },
  {
    icon: "people-outline",
    tag: "STAY MOTIVATED",
    title: "YOUR FIT CREW\nAWAITS",
    body: "Share your wins, cheer on friends, join challenges, and celebrate every milestone together.",
  },
];

export default function OnboardingScreen() {
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
      router.replace(Routes.signIn);
    }
  };

  const skip = () => router.replace(Routes.signIn);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      {/* Top bar */}
      <View className="h-[52px] px-5 items-end justify-center">
        {!isLast && (
          <Pressable onPress={skip} hitSlop={12}>
            <Text className="font-sans-medium text-[15px] text-secondary">Skip</Text>
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
          <View key={i} style={{ width }} className="flex-1 items-center justify-center px-8">
            {/* Icon illustration */}
            <View className="w-[220px] h-[220px] rounded-[110px] border border-accent-ring items-center justify-center mb-11">
              <View className="w-[174px] h-[174px] rounded-[87px] bg-surface items-center justify-center">
                <Ionicons name={slide.icon} size={76} color={Colors.accent} />
              </View>
            </View>

            {/* Text */}
            <View className="items-center">
              <Text className="font-sans-semibold text-xs text-accent tracking-[3px] mb-3">
                {slide.tag}
              </Text>
              <Text className="font-heading text-[52px] text-primary text-center leading-[56px] mb-4">
                {slide.title}
              </Text>
              <Text className="font-sans text-[15px] text-secondary text-center leading-[23px]">
                {slide.body}
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
              className={`h-[6px] rounded-[3px] ${
                i === activeIndex ? "w-6 bg-accent" : "w-[6px] bg-elevated"
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
            {isLast ? "GET STARTED" : "NEXT"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
