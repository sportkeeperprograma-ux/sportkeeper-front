"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import { fmtRange, toLocalDbString } from "../../../lib/format";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  reservedCount?: number;
  name: string;
  description: string;
};

// 👇 NUEVO: tipos ligeros para selects
type UserLite = { id: string; email: string; role: "ADMIN" | "COACH" | "MEMBER"; fullName?: string };
type ActivityLite = { id: string; code: string; name: string };

type RepeatFreq = "NONE" | "DAILY" | "WEEKLY";
const toIsoSeconds = (v: string) => (v && v.length === 16 ? v + ":00" : v);

// --- helpers de fechas (sin dependencias) ---
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (d: Date, days: number) => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
const addMinutes = (d: Date, minutes: number) => { const nd = new Date(d); nd.setMinutes(nd.getMinutes() + minutes); return nd; };
const formatYmd = (d: Date) => d.toLocaleDateString().substring(0, 10);

// Matriz (6 semanas x 7 días) para el calendario mensual
function getMonthMatrix(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7)); // lunes=0
  const weeks: Date[][] = [];
  let curr = start;
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) { row.push(curr); curr = addDays(curr, 1); }
    weeks.push(row);
  }
  return weeks;
}

export default function AdminSlots() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startAt, setStart] = useState("");
  const [endAt, setEnd] = useState("");
  const [capacity, setCap] = useState(30);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // 👇 NUEVO: datos de selects
  const [coaches, setCoaches] = useState<UserLite[]>([]);
  const [activities, setActivities] = useState<ActivityLite[]>([]);
  const [coachId, setCoachId] = useState<string>("");               // 👈 NUEVO
  const [activityId, setActivityId] = useState<string>("");         // 👈 NUEVO

  // Repetición
  const [repeatFreq, setRepeatFreq] = useState<RepeatFreq>("NONE");
  const [repeatUntil, setRepeatUntil] = useState(""); // yyyy-mm-dd
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [splitMinutes, setSplitMinutes] = useState<number>(0);

  // Calendario
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    (async () => {
      setSlots(await apiGet("/api/slots"));
      // 👇 NUEVO: cargar coaches y actividades
      try {
        const cs = await apiGet("/api/admin/users?role=COACH");      // ajusta si tu endpoint difiere
        setCoaches(cs as UserLite[]);
      } catch {}
      try {
        const acts = await apiGet("/api/activities");                // o /api/admin/activities
        setActivities(acts as ActivityLite[]);
      } catch {}
    })();
  }, []);

  const reload = async () => setSlots(await apiGet("/api/slots"));

  const weeks = useMemo(() => getMonthMatrix(monthAnchor), [monthAnchor]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = formatYmd(new Date(s.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    return map;
  }, [slots]);

  // --- creación de slots (simple o recursivo) ---
  const buildOccurrences = (): { start: Date; end: Date }[] => {
    if (!startAt || !endAt) return [];
    const s0 = new Date(toIsoSeconds(startAt));
    const e0 = new Date(toIsoSeconds(endAt));
    if (isNaN(s0.getTime()) || isNaN(e0.getTime()) || e0 <= s0) return [];

    const dayBlocks = (): { start: Date; end: Date }[] => {
      if (!splitMinutes || splitMinutes <= 0) return [{ start: s0, end: e0 }];
      const out: { start: Date; end: Date }[] = [];
      let cursor = s0;
      while (cursor < e0) { const next = addMinutes(cursor, splitMinutes); out.push({ start: cursor, end: next <= e0 ? next : e0 }); cursor = next; }
      return out;
    };

    if (repeatFreq === "NONE") return dayBlocks();

    const until = repeatUntil ? endOfDay(new Date(repeatUntil)) : addDays(s0, 60);
    const occs: { start: Date; end: Date }[] = [];
    let d = new Date(s0);
    while (d <= until) {
      if (repeatFreq === "DAILY" || (repeatFreq === "WEEKLY" && weeklyDays.includes(((d.getDay() + 6) % 7) + 1))) {
        const start = new Date(d); start.setHours(s0.getHours(), s0.getMinutes(), s0.getSeconds(), 0);
        const end = new Date(d);   end.setHours(e0.getHours(), e0.getMinutes(), e0.getSeconds(), 0);

        if (splitMinutes && splitMinutes > 0) {
          let c = start; while (c < end) { const nx = addMinutes(c, splitMinutes); occs.push({ start: c, end: nx <= end ? nx : end }); c = nx; }
        } else {
          occs.push({ start, end });
        }
      }
      d = addDays(d, 1);
    }
    return occs;
  };

  const createSlots = async () => {
    try {
      setLoading(true);
      const occs = buildOccurrences();
      if (!occs.length) throw new Error("Rellena Inicio/Fin correctamente");
      if (!coachId) throw new Error("Selecciona un coach");                 // 👈 NUEVO
      if (!activityId) throw new Error("Selecciona una disciplina");        // 👈 NUEVO

      const activityObj = activities.find(a => a.id === activityId);
      if (!activityObj) throw new Error("Disciplina no encontrada");
      for (const { start, end } of occs) {
        await apiPost("/api/admin/slots", {
          startAt: toLocalDbString(start),
          endAt: toLocalDbString(end),
          capacity,
          name,
          description,
          coachId,
          activity: activityObj // Enviar el objeto completo
        });
      }
      setMsg(occs.length === 1 ? "Slot creado" : `${occs.length} slots creados`);
      await reload();
    } catch (e: any) {
      setMsg(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const updateCapacity = async (id: string, cap: number) => {
    try { await apiPut(`/api/admin/slots/${id}`, { capacity: cap }); await reload(); }
    catch (e: any) { setMsg(e.message || "Error"); }
  };

  const remove = async (id: string) => {
    try { await apiDelete(`/api/admin/slots/${id}`); await reload(); }
    catch (e: any) { setMsg(e.message || "Error"); }
  };

  const monthName = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Admin / Slots</h2>

      <Card>
        <CardHeader><CardTitle>Crear slot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 👇 NUEVO: selección de disciplina */}
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Disciplina</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={activityId}
                onChange={e => setActivityId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                ))}
              </select>
            </div>

            {/* 👇 NUEVO: selección de coach */}
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Coach</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={coachId}
                onChange={e => setCoachId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.email} {c.role !== "COACH" ? `(${c.role})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Inicio</label>
              <Input type="datetime-local" value={startAt} onChange={e => setStart(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Fin</label>
              <Input type="datetime-local" value={endAt} onChange={e => setEnd(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1">Capacidad</label>
              <Input type="number" value={capacity} onChange={e => setCap(parseInt(e.target.value || "0"))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Nombre</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs mb-1">Descripción</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {/* Repetición */}
            <div>
              <label className="block text-xs mb-1">Repetición</label>
              <select className="w-full rounded-md border px-3 py-2" value={repeatFreq} onChange={e => setRepeatFreq(e.target.value as RepeatFreq)}>
                <option value="NONE">Ninguna</option>
                <option value="DAILY">Diaria</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </div>

            {repeatFreq !== "NONE" && (
              <>
                <div>
                  <label className="block text-xs mb-1">Hasta (incl.)</label>
                  <Input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} />
                </div>
                {repeatFreq === "WEEKLY" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs mb-1">Días de la semana</label>
                    <div className="flex gap-2 flex-wrap">
                      {["L", "M", "X", "J", "V", "S", "D"].map((lbl, idx) => {
                        const val = idx + 1;
                        const active = weeklyDays.includes(val);
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setWeeklyDays(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
                            }
                            className={`px-2 py-1 rounded border ${active ? "bg-black text-white" : "bg-white"}`}
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="sm:col-span-4 flex items-end">
              <Button onClick={createSlots} loading={loading}>Crear</Button>
            </div>
          </div>
          {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg tracking-tight">Calendario</CardTitle>
            <div className="flex items-center gap-2 flex-nowrap">
              <Button onClick={() => setMonthAnchor(new Date())}>Hoy</Button>
              <Button className="h-8 w-8" aria-label="Mes anterior"
                onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>◀</Button>
              <div className="w-40 text-center font-medium capitalize text-sm sm:text-base select-none">
                {monthName}
              </div>
              <Button className="h-8 w-8" aria-label="Mes siguiente"
                onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>▶</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-7 text-sm font-medium text-gray-500 mb-3">
              {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (<div key={d} className="px-2">{d}</div>))}
            </div>

            <div className="grid grid-cols-7 gap-3">
              {weeks.flat().map((day, idx) => {
                const isCurrMonth = day.getMonth() === monthAnchor.getMonth();
                const key = formatYmd(day);
                const daySlots = ((): Slot[] => {
                  const map = new Map<string, Slot[]>();
                  for (const s of slots) {
                    const k = formatYmd(new Date(s.startAt));
                    if (!map.has(k)) map.set(k, []);
                    map.get(k)!.push(s);
                  }
                  for (const arr of map.values()) arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                  return map.get(key) || [];
                })();

                return (
                  <div key={idx} className={`min-h-48 rounded-xl border p-3 flex flex-col gap-2 ${isCurrMonth ? "bg-white" : "bg-gray-50/80"}`}>
                    <div className="text-sm font-semibold flex justify-between items-center">
                      <span>{day.getDate()}</span>
                      <button
                        className="underline"
                        onClick={() => {
                          const now = new Date();
                          const preset = new Date(day.getFullYear(), day.getMonth(), day.getDate(), now.getHours(), now.getMinutes(), 0, 0);
                          const v = toLocalDbString(preset);
                          setStart(v); setEnd(v);
                        }}
                      >
                        + usar fecha
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {daySlots.map(s => (
                        <div key={s.id} className="rounded-lg border p-2 flex flex-col gap-2">
                          <div className="text-sm font-medium leading-tight">
                            {fmtRange(s.startAt, s.endAt)}
                          </div>
                          {s.name && <div className="text-xs text-gray-600 truncate">{s.name}</div>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Input
                              type="number"
                              className="w-20 h-9"
                              defaultValue={s.capacity}
                              onBlur={e => updateCapacity(s.id, parseInt(e.target.value || `${s.capacity}`))}
                            />
                            <Button variant="danger" className="flex-shrink-0" onClick={()=>remove(s.id)}>
                              Borrar
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!daySlots.length && (<div className="text-xs text-gray-400">Sin slots</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
