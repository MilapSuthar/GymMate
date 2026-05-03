import { apiClient } from "./client";

export const matchesApi = {
  getMatches: async () => {
    const { data } = await apiClient.get("/matches");
    return data.data;
  },
  getMatch: async (id: string) => {
    const { data } = await apiClient.get(`/matches/${id}`);
    return data.data;
  },
};
