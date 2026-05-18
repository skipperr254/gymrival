import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts } from "@/constants/theme";
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
    <SafeAreaView style={styles.safeArea}>
      {/* Top bar */}
      <View style={styles.topBar}>
        {!isLast && (
          <Pressable onPress={skip} hitSlop={12} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
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
        style={styles.scrollView}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            {/* Icon illustration */}
            <View style={styles.iconRing}>
              <View style={styles.iconCircle}>
                <Ionicons name={slide.icon} size={76} color={Colors.accent} />
              </View>
            </View>

            {/* Text */}
            <View style={styles.textContent}>
              <Text style={styles.tag}>{slide.tag}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Pagination dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={goNext}
        >
          <Text style={styles.buttonText}>
            {isLast ? "GET STARTED" : "NEXT"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 20,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  skipBtn: {
    paddingHorizontal: 4,
  },
  skipText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.secondary,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(230, 48, 48, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 44,
  },
  iconCircle: {
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    alignItems: "center",
  },
  tag: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 3,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 52,
    color: Colors.primary,
    textAlign: "center",
    lineHeight: 56,
    marginBottom: 16,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 23,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.elevated,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: Colors.accentDark,
  },
  buttonText: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.primary,
    letterSpacing: 3,
  },
});
