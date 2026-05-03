import { create } from "zustand";
import { saveTokens, clearTokens, getAccessToken, getRefreshToken } from "../lib/secureStorage";
import { authApi } from "../api/auth";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  loadTokens: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setUser: (user) => set({ user }),

  setTokens: async (access, refresh) => {
    await saveTokens(access, refresh);
    set({ accessToken: access, isAuthenticated: true });
  },

  loadTokens: async () => {
    const access = await getAccessToken();
    if (access) set({ accessToken: access, isAuthenticated: true });
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    await clearTokens();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
}));
