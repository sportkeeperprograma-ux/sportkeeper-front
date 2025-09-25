"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiDelete } from "../../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
// (Opcional) si tienes AuthContext para evitar auto-borrarte
import { useAuth } from "../../../components/AuthContext";

type Role = "ADMIN" | "COACH" | "MEMBER";

type User = {
  id: string;
  name?: string | null;
  email: string;
  role: Role;
  createdAt?: string;
  lastLoginAt?: string | null;
  isActive?: boolean;
};

const ROLE_OPTIONS: Role[] = ["ADMIN", "COACH", "MEMBER"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Role>>({});
  const { user: me } = useAuth?.() ?? { user: undefined };

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/admin/users"); // <-- GET listado
      setUsers(data);
      setMsg("");
      setEdits({});
    } catch (e: any) {
      setMsg(e.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name ?? "", u.email, u.role].some((v) => v?.toString().toLowerCase().includes(q))
    );
  }, [users, query]);

  const changeRole = (id: string, role: Role) =>
    setEdits((prev) => ({ ...prev, [id]: role }));

  const saveRole = async (u: User) => {
    const newRole = edits[u.id];
    if (!newRole || newRole === u.role) return;
    try {
      setSavingId(u.id);
      await apiPatch(`/api/admin/users/${u.id}/role`, { role: newRole });
      setMsg(`Rol actualizado para ${u.email}`);
      await load();
    } catch (e: any) {
      setMsg(e.message || "No se pudo actualizar el rol");
    } finally {
      setSavingId(null);
    }
  };

  const removeUser = async (u: User) => {
    if (me && (me as any).id && (me as any).id === u.id) {
      setMsg("No puedes eliminar tu propio usuario.");
      return;
    }
    if (!confirm(`¿Eliminar al usuario ${u.email}? Esta acción es irreversible.`)) return;
    try {
      setDeletingId(u.id);
      await apiDelete(`/api/admin/users/${u.id}`); // <-- DELETE usuario
      setMsg(`Usuario ${u.email} eliminado`);
      await load();
    } catch (e: any) {
      setMsg(e.message || "No se pudo eliminar el usuario");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6">
      <main className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Gestión de usuarios</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nombre, email o rol…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64"
            />
            <Button onClick={load} loading={loading}>Recargar</Button>
          </div>
        </div>

        {msg && <p className="text-sm text-gray-600">{msg}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cabecera de tabla */}
            <div className="grid grid-cols-1 sm:grid-cols-12 px-2 py-2 text-xs font-medium text-gray-500">
              <div className="sm:col-span-5">Usuario</div>
              <div className="sm:col-span-2">Rol</div>
              <div className="sm:col-span-3">Actividad</div>
              <div className="sm:col-span-2 text-right">Acciones</div>
            </div>
            <div className="divide-y rounded-lg border">
              {filtered.map((u) => {
                const roleCurrent = edits[u.id] ?? u.role;
                const changed = roleCurrent !== u.role;
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 px-3 py-3"
                  >
                    {/* Usuario */}
                    <div className="sm:col-span-5">
                      <div className="font-medium">
                        {u.name || "(Sin nombre)"}{" "}
                        <span className="text-gray-500">·</span>{" "}
                        <span className="text-gray-700">{u.email}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        ID: {u.id.slice(0, 8)}… · Creado:{" "}
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </div>
                    </div>

                    {/* Rol */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          value={roleCurrent}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <Badge color={u.role === "ADMIN" ? "red" : u.role === "COACH" ? "blue" : "green"}>
                          {u.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Actividad */}
                    <div className="sm:col-span-3 text-sm">
                      <div className="text-gray-700">
                        Último acceso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Estado: {u.isActive === false ? "Inactivo" : "Activo"}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="sm:col-span-2 flex items-center justify-end gap-2">
                      <Button
                        variant={changed ? "primary" : "secondary"}
                        disabled={!changed}
                        loading={savingId === u.id}
                        onClick={() => saveRole(u)}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="danger"
                        loading={deletingId === u.id}
                        onClick={() => removeUser(u)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!filtered.length && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No hay usuarios que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

