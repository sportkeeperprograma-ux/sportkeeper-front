"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";

type SubmitState = "idle" | "loading" | "success" | "error";

const PASSWORD_MIN_LENGTH = 8;

function passwordRecommendations(password: string) {
  return [
    { label: "Al menos 8 caracteres", ok: password.length >= PASSWORD_MIN_LENGTH },
    { label: "Una mayuscula", ok: /[A-Z]/.test(password) },
    { label: "Una minuscula", ok: /[a-z]/.test(password) },
    { label: "Un numero", ok: /\d/.test(password) },
  ];
}

function mapActivationError(status: number, message: string) {
  const normalized = message.toLowerCase();

  if (status === 410 || normalized.includes("expired") || normalized.includes("caduc")) {
    return "El enlace de activacion ha caducado. Solicita uno nuevo.";
  }

  if (status === 404 || normalized.includes("invalid token") || normalized.includes("token invalid") || normalized.includes("invalido")) {
    return "El enlace de activacion no es valido.";
  }

  if (status === 400 || status === 422) {
    if (normalized.includes("password") || normalized.includes("contrasena")) {
      return "La contrasena no cumple los requisitos.";
    }
    if (normalized.includes("token")) {
      return "El enlace de activacion no es valido.";
    }
  }

  return "No se pudo crear la contrasena. Intentalo de nuevo mas tarde.";
}

async function readErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return String(data?.message || data?.error || data?.code || response.statusText);
  } catch {
    return response.statusText;
  }
}

export default function CrearPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const recommendations = useMemo(() => passwordRecommendations(password), [password]);
  const isMissingToken = !token;

  const httpsWarning =
    typeof window !== "undefined" &&
    window.location.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname);

  useEffect(() => {
    if (state !== "success") return;
    const timeout = window.setTimeout(() => router.push("/"), 3500);
    return () => window.clearTimeout(timeout);
  }, [router, state]);

  const validate = () => {
    if (!password) return "La contrasena es obligatoria.";
    if (!confirmPassword) return "Debes repetir la contrasena.";
    if (password.length < PASSWORD_MIN_LENGTH) return "La contrasena debe tener minimo 8 caracteres.";
    if (password !== confirmPassword) return "Las contrasenas no coinciden.";
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMissingToken) return;

    const validationError = validate();
    if (validationError) {
      setState("error");
      setMessage(validationError);
      return;
    }

    try {
      setState("loading");
      setMessage("");

      const response = await fetch("/api/auth/activate-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const backendMessage = await readErrorMessage(response);
        throw new Error(mapActivationError(response.status, backendMessage));
      }

      setPassword("");
      setConfirmPassword("");
      setState("success");
      setMessage("Tu contrasena se ha creado correctamente.");
    } catch (error: any) {
      setState("error");
      setMessage(error?.message || "Error generico del servidor.");
    }
  };

  return (
    <main className="w-full">
      <Card className="rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60">
        <CardHeader className="block space-y-2">
          <CardTitle className="text-2xl">Crear contrasena</CardTitle>
          <p className="text-sm text-slate-500">
            Introduce una contrasena nueva para activar tu cuenta.
          </p>
        </CardHeader>

        <CardContent>
          {isMissingToken ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              El enlace de activacion no es valido.
            </div>
          ) : state === "success" ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {message}
              </div>
              <p className="text-sm text-slate-500">
                Te redirigiremos al login en unos segundos.
              </p>
              <Button className="w-full" onClick={() => router.push("/")}>
                Ir al login
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              {httpsWarning && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  En produccion, abre este enlace siempre mediante HTTPS.
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Nueva contrasena
                </label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={state === "loading"}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={state === "loading"}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                  Repetir contrasena
                </label>
                <div className="flex gap-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={state === "loading"}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    disabled={state === "loading"}
                  >
                    {showConfirmPassword ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <p className="font-medium text-slate-700">Recomendacion de seguridad:</p>
                <ul className="mt-2 space-y-1">
                  {recommendations.map((item) => (
                    <li key={item.label} className={item.ok ? "text-green-700" : ""}>
                      {item.ok ? "OK" : "-"} {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              {message && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {message}
                </div>
              )}

              <Button type="submit" className="w-full" loading={state === "loading"} disabled={state === "loading"}>
                Crear contrasena
              </Button>

              <Link href="/" className="block text-center text-sm font-medium text-slate-600 hover:text-slate-950">
                Ir al login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
