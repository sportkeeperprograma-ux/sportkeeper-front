"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAuth } from "./../AuthContext";
import { isAdmin, isTeacher } from "../../lib/roles";

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="grid size-5 place-items-center text-current">{children}</span>
);

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-grid size-9 place-items-center rounded-2xl bg-[#6d3df2] text-white shadow-lg shadow-violet-200">
        <svg viewBox="0 0 24 24" className="size-6">
          <path fill="currentColor" d="M4 9h2v6H4V9Zm14 0h2v6h-2V9ZM7 7h2v10H7V7Zm8 0h2v10h-2V7Zm-4-1h2v12h-2V6Z" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight">FitPersonal</span>
    </div>
  );
}

export default function Navbar() {
  const { token, user, logout } = useAuth();
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!token) return null;

  const navItems = [
    {
      href: "/slots",
      label: "Mis clases",
      icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>,
      show: true,
    },
    {
      href: "/coaches",
      label: "Profesores",
      icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /></svg>,
      show: isAdmin(user?.role),
    },
    {
      href: "/admin/slots",
      label: "Gestionar clases",
      icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></svg>,
      show: isAdmin(user?.role) || isTeacher(user?.role),
    },
    {
      href: "/admin/users",
      label: "Usuarios",
      icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>,
      show: isAdmin(user?.role),
    },
    {
      href: "/admin/activities",
      label: "Actividades",
      icon: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
      show: isAdmin(user?.role),
    },
  ];

  const Tab = ({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) => (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition",
        path === href
          ? "bg-violet-50 text-[#6d3df2] shadow-sm shadow-violet-100"
          : "text-slate-700 hover:bg-slate-100"
      )}
    >
      <Icon>{icon}</Icon>
      {label}
    </Link>
  );

  const displayName = user?.email?.split("@")[0] || "Laura";

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[300px] border-r border-slate-200/80 bg-white/90 px-5 py-8 backdrop-blur-xl lg:flex lg:flex-col">
        <Logo />
        <nav className="mt-12 flex flex-1 flex-col gap-2">
          {navItems.filter((item) => item.show).map((item) => (
            <Tab key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="grid size-10 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {(user?.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <span className="text-slate-500">v</span>
          </div>
          <button onClick={logout} className="flex items-center gap-3 px-3 text-sm font-medium text-slate-700">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
            Salir
          </button>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-30 border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur-xl lg:left-[300px] lg:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
              aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen
                  ? <path d="M6 6l12 12M18 6 6 18" />
                  : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <Logo />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-5 text-sm font-medium">
            <span className="hidden sm:inline">Hola, {displayName}!</span>
            <button className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notificaciones">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <span className="absolute right-2 top-1 size-2 rounded-full bg-[#6d3df2]" />
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl lg:hidden">
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.filter((item) => item.show).map((item) => (
                <Tab key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
              Salir
            </button>
          </div>
        )}
      </div>
    </>
  );
}
