import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

export default function SignInScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.base }}>
      <View className="flex-1 justify-center items-center">
        <Text className="font-heading text-[48px] text-primary tracking-[4px]">SIGN IN</Text>
        <Text className="font-sans text-[15px] text-secondary mt-2">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
