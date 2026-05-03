import { apiClient } from "./client";

export const usersApi = {
  getMe: async () => {
    const { data } = await apiClient.get("/users/me");
    return data.data;
  },
  updateMe: async (body: Record<string, unknown>) => {
    const { data } = await apiClient.put("/users/me", body);
    return data.data;
  },
  getProfile: async (id: string) => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data.data;
  },
};
