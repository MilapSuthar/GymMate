import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated from "react-native-reanimated";

const { width } = Dimensions.get("window");

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  gym_name: string | null;
  fitness_level: string | null;
  goals: string[];
  bio: string | null;
  distance_m: number;
}

interface Props {
  profile: Profile;
  style?: object;
}

export default function SwipeCard({ profile, style }: Props) {
  const distanceKm = (profile.distance_m / 1000).toFixed(1);

  return (
    <Animated.View style={[styles.card, style]}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.initial}>{profile.display_name[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{profile.display_name}</Text>
        {profile.gym_name && <Text style={styles.gym}>🏋️ {profile.gym_name} · {distanceKm} km</Text>}
        {profile.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
        <View style={styles.tags}>
          {profile.goals.slice(0, 3).map((g) => (
            <View key={g} style={styles.tag}>
              <Text style={styles.tagText}>{g.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width - 32,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imagePlaceholder: {
    height: 320,
    backgroundColor: "#2a1500",
    justifyContent: "center",
    alignItems: "center",
  },
  initial: { fontSize: 80, fontWeight: "800", color: "#FF6B35" },
  info: { padding: 20 },
  name: { fontSize: 22, fontWeight: "800", color: "#fff" },
  gym: { color: "#aaa", fontSize: 13, marginTop: 4 },
  bio: { color: "#ccc", fontSize: 14, marginTop: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { backgroundColor: "#2a2a2a", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: "#aaa", fontSize: 12, textTransform: "capitalize" },
});
