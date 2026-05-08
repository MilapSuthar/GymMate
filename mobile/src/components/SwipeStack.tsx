import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { router } from "expo-router";
import SwipeCard from "./SwipeCard";
import { swipesApi } from "@/api/swipes";

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
  profiles: Profile[];
  onEmpty: () => void;
}

export default function SwipeStack({ profiles, onEmpty }: Props) {
  const [index, setIndex] = useState(0);

  const current = profiles[index];

  const handleSwipe = async (direction: "like" | "pass") => {
    if (!current) return;
    try {
      const result = await swipesApi.swipe(current.id, direction);
      if (result.matched && result.matchId) {
        router.push({ pathname: "/match-celebration", params: { matchId: result.matchId } });
      }
    } catch { /* ignore */ }

    const next = index + 1;
    if (next >= profiles.length) {
      onEmpty();
    } else {
      setIndex(next);
    }
  };

  if (!current) return null;

  return (
    <View style={styles.container}>
      {profiles[index + 1] && (
        <SwipeCard profile={profiles[index + 1]} style={styles.backCard} />
      )}
      <SwipeCard profile={current} style={styles.frontCard} />

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.passBtn} onPress={() => handleSwipe("pass")}>
          <Text style={styles.passBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={() => handleSwipe("like")}>
          <Text style={styles.likeBtnText}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 8 },
  backCard: { top: 12, opacity: 0.7, transform: [{ scale: 0.96 }] },
  frontCard: { top: 0 },
  buttons: { flexDirection: "row", gap: 40, marginTop: 360, marginBottom: 20 },
  passBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#1a1a1a", borderWidth: 2, borderColor: "#333", justifyContent: "center", alignItems: "center" },
  passBtnText: { fontSize: 24, color: "#aaa" },
  likeBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FF6B35", justifyContent: "center", alignItems: "center" },
  likeBtnText: { fontSize: 24, color: "#fff" },
});
