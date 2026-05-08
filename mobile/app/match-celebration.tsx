import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

export default function MatchCelebrationScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>It's a Match!</Text>
      <Text style={styles.subtitle}>You and your match liked each other.</Text>

      <TouchableOpacity style={styles.chatBtn} onPress={() => router.replace(`/(app)/matches/${matchId}`)}>
        <Text style={styles.chatBtnText}>Start Chatting</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.continueBtn} onPress={() => router.replace("/(app)/discover")}>
        <Text style={styles.continueBtnText}>Keep Swiping</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", justifyContent: "center", alignItems: "center", padding: 32 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 36, fontWeight: "900", color: "#FF6B35", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#aaa", textAlign: "center", marginBottom: 48 },
  chatBtn: { backgroundColor: "#FF6B35", borderRadius: 14, padding: 16, width: "100%", alignItems: "center", marginBottom: 12 },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  continueBtn: { borderRadius: 14, padding: 16, width: "100%", alignItems: "center" },
  continueBtnText: { color: "#aaa", fontSize: 15 },
});
