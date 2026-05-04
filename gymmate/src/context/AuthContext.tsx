"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  // accessToken lives only in memory (lost on reload — silent refresh restores it)
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export class AuthApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : "Request failed";
  } catch {
    return "Request failed";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Use a ref so authFetch's identity stays stable while the access token rotates
  const accessTokenRef = useRef<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  const applyToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  // Silent refresh on mount — reads the httpOnly refresh cookie set on a prior login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        applyToken(data.accessToken ?? null);
        if (data.user) setUser(data.user);
      } catch {
        // network error — treat as logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new AuthApiError(res.status, await readError(res));
      const data = await res.json();
      applyToken(data.accessToken);
      setUser(data.user);
    },
    [applyToken]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new AuthApiError(res.status, await readError(res));
      const data = await res.json();
      applyToken(data.accessToken);
      setUser(data.user);
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // best-effort — proceed with local clear regardless
    }
    applyToken(null);
    setUser(null);
    router.replace("/login");
  }, [applyToken, router]);

  /**
   * Fetch helper that injects the access token and silently refreshes once
   * if the server returns 401 (handles tokens expiring mid-session).
   */
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (accessTokenRef.current) {
        headers.set("authorization", `Bearer ${accessTokenRef.current}`);
      }
      const exec = () =>
        fetch(input, { ...init, headers, credentials: "include" });

      let res = await exec();
      if (res.status !== 401) return res;

      // try a single silent refresh, then retry the original request
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!refreshRes.ok) return res;
      const data = await refreshRes.json();
      applyToken(data.accessToken ?? null);
      if (data.user) setUser(data.user);

      headers.set("authorization", `Bearer ${data.accessToken}`);
      res = await fetch(input, { ...init, headers, credentials: "include" });
      return res;
    },
    [applyToken]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, accessToken, login, register, logout, authFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
