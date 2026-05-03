import { apiClient } from "./client";

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string; role: string };
}

export const authApi = {
  register: async (body: { email: string; password: string; displayName: string }): Promise<AuthResult> => {
    const { data } = await apiClient.post("/auth/register", body);
    return data.data;
  },
  login: async (body: { email: string; password: string }): Promise<AuthResult> => {
    const { data } = await apiClient.post("/auth/login", body);
    return data.data;
  },
  logout: async () => {
    await apiClient.post("/auth/logout");
  },
};
