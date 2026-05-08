import { apiClient } from "./client";

interface DiscoveryParams {
  radiusKm?: number;
  limit?: number;
  fitnessLevels?: string[];
}

export const discoveryApi = {
  getFeed: async ({ radiusKm = 25, limit = 20, fitnessLevels }: DiscoveryParams) => {
    const params: Record<string, unknown> = { radius_km: radiusKm, limit };
    if (fitnessLevels?.length) params.fitness_levels = fitnessLevels.join(",");
    const { data } = await apiClient.get("/discover", { params });
    return data.data as Array<{ id: string; display_name: string; avatar_url: string | null; photos: string[]; gym_name: string | null; fitness_level: string | null; goals: string[]; bio: string | null; distance_m: number }>;
  },
};
