"use client";

import { useState } from "react";
import { useAuth } from "../components/AuthContext";
import Button from "./../components/ui/Button";
import Input from "./../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "./../components/ui/Card";
import { isAdmin, roleLabel } from "../lib/roles";

export default function Page() {
  const { token, user, login, register, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "register") {
        await register(email, password);
        setMsg("Usuario creado correctamente");
      } else {
        await login(email, password);
        setMsg("Login correcto");
      }
    } catch (err: any) {
      setMsg(err.message || "Error");
    }
  };

  return (
    <main className="space-y-4">
      {!token ? (
        <Card>
          <CardHeader>
            <CardTitle>{mode === "login" ? "Acceder" : "Crear usuario"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div className="grid gap-2">
                <Input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                {mode === "login" ? "Entrar" : "Crear usuario"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMsg("");
                  setMode(mode === "login" ? "register" : "login");
                }}
              >
                {mode === "login" ? "Necesito crear una cuenta" : "Ya tengo cuenta"}
              </Button>
              {msg && <p className="mt-2 text-sm text-gray-600">{msg}</p>}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Hola, {user?.email}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {isAdmin(user?.role) && (
              <span className="rounded-full bg-black px-2 py-0.5 text-xs text-white">
                {roleLabel(user?.role)}
              </span>
            )}
            <Button variant="ghost" onClick={logout}>Cerrar sesion</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
