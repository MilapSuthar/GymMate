import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import { usersApi } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const { logout } = useAuthStore();
  const { data, isLoading } = useQuery("me", usersApi.getMe);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#FF6B35" size="large" /></View>;

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}><Text style={styles.avatarLetter}>{data?.displayName?.[0] ?? "?"}</Text></View>
      <Text style={styles.name}>{data?.displayName}</Text>
      <Text style={styles.email}>{data?.email}</Text>
      {data?.gymName && <Text style={styles.gym}>🏋️ {data.gymName}</Text>}
      {data?.bio && <Text style={styles.bio}>{data.bio}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <View style={styles.tags}>
          {(data?.goals ?? []).map((g: string) => (
            <View key={g} style={styles.tag}><Text style={styles.tagText}>{g.replace(/_/g, " ")}</Text></View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 24, paddingTop: 60, alignItems: "center" },
  center: { flex: 1, backgroundColor: "#0f0f0f", justifyContent: "center", alignItems: "center" },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FF6B35", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarLetter: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { color: "#fff", fontSize: 22, fontWeight: "700" },
  email: { color: "#666", fontSize: 14, marginTop: 4 },
  gym: { color: "#aaa", fontSize: 14, marginTop: 8 },
  bio: { color: "#aaa", fontSize: 14, marginTop: 12, textAlign: "center" },
  section: { width: "100%", marginTop: 24 },
  sectionTitle: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#1a1a1a", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: "#aaa", fontSize: 13, textTransform: "capitalize" },
  logoutBtn: { marginTop: 40, borderWidth: 1, borderColor: "#333", borderRadius: 14, padding: 14, width: "100%", alignItems: "center" },
  logoutText: { color: "#aaa", fontWeight: "600" },
});
