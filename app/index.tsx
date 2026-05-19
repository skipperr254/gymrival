import { Routes } from "@/constants/routes";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <View className="flex-1 px-4">
        {/* Logo */}
        <View className="flex-1 justify-center items-center">
          <Text className="font-heading text-[88px] text-primary leading-[88px] tracking-[10px]">
            GYM
          </Text>
          <Text className="font-heading text-[88px] text-accent leading-[88px] tracking-[10px]">
            RIVAL
          </Text>
          <View className="w-10 h-0.75 bg-accent rounded-sm mt-4 mb-4" />
          <Text className="font-sans text-[15px] text-secondary text-center">
            Your fitness. Your rivals. Your wins.
          </Text>
        </View>

        {/* Footer */}
        <View className="pb-5 gap-4 items-center">
          <Pressable
            className="bg-accent rounded-2xl h-14 w-full items-center justify-center"
            style={({ pressed }) =>
              pressed ? { backgroundColor: Colors.accentDark } : undefined
            }
            onPress={() => router.push(Routes.onboarding)}
          >
            <Text className="font-heading text-xl text-primary tracking-[3px]">
              GET STARTED
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push(Routes.signIn)} hitSlop={12}>
            <Text className="font-sans text-sm text-secondary">
              Already have an account?{" "}
              <Text className="font-sans-semibold text-accent">Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
