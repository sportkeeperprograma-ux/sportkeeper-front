"use client";
import { useAuth } from "../components/AuthContext";
import { useState } from "react";
import Button from "./../components/ui/Button";
import Input from "./../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "./../components/ui/Card";

export default function Page() {
  const { token, user, login, register, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) await register(email, password);
      else await login(email, password);
      setMsg(isRegister ? "Registro y login correctos" : "Login correcto");
    } catch (err:any) {
      setMsg(err.message || "Error");
    }
  };

  return (
    <main className="space-y-4">
      {!token ? (
        <Card>
          <CardHeader><CardTitle>{isRegister ? "Crear cuenta" : "Acceder"}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              <div className="grid gap-2">
                <Input placeholder="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
                <Input type="password" placeholder="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">{isRegister ? "Registrarme" : "Entrar"}</Button>
              <button type="button" className="block w-full text-center text-sm text-gray-700 mt-2 underline"
                onClick={()=>{ setIsRegister(!isRegister); setMsg(""); }}>
                {isRegister ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
              </button>
              {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Hola, {user?.email}</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            {user?.role === "ADMIN" && <span className="text-xs rounded-full px-2 py-0.5 bg-black text-white">ADMIN</span>}
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
