import { Suspense } from "react";
import CrearPasswordForm from "./CrearPasswordForm";

export default function CrearPasswordPage() {
  return (
    <Suspense fallback={<PasswordPageFallback />}>
      <CrearPasswordForm />
    </Suspense>
  );
}

function PasswordPageFallback() {
  return (
    <main className="w-full">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="mt-8 h-11 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
    </main>
  );
}
