import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "react-query";
import { discoveryApi } from "@/api/discovery";
import SwipeStack from "@/components/SwipeStack";

export default function DiscoverScreen() {
  const { data, isLoading, refetch } = useQuery("discovery", () => discoveryApi.getFeed({}));

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (!data?.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>No one nearby</Text>
        <Text style={styles.emptyText}>Try increasing your search radius or check back later.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Discover</Text>
      <SwipeStack profiles={data} onEmpty={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", paddingTop: 56 },
  center: { flex: 1, backgroundColor: "#0f0f0f", justifyContent: "center", alignItems: "center", padding: 32 },
  heading: { fontSize: 24, fontWeight: "800", color: "#fff", paddingHorizontal: 20, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 8 },
  emptyText: { color: "#aaa", textAlign: "center", fontSize: 15 },
});
