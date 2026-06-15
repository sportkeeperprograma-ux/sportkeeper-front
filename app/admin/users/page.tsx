"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from "../../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import { useAuth } from "../../../components/AuthContext";
import { AppRole, isAdmin, isStudent, isTeacher, roleLabel } from "../../../lib/roles";

type Role = "MEMBER" | "ADMIN" | "COACH";

type User = {
  id: string;
  name?: string | null;
  email: string;
  contactEmail?: string | null;
  contact_email?: string | null;
  monthlyContractedClasses?: number | null;
  monthly_contracted_classes?: number | null;
  contractedClassesPerMonth?: number | null;
  contracted_classes_per_month?: number | null;
  monthlyContractedHours?: number | null;
  monthly_contracted_hours?: number | null;
  contractedHoursPerMonth?: number | null;
  contracted_hours_per_month?: number | null;
  role: AppRole;
  createdAt?: string;
  lastLoginAt?: string | null;
  isActive?: boolean;
  status?: string;
};

type UserContractEdit = {
  activityIds: string[];
  contractedReservations: string;
};

type AdminUsersTab = "access" | "contract";
type ActivityLite = { id: string; code?: string; name: string };
type BillingPlan = {
  activityIds?: string[];
  activities?: { id: string }[];
  contractedReservations?: number;
  contracted_reservations?: number;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "MEMBER", label: "Alumno" },
  { value: "COACH", label: "Profesor" },
  { value: "ADMIN", label: "Administrador" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityLite[]>([]);
  const [activeTab, setActiveTab] = useState<AdminUsersTab>("access");
  const [planMonth, setPlanMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingContractId, setSavingContractId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [edits, setEdits] = useState<Record<string, Role>>({});
  const [contractEdits, setContractEdits] = useState<Record<string, UserContractEdit>>({});
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("MEMBER");
  const { user: me } = useAuth?.() ?? { user: undefined };

  const getContractEdit = (u: User): UserContractEdit =>
    contractEdits[u.id] ?? {
      activityIds: activities.map((activity) => activity.id),
      contractedReservations: "",
    };

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/api/admin/users"); // <-- GET listado
      setUsers(data);
      try {
        const activityData = await apiGet("/api/activities");
        setActivities(Array.isArray(activityData) ? activityData : []);
      } catch {}
      setMsg("");
      setEdits({});
      setContractEdits({});
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

  const changeContractEdit = (id: string, patch: Partial<UserContractEdit>) =>
    setContractEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { activityIds: [], contractedReservations: "" }), ...patch },
    }));

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newEmail.trim()) throw new Error("Introduce un email");

      setCreating(true);
      await apiPost("/api/admin/users", {
        email: newEmail.trim(),
        role: newRole,
      });

      setMsg(`Usuario creado: ${newEmail.trim()}`);
      setNewEmail("");
      setNewRole("MEMBER");
      await load();
    } catch (e: any) {
      setMsg(e.message || "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  };

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

  const saveContract = async (u: User) => {
    const edit = getContractEdit(u);
    const contractedReservations = Number(edit.contractedReservations || 0);

    if (Number.isNaN(contractedReservations) || contractedReservations < 0) {
      setMsg("Las reservas mensuales deben ser un numero igual o mayor que 0.");
      return;
    }

    const body = {
      activityIds: edit.activityIds.length ? edit.activityIds : activities.map((activity) => activity.id),
      contractedReservations,
    };

    try {
      setSavingContractId(u.id);
      await apiPut(`/api/admin/billing/plans/${u.id}/${planMonth}`, body);
      setMsg(`Plan mensual actualizado para ${u.email}`);
    } catch (e: any) {
      setMsg(e.message || "No se pudo actualizar el plan mensual");
    } finally {
      setSavingContractId(null);
    }
  };

  const normalizePlan = (plan: BillingPlan): UserContractEdit => {
    const activityIds = plan.activityIds || plan.activities?.map((activity) => activity.id) || [];
    const contractedReservations = plan.contractedReservations ?? plan.contracted_reservations ?? 0;

    return {
      activityIds,
      contractedReservations: String(contractedReservations || ""),
    };
  };

  const loadPlan = async (u: User, silent = false) => {
    try {
      const plan = await apiGet(`/api/admin/billing/plans/${u.id}/${planMonth}`) as BillingPlan;
      setContractEdits((prev) => ({
        ...prev,
        [u.id]: normalizePlan(plan),
      }));
    } catch (e: any) {
      setContractEdits((prev) => ({
        ...prev,
        [u.id]: {
          activityIds: activities.map((activity) => activity.id),
          contractedReservations: "",
        },
      }));
      if (!silent) setMsg(e.message || "No se pudo cargar el plan mensual");
    }
  };

  useEffect(() => {
    if (activeTab !== "contract" || !users.length) return;
    const students = users.filter((u) => isStudent(u.role));
    students.forEach((student) => {
      loadPlan(student, true);
    });
  }, [activeTab, activities, planMonth, users]);

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

        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "access" ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            Acceso y roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${activeTab === "contract" ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            Plan mensual
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generar usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 lg:grid-cols-12" onSubmit={createUser}>
              <div className="lg:col-span-3">
                <label className="mb-1 block text-xs text-gray-500">Email</label>
                <Input
                  type="email"
                  placeholder="usuario@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-1 block text-xs text-gray-500">Rol</label>
                <select
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-black/10"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end lg:col-span-4">
                <Button type="submit" loading={creating} className="w-full">
                  Crear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {activeTab === "access" ? (
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
                const roleCurrent = edits[u.id] ?? (String(u.role).toUpperCase() as Role);
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
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <Badge color={isAdmin(u.role) ? "red" : isTeacher(u.role) ? "blue" : "green"}>
                          {roleLabel(u.role)}
                        </Badge>
                      </div>
                    </div>

                    {/* Actividad */}
                    <div className="sm:col-span-3 text-sm">
                      <div className="text-gray-700">
                        Último acceso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Estado: {u.isActive === false || u.status === "inactive" ? "Inactivo" : "Activo"}
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
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Mes del plan</label>
                <Input
                  type="month"
                  value={planMonth}
                  onChange={(e) => {
                    setPlanMonth(e.target.value);
                    setContractEdits({});
                  }}
                  className="w-48"
                />
              </div>
              <p className="text-sm text-gray-500">
                Define actividades y reservas contratadas para cada alumno.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 px-2 py-2 text-xs font-medium text-gray-500">
              <div className="sm:col-span-3">Alumno</div>
              <div className="sm:col-span-5">Actividades</div>
              <div className="sm:col-span-2">Reservas/mes</div>
              <div className="sm:col-span-2 text-right">Acciones</div>
            </div>
            <div className="divide-y rounded-lg border">
              {filtered.filter((u) => isStudent(u.role)).map((u) => {
                const edit = getContractEdit(u);

                return (
                  <div key={u.id} className="grid grid-cols-1 items-center gap-3 px-3 py-3 sm:grid-cols-12">
                    <div className="sm:col-span-3">
                      <div className="font-medium">{u.name || "(Sin nombre)"}</div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                      <div className="mt-1 text-xs text-gray-500">{roleLabel(u.role)}</div>
                    </div>
                    <div className="sm:col-span-5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activities.map((activity) => {
                          const checked = edit.activityIds.includes(activity.id);
                          return (
                            <label key={activity.id} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const activityIds = e.target.checked
                                    ? [...edit.activityIds, activity.id]
                                    : edit.activityIds.filter((id) => id !== activity.id);
                                  changeContractEdit(u.id, { activityIds });
                                }}
                              />
                              <span className="truncate">{activity.name}</span>
                            </label>
                          );
                        })}
                        {!activities.length && <span className="text-sm text-gray-500">No hay actividades.</span>}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={edit.contractedReservations}
                        onChange={(e) => changeContractEdit(u.id, { contractedReservations: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end sm:col-span-2">
                      <Button
                        loading={savingContractId === u.id}
                        onClick={() => saveContract(u)}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!filtered.filter((u) => isStudent(u.role)).length && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No hay alumnos que coincidan con la busqueda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  );
}

