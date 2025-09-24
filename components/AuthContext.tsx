"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../lib/config";

type User = { id: string; email: string; role: "ADMIN" | "MEMBER" | string };

type Ctx = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  token: null, user: null, login: async()=>{}, logout: ()=>{}, register: async()=>{},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string|null>(null);
  const [user, setUser]   = useState<User|null>(null);

  // al cargar, intenta recuperar sesión
  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
    if (t) fetchMe(t).then(setUser).catch(()=>{});
  }, []);

  async function fetchMe(t: string): Promise<User> {
    const r = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!r.ok) throw new Error("No se pudo cargar el perfil");
    return r.json();
  }

  const login = async (email: string, password: string) => {
    const r = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ email, password }),
    });
    if(!r.ok) throw new Error("Credenciales inválidas");
    const { token } = await r.json();
    localStorage.setItem("token", token);
    setToken(token);
    setUser(await fetchMe(token));
  };

  const register = async (email: string, password: string) => {
    const r = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) throw new Error("No se pudo registrar");
    // tras registrar, puedes loguear automáticamente:
    await login(email, password);
  };

  const logout = () => { localStorage.removeItem("token"); setToken(null); setUser(null); };

  return (
    <AuthCtx.Provider value={{ token, user, login, logout, register }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
