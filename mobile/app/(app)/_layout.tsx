import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#0f0f0f", borderTopColor: "#1a1a1a", height: 60 },
      tabBarActiveTintColor: "#FF6B35",
      tabBarInactiveTintColor: "#555",
    }}>
      <Tabs.Screen name="discover/index" options={{ title: "Discover", tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> }} />
      <Tabs.Screen name="matches/index" options={{ title: "Matches", tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} /> }} />
      <Tabs.Screen name="profile/index" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
