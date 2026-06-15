"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../lib/config";
import { AppRole } from "../lib/roles";

type User = {
  id: string;
  email: string;
  role: AppRole;
  contractedReservations?: number | null;
  contracted_reservations?: number | null;
  monthlyContractedClasses?: number | null;
  monthly_contracted_classes?: number | null;
  contractedClassesPerMonth?: number | null;
  contracted_classes_per_month?: number | null;
  monthlyContractedHours?: number | null;
  monthly_contracted_hours?: number | null;
  contractedHoursPerMonth?: number | null;
  contracted_hours_per_month?: number | null;
};

type Ctx = {
  token: string | null;
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

async function safeMsg(response: Response) {
  try {
    const json = (await response.json()) as { message?: string };
    return json.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

const AuthCtx = createContext<Ctx>({
  token: null,
  user: null,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
    if (storedToken) {
      fetchMe(storedToken)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  async function fetchMe(currentToken: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) throw new Error("No se pudo cargar el perfil");
    return response.json();
  }

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(await safeMsg(response));

    const { token } = await response.json();
    localStorage.setItem("token", token);
    setToken(token);
    setUser(await fetchMe(token));
  };

  const register = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(await safeMsg(response));

    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthCtx.Provider value={{ token, user, ready, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
