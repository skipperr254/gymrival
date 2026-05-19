import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompeteScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/onboarding");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <View className="flex-1 px-4 justify-center items-center gap-6">
        <Text className="font-heading text-[52px] text-primary tracking-[6px]">
          GYM<Text className="text-accent">RIVAL</Text>
        </Text>
        <Text className="font-sans text-[15px] text-secondary text-center">
          Welcome back,{" "}
          <Text className="font-sans-semibold text-primary">
            {user?.user_metadata?.full_name ?? user?.email}
          </Text>
          !{"\n"}The compete tab is coming soon.
        </Text>

        <Pressable
          className="bg-elevated rounded-2xl h-12 px-8 items-center justify-center mt-4"
          style={({ pressed }) =>
            pressed ? { opacity: 0.7 } : undefined
          }
          onPress={handleSignOut}
        >
          <Text className="font-sans-medium text-[14px] text-secondary">
            Sign Out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
