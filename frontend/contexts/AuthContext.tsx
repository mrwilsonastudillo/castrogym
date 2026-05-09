"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, Usuario } from "@/lib/api";
import { BASE_PATH } from "@/lib/base-path";

interface AuthCtx {
  user: Usuario | null;
  loading: boolean;
  login: (token: string, user: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cg_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<Usuario>("/api/auth/me")
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem("cg_token"))
      .finally(() => setLoading(false));
  }, []);

  function login(token: string, u: Usuario) {
    localStorage.setItem("cg_token", token);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("cg_token");
    setUser(null);
    window.location.href = `${BASE_PATH}/login`;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
