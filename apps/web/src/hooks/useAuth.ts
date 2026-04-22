import { useState, useCallback, useRef } from "react";

export type AuthState = {
  accessToken: string;
  refreshToken: string;
} | null;

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("auth");
    return stored ? JSON.parse(stored) : null;
  });

  // Keep a ref so apiFetch always reads the latest auth without being a dependency
  const authRef = useRef(auth);

  const save = (tokens: AuthState) => {
    authRef.current = tokens;
    setAuth(tokens);
    if (tokens) localStorage.setItem("auth", JSON.stringify(tokens));
    else localStorage.removeItem("auth");
  };

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    save(await res.json());
  };

  const register = async (email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error((await res.json()).error);
  };

  const logout = async () => {
    const current = authRef.current;
    if (current?.refreshToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken })
      }).catch(() => {});
    }
    save(null);
  };

  const refresh = useCallback(async (): Promise<string | null> => {
    const current = authRef.current;
    if (!current?.refreshToken) return null;
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken })
    });
    if (!res.ok) { save(null); return null; }
    const { accessToken } = await res.json();
    save({ ...current, accessToken });
    return accessToken;
  }, []);

  // Stable reference — reads from ref, never changes identity
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const current = authRef.current;
    if (!current) throw new Error("Not authenticated");

    let token = current.accessToken;
    let res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      token = (await refresh()) ?? "";
      if (!token) throw new Error("Session expired");
      res = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` }
      });
    }

    return res;
  }, [refresh]);

  return { auth, login, register, logout, apiFetch };
}
