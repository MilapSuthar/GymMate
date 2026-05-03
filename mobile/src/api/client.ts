import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "../lib/secureStorage";

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000/api/v1";

export const apiClient = axios.create({ baseURL: API_URL, timeout: 10000 });

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await getRefreshToken();
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        await saveTokens(data.data.accessToken, data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(original);
      } catch {
        await clearTokens();
        throw error;
      }
    }
    const message = (error.response?.data as { error?: { message?: string } })?.error?.message ?? error.message;
    throw new Error(message);
  }
);
