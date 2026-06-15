"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import Navbar from "./ui/Navbar";

const WHATSAPP_URL = "https://wa.me/34644392307?text=Hola%2C%20vengo%20de%20la%20web%20y%20quer%C3%ADa%20hacer%20una%20consulta.";

function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:scale-[1.02] hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      aria-label="Hablar por WhatsApp"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
        <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.62 2 2.2 6.4 2.2 11.82c0 1.74.46 3.44 1.33 4.93L2 22l5.4-1.5a9.9 9.9 0 0 0 4.62 1.18h.01c5.41 0 9.82-4.4 9.82-9.82 0-2.62-1.02-5.08-2.8-6.95Zm-7.02 15.1h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.2.84.86-3.12-.2-.32a8.13 8.13 0 0 1-1.26-4.3c0-4.5 3.67-8.16 8.18-8.16a8.1 8.1 0 0 1 5.78 2.4 8.1 8.1 0 0 1 2.38 5.77c0 4.5-3.67 8.2-8.16 8.2Zm4.48-6.1c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.92-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.68 2.56 4.06 3.58.57.24 1.02.38 1.36.48.57.18 1.08.16 1.48.1.45-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28Z" />
      </svg>
      <span>Hablar por WhatsApp</span>
    </a>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { token, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicRoutes = ["/", "/crear-password"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  useEffect(() => {
    if (ready && !token && !isPublicRoute) {
      router.replace("/");
    }
  }, [isPublicRoute, ready, router, token]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfbfd] text-sm font-medium text-slate-500">
        Cargando...
      </div>
    );
  }

  if (!token && !isPublicRoute) {
    return (
      <>
        <div className="grid min-h-screen place-items-center bg-[#fbfbfd] text-sm font-medium text-slate-500">
          Redirigiendo al login...
        </div>
        <WhatsAppButton />
      </>
    );
  }

  if (!token) {
    return (
      <>
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-10">
          <div className="w-full">{children}</div>
        </div>
        <WhatsAppButton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-slate-950">
      <Navbar />
      <main className="min-h-screen px-6 pb-8 pt-24 lg:pl-[340px] lg:pr-10">
        {children}
      </main>
      <WhatsAppButton />
    </div>
  );
}
