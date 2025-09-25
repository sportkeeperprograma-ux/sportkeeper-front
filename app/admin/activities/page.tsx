"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";

type Activity = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export default function AdminActivitiesPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // form nuevo
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  async function load() {
    setMsg("");
    try {
      setLoading(true);
      const data = (await apiGet("/api/activities")) as Activity[];
      // ordena por nombre
      setItems([...data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      setMsg(e?.message ?? "Error cargando actividades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function normalizeCode(v: string) {
    // MAYÚSCULAS, quita espacios extremos, reemplaza espacios internos por _
    return v.trim().toUpperCase().replace(/\s+/g, "_");
  }

  async function createActivity() {
    try {
      if (!code || !name) throw new Error("Rellena código y nombre");
      const body = { code: normalizeCode(code), name: name.trim(), active };
      const res = (await apiPost("/api/admin/activities", body)) as { id: string };
      setMsg("Actividad creada");
      setCode("");
      setName("");
      setActive(true);
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Error al crear actividad");
    }
  }

  async function saveActivity(row: Activity) {
    try {
      const body = {
        code: normalizeCode(row.code),
        name: row.name.trim(),
        active: row.active,
      };
      await apiPut(`/api/admin/activities/${row.id}`, body);
      setMsg("Actividad guardada");
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? "Error al guardar actividad");
    }
  }

  return (
    <main className="space-y-6">
      <h2 className="text-xl font-semibold">Admin / Actividades</h2>

      {/* Crear nueva */}
      <Card>
        <CardHeader>
          <CardTitle>Crear actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs mb-1">Código</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="BJJ, BOXING, GRAPPLING, MMA…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Nombre</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brazilian Jiu-Jitsu"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Activa
              </label>
              <Button onClick={createActivity}>Crear</Button>
            </div>
          </div>
          {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      {/* Listado / edición rápida */}
      <Card>
        <CardHeader>
          <CardTitle>Actividades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">No hay actividades.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="p-2">Código</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Activa</th>
                    <th className="p-2 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <Row
                      key={a.id}
                      initial={a}
                      onSave={saveActivity}
                      normalizeCode={normalizeCode}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Row({
  initial,
  onSave,
  normalizeCode,
}: {
  initial: Activity;
  onSave: (row: Activity) => Promise<void>;
  normalizeCode: (v: string) => string;
}) {
  const [row, setRow] = useState<Activity>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setRow(initial), [initial]);

  async function save() {
    setSaving(true);
    try {
      await onSave(row);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t">
      <td className="p-2">
        <Input
          value={row.code}
          onChange={(e) =>
            setRow((r) => ({ ...r, code: e.target.value }))
          }
          onBlur={(e) =>
            setRow((r) => ({ ...r, code: normalizeCode(e.target.value) }))
          }
        />
      </td>
      <td className="p-2">
        <Input
          value={row.name}
          onChange={(e) => setRow((r) => ({ ...r, name: e.target.value }))}
        />
      </td>
      <td className="p-2">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.active}
            onChange={(e) =>
              setRow((r) => ({ ...r, active: e.target.checked }))
            }
          />
          <span className="text-xs text-gray-600">Activa</span>
        </label>
      </td>
      <td className="p-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </td>
    </tr>
  );
}
