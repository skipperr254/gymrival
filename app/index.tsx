import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors, Fonts } from "@/constants/theme";
import { Routes } from "@/constants/routes";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <Text style={styles.logoWhite}>GYM</Text>
          <Text style={styles.logoRed}>RIVAL</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Your fitness. Your rivals. Your wins.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={() => router.push(Routes.onboarding)}
        >
          <Text style={styles.primaryButtonText}>GET STARTED</Text>
        </Pressable>

        <Pressable onPress={() => router.push(Routes.signIn)} hitSlop={12}>
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <Text style={styles.signInAccent}>Sign In</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoArea: {
    alignItems: "center",
  },
  logoWhite: {
    fontFamily: Fonts.display,
    fontSize: 88,
    color: Colors.primary,
    letterSpacing: 10,
    lineHeight: 88,
  },
  logoRed: {
    fontFamily: Fonts.display,
    fontSize: 88,
    color: Colors.accent,
    letterSpacing: 10,
    lineHeight: 88,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    marginTop: 16,
    marginBottom: 16,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.secondary,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  footer: {
    paddingBottom: 20,
    gap: 16,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 56,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    backgroundColor: Colors.accentDark,
  },
  primaryButtonText: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.primary,
    letterSpacing: 3,
  },
  signInText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.secondary,
  },
  signInAccent: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.accent,
  },
});
