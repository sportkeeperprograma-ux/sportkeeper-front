"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "./../AuthContext";

function Logo(){
  return (
    <div className="flex items-center gap-2">
      <span className="inline-grid place-items-center size-8 rounded-xl bg-black text-white">
        <svg viewBox="0 0 24 24" className="size-5"><path fill="currentColor" d="M4 9h2v6H4V9Zm14 0h2v6h-2V9ZM7 7h2v10H7V7Zm8 0h2v10h-2V7Zm-4-1h2v12h-2V6Z"/></svg>
      </span>
      <span className="font-bold tracking-tight">SportKeeper</span>
    </div>
  );
}

export default function Navbar(){
  const { token, user } = useAuth();
  const path = usePathname();

  if (!token) return null; // 👈 ocultar barra si no hay sesión

  const Tab = ({href,label}:{href:string;label:string}) => (
    <Link
      href={href}
      className={clsx(
        "px-3 py-1.5 rounded-xl text-sm transition",
        path===href ? "bg-black text-white" : "text-gray-700 hover:bg-gray-200/60"
      )}
    >{label}</Link>
  );

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/60 border-b border-white/40">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <Logo/>
        <nav className="flex gap-2">
          <Tab href="/" label="Inicio" />
          <Tab href="/slots" label="Slots" />
          <Tab href="/student/notes" label="Notas" />
          {(user?.role === "ADMIN" || user?.role === "COACH") && <Tab href="/teacher/slots" label="SlotsTeacher" />}{/* 👈 solo admin */}
          {(user?.role === "ADMIN" || user?.role === "COACH") && <Tab href="/admin/slots" label="Admin" />}{/* 👈 solo admin */}
          {user?.role === "ADMIN" && <Tab href="/admin/users" label="Usuarios" />}{/* 👈 solo admin */}
          {user?.role === "ADMIN" && <Tab href="/admin/activities" label="Actividades" />}{/* 👈 solo admin */}
        </nav>
      </div>
    </header>
  );
}
