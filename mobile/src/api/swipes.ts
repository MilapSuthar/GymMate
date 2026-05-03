import { apiClient } from "./client";

export const swipesApi = {
  swipe: async (swipedId: string, direction: "like" | "pass") => {
    const { data } = await apiClient.post("/swipes", { swipedId, direction });
    return data.data as { matched: boolean; matchId?: string };
  },
};
