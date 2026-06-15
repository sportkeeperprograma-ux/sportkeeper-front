"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { TeacherLite, loadTeachers } from "../../lib/classes";
import { roleLabel } from "../../lib/roles";

type Coach = TeacherLite & {
  fullName?: string;
  name?: string | null;
  isActive?: boolean;
  status?: string;
};

const coachName = (coach: Coach) => coach.fullName || coach.name || coach.email;

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const reload = async () => {
    try {
      setLoading(true);
      setMsg("");
      setCoaches((await loadTeachers()) as Coach[]);
    } catch (e: any) {
      setMsg(e.message || "No se pudieron cargar los profesores");
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Profesores</h1>
          <p className="mt-2 text-slate-500">Usuarios dados de alta con rol profesor.</p>
        </div>
        <Button onClick={reload} loading={loading}>Recargar</Button>
      </div>

      {msg && <p className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{msg}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {coaches.map((coach) => (
          <Card key={coach.id} className="rounded-lg border border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-full bg-violet-100 text-lg font-bold text-[#6d3df2]">
                  {coachName(coach).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate">{coachName(coach)}</CardTitle>
                  <p className="truncate text-sm text-slate-500">{coach.email}</p>
                </div>
              </div>
              <Badge color="blue">{roleLabel(coach.role)}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600">
                Estado: {coach.isActive === false || coach.status === "inactive" ? "Inactivo" : "Activo"}
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && !coaches.length && !msg && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
            No hay profesores dados de alta.
          </div>
        )}
      </div>
    </section>
  );
}
