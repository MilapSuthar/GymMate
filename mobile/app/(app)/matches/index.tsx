import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "react-query";
import { matchesApi } from "@/api/matches";

export default function MatchesScreen() {
  const { data, isLoading } = useQuery("matches", matchesApi.getMatches);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#FF6B35" size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Matches</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={data?.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No matches yet. Keep swiping!</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.matchRow} onPress={() => router.push(`/(app)/matches/${item.id}`)}>
            <View style={styles.avatar}><Text style={styles.avatarLetter}>{item.otherUser.displayName[0]}</Text></View>
            <View style={styles.matchInfo}>
              <Text style={styles.matchName}>{item.otherUser.displayName}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage?.content ?? "Say hello!"}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", paddingTop: 56 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 24, fontWeight: "800", color: "#fff", paddingHorizontal: 20, marginBottom: 16 },
  emptyContainer: { flexGrow: 1 },
  emptyText: { color: "#555", fontSize: 15 },
  matchRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#FF6B35", justifyContent: "center", alignItems: "center", marginRight: 14 },
  avatarLetter: { color: "#fff", fontSize: 20, fontWeight: "700" },
  matchInfo: { flex: 1 },
  matchName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  lastMessage: { color: "#666", fontSize: 13, marginTop: 2 },
});
