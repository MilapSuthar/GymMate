import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen() {
  return (
    <LinearGradient colors={["#0f0f0f", "#1a0a00"]} style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>GymMate</Text>
        <Text style={styles.tagline}>Connect. Lift. Grow.</Text>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/(auth)/log-in")}>
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", padding: 32 },
  hero: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { fontSize: 48, fontWeight: "900", color: "#FF6B35", letterSpacing: -1 },
  tagline: { fontSize: 18, color: "#aaa", marginTop: 8 },
  buttons: { gap: 12 },
  primaryBtn: { backgroundColor: "#FF6B35", borderRadius: 14, padding: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  secondaryBtnText: { color: "#aaa", fontSize: 15 },
});
