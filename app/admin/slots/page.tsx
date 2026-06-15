"use client";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import { fmtRange, toLocalDbString } from "../../../lib/format";
import { AppRole, isTeacher } from "../../../lib/roles";
import { ClassSession, loadClassSessions } from "../../../lib/classes";

// 👇 NUEVO: tipos ligeros para selects
type UserLite = { id: string; email: string; role: AppRole; fullName?: string; name?: string | null };
type ActivityLite = { id: string; code: string; name: string };
type ReservationStatus = "ACTIVE" | "BOOKED" | "WAITLIST" | string;
type CalendarMode = "week" | "month";
type ReservationParticipant = {
  id?: string;
  email: string;
  name?: string;
  status: ReservationStatus;
};
type SlotReservationDetail = {
  reserved: ReservationParticipant[];
  waitlist: ReservationParticipant[];
};

type RepeatFreq = "NONE" | "DAILY" | "WEEKLY";
const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DEFAULT_SLOT_DURATION_MINUTES = 60;
const toIsoSeconds = (v: string) => (v && v.length === 16 ? v + ":00" : v);
const asArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.attendees)) return data.attendees;
  return [];
};
const firstValue = (...values: any[]) => values.find((item) => item !== undefined && item !== null && item !== "");
const normalizeReservationParticipant = (raw: any): ReservationParticipant | null => {
  if (typeof raw === "string") {
    return {
      id: raw,
      email: raw,
      status: "ACTIVE",
    };
  }

  const user = raw.user || raw.member || raw.student || raw.customer || raw.attendee || raw;
  const email = firstValue(
    raw.email,
    user.email,
    raw.userEmail,
    raw.user_email,
    raw.studentEmail,
    raw.student_email,
    raw.memberEmail,
    raw.member_email
  );
  const id = firstValue(raw.id, raw.reservationId, raw.reservation_id, user.id);
  const status = String(firstValue(raw.status, raw.reservationStatus, raw.reservation_status, "ACTIVE")).toUpperCase();

  if (!email && !user.name && !user.fullName && !id) return null;

  return {
    id: id ? String(id) : undefined,
    email: email ? String(email) : String(id || "Usuario sin email"),
    name: firstValue(raw.name, raw.fullName, raw.full_name, user.name, user.fullName, user.full_name),
    status,
  };
};
const splitReservationDetail = (items: ReservationParticipant[]): SlotReservationDetail => ({
  reserved: items.filter((item) => item.status !== "WAITLIST" && item.status !== "CANCELLED"),
  waitlist: items.filter((item) => item.status === "WAITLIST"),
});

const normalizeReservationList = (items: any[], fallbackStatus: ReservationStatus) =>
  items
    .map((item) => normalizeReservationParticipant({ ...item, status: firstValue(item?.status, fallbackStatus) }))
    .filter((item): item is ReservationParticipant => Boolean(item));

const normalizeReservationDetail = (data: any): SlotReservationDetail => {
  if (Array.isArray(data?.reserved) || Array.isArray(data?.waitlist)) {
    return {
      reserved: normalizeReservationList(data?.reserved || [], "ACTIVE"),
      waitlist: normalizeReservationList(data?.waitlist || [], "WAITLIST"),
    };
  }

  if (Array.isArray(data?.active) || Array.isArray(data?.waiting)) {
    return {
      reserved: normalizeReservationList(data?.active || [], "ACTIVE"),
      waitlist: normalizeReservationList(data?.waiting || [], "WAITLIST"),
    };
  }

  const items = asArray(data)
    .map(normalizeReservationParticipant)
    .filter((item): item is ReservationParticipant => Boolean(item));

  return splitReservationDetail(items);
};

// --- helpers de fechas (sin dependencias) ---
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (d: Date, days: number) => { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; };
const addMinutes = (d: Date, minutes: number) => { const nd = new Date(d); nd.setMinutes(nd.getMinutes() + minutes); return nd; };
const addMonths = (d: Date, months: number) => new Date(d.getFullYear(), d.getMonth() + months, 1);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const formatYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseSlotDate = (value: string) => {
  if (value.endsWith("Z")) return new Date(value);
  return new Date(value.replace(" ", "T"));
};
const formatTime = (value: string) =>
  parseSlotDate(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const monthLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
const teacherName = (teacher: UserLite) => teacher.fullName || teacher.name || teacher.email || "Sin profesor";
const teacherInitial = (teacher: UserLite) => teacherName(teacher).slice(0, 1).toUpperCase();
const slotTeacherId = (slot: ClassSession) => slot.teacherId || "unassigned";
const unassignedTeacher: UserLite = { id: "unassigned", email: "", role: "COACH", name: "Sin profesor asignado" };

const getMonthMatrix = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

export default function AdminSlots() {
  const [slots, setSlots] = useState<ClassSession[]>([]);
  const [startAt, setStart] = useState("");
  const [endAt, setEnd] = useState("");
  const [capacity, setCap] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [reservationDetails, setReservationDetails] = useState<Record<string, SlotReservationDetail>>({});

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
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [selectedDay, setSelectedDay] = useState<string>(() => formatYmd(new Date()));

  useEffect(() => {
    (async () => {
      setSlots(await loadClassSessions());
      // 👇 NUEVO: cargar coaches y actividades
      const teacherEndpoints = ["/api/teachers", "/api/admin/users?role=teacher", "/api/admin/users?role=COACH"];
      for (const endpoint of teacherEndpoints) {
        try {
          const cs = (await apiGet(endpoint)) as UserLite[];
          const teachers = cs.filter((candidate) => isTeacher(candidate.role));
          if (teachers.length) {
            setCoaches(teachers);
            break;
          }
        } catch {}
      }
      try {
        const acts = await apiGet("/api/activities");                // o /api/admin/activities
        setActivities(acts as ActivityLite[]);
      } catch {}
    })();
  }, []);

  const reload = async () => setSlots(await loadClassSessions());

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekAnchor, index)),
    [weekAnchor]
  );
  const monthDays = useMemo(() => getMonthMatrix(monthAnchor), [monthAnchor]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of slots) {
      const key = formatYmd(parseSlotDate(s.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => parseSlotDate(a.startAt).getTime() - parseSlotDate(b.startAt).getTime());
    return map;
  }, [slots]);

  const selectedDaySlots = slotsByDay.get(selectedDay) || [];

  const teachersForCalendar = useMemo(() => {
    if (!selectedDaySlots.length) return [];

    const teachersById = new Map(coaches.map((teacher) => [teacher.id, teacher]));
    const columns = new Map<string, UserLite>();

    for (const slot of selectedDaySlots) {
      const teacherId = slotTeacherId(slot);

      if (!teacherId || teacherId === "unassigned") {
        columns.set(unassignedTeacher.id, unassignedTeacher);
        continue;
      }

      columns.set(
        teacherId,
        slot.teacher || teachersById.get(teacherId) || {
          id: teacherId,
          email: "",
          role: "COACH",
          name: "Profesor",
        }
      );
    }

    return Array.from(columns.values());
  }, [coaches, selectedDaySlots]);

  const currentLabel = calendarMode === "week"
    ? `${days[0].getDate()} - ${days[6].getDate()} ${monthLabel(days[3])}`
    : monthLabel(monthAnchor);

  const goPrevious = () => {
    if (calendarMode === "week") setWeekAnchor(addDays(weekAnchor, -7));
    else setMonthAnchor(addMonths(monthAnchor, -1));
  };

  const goNext = () => {
    if (calendarMode === "week") setWeekAnchor(addDays(weekAnchor, 7));
    else setMonthAnchor(addMonths(monthAnchor, 1));
  };

  const goToday = () => {
    const today = new Date();
    setWeekAnchor(startOfWeek(today));
    setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(formatYmd(today));
  };

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
      if (!coachId) throw new Error("Selecciona un profesor");
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
          teacherId: coachId,
          coachId,
          activity: activityObj
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

  const loadReservationDetail = async (slotId: string) => {
    try {
      setLoadingDetailsId(slotId);
      const endpoints = [
        `/api/admin/slots/${slotId}/reservations`,
        `/api/slots/${slotId}/reservations`,
        `/api/reservations/slot/${slotId}`,
        `/api/teacher/slots/${slotId}/attendees`,
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await apiGet(endpoint);
          setReservationDetails((current) => ({
            ...current,
            [slotId]: normalizeReservationDetail(data),
          }));
          return;
        } catch {}
      }

      throw new Error("No se pudo cargar el detalle de reservas");
    } catch (e: any) {
      setMsg(e.message || "Error cargando reservas");
    } finally {
      setLoadingDetailsId(null);
    }
  };

  const applyDefaultDuration = (startValue: string) => {
    const startDate = new Date(toIsoSeconds(startValue));
    if (Number.isNaN(startDate.getTime())) return;
    setEnd(toLocalDbString(addMinutes(startDate, DEFAULT_SLOT_DURATION_MINUTES)));
  };

  return (
    <main className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-slate-950">Gestionar clases</h2>

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
              <label className="block text-xs mb-1">Profesor</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={coachId}
                onChange={e => setCoachId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.name || c.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Inicio</label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={e => {
                  const nextStart = e.target.value;
                  setStart(nextStart);

                  const currentEnd = new Date(toIsoSeconds(endAt));
                  const nextStartDate = new Date(toIsoSeconds(nextStart));
                  if (!endAt || Number.isNaN(currentEnd.getTime()) || currentEnd <= nextStartDate) {
                    applyDefaultDuration(nextStart);
                  }
                }}
              />
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
            <div>
              <CardTitle className="text-lg tracking-tight">Calendario</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Visualiza las clases como en Mis clases y abre el detalle del dia para gestionar reservas.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 w-10 rounded-md bg-white px-0 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
                  aria-label={calendarMode === "week" ? "Semana anterior" : "Mes anterior"}
                  onClick={goPrevious}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <Button variant="secondary" className="h-10 rounded-md bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50" onClick={goToday}>
                  Hoy
                </Button>
                <div className="flex h-10 items-center gap-3 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm">
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                  </svg>
                  <span className="capitalize">{currentLabel}</span>
                </div>
                <Button
                  variant="secondary"
                  className="h-10 w-10 rounded-md bg-white px-0 text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
                  aria-label={calendarMode === "week" ? "Semana siguiente" : "Mes siguiente"}
                  onClick={goNext}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>

              <div className="flex rounded-md border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCalendarMode("week")}
                  className={clsx(
                    "rounded px-4 py-2 text-sm font-semibold",
                    calendarMode === "week" ? "bg-violet-50 text-[#6d3df2]" : "text-slate-800"
                  )}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode("month")}
                  className={clsx(
                    "rounded px-4 py-2 text-sm font-semibold",
                    calendarMode === "month" ? "bg-violet-50 text-[#6d3df2]" : "text-slate-800"
                  )}
                >
                  Mes
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {calendarMode === "week" ? (
            <div className="-mx-1 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3 px-1">
              {days.map((day, index) => {
                const key = formatYmd(day);
                const active = key === selectedDay;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={clsx(
                      "min-w-[112px] snap-start rounded-lg border px-5 py-4 text-center shadow-sm transition",
                      active
                        ? "border-[#6d3df2] bg-[#6d3df2] text-white shadow-violet-200"
                        : "border-slate-200 bg-white text-slate-900 hover:border-violet-200"
                    )}
                  >
                    <div className={clsx("text-sm", active ? "text-violet-100" : "text-slate-500")}>{WEEKDAYS[index]}</div>
                    <div className="text-2xl font-bold leading-tight">{day.getDate()}</div>
                    <div className={clsx("text-sm", active ? "text-violet-100" : "text-slate-500")}>
                      {day.toLocaleDateString("es-ES", { month: "short" })}
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
                {WEEKDAYS.map((day) => <div key={day}>{day}</div>)}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthDays.map((day) => {
                  const key = formatYmd(day);
                  const active = key === selectedDay;
                  const daySlots = slotsByDay.get(key) || [];
                  const isCurrentMonth = day.getMonth() === monthAnchor.getMonth();
                  const isToday = sameDay(day, new Date());
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={clsx(
                        "min-h-24 rounded-md border p-2 text-left transition",
                        active ? "border-[#6d3df2] bg-violet-50" : "border-slate-200 hover:border-violet-200",
                        isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"
                      )}
                    >
                      <span className={clsx("text-sm font-semibold", (active || isToday) && "text-[#6d3df2]")}>{day.getDate()}</span>
                      <span className="mt-2 block text-xs text-slate-500">
                        {daySlots.length ? `${daySlots.length} clase${daySlots.length === 1 ? "" : "s"}` : ""}
                      </span>
                      {daySlots.some((slot) => slot.waitlistCount > 0) && (
                        <span className="mt-1 block text-xs font-medium text-amber-700">Hay lista de espera</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950">Clases del dia</h3>
                <p className="text-sm text-slate-500">Vista simplificada por profesor y hora para revisar rapidamente reservas y descripciones.</p>
              </div>
              <div className="text-sm font-medium text-slate-500">
                {selectedDaySlots.length ? `${selectedDaySlots.length} clase${selectedDaySlots.length === 1 ? "" : "s"}` : "Sin clases"}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {(teachersForCalendar.length ? teachersForCalendar : [unassignedTeacher]).map((teacher) => {
                const coachSlots = selectedDaySlots.filter((slot) => slotTeacherId(slot) === teacher.id);
                if (!coachSlots.length) return null;

                return (
                  <div key={teacher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-100 to-teal-100 text-xs font-bold text-slate-700">
                        {teacherInitial(teacher)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{teacherName(teacher)}</div>
                        <div className="text-xs text-slate-500">{coachSlots.length} clase{coachSlots.length === 1 ? "" : "s"} en este dia</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {coachSlots.map((slot, index) => {
                        const full = (slot.reservedCount ?? 0) >= slot.capacity;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedDay(formatYmd(parseSlotDate(slot.startAt)))}
                            className={clsx(
                              "flex w-full flex-col gap-2 rounded-lg border px-4 py-3 text-left shadow-sm transition sm:flex-row sm:items-start sm:justify-between",
                              index % 2 === 0
                                ? "border-violet-200 bg-violet-50 hover:border-violet-300"
                                : "border-slate-200 bg-white hover:border-violet-200"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-950">{formatTime(slot.startAt)} - {formatTime(slot.endAt)}</div>
                              {slot.name && <div className="mt-1 text-sm font-medium text-slate-900">{slot.name}</div>}
                              {slot.description && <p className="mt-1 text-sm leading-6 text-slate-600">{slot.description}</p>}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold">
                              <span className="rounded bg-white px-2 py-1 text-[#6d3df2] ring-1 ring-violet-200">{slot.reservedCount}/{slot.capacity} reservas</span>
                              <span className="rounded bg-white px-2 py-1 text-amber-700 ring-1 ring-amber-200">{slot.waitlistCount} en espera</span>
                              {full && <span className="rounded bg-white px-2 py-1 text-rose-700 ring-1 ring-rose-200">Completa</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!selectedDaySlots.length && (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No hay clases en el dia seleccionado.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950">Detalle del dia seleccionado</h3>
                <p className="text-sm text-slate-500">Gestiona aforo, reservas confirmadas y lista de espera.</p>
              </div>
              <Button
                variant="secondary"
                className="h-10 rounded-md bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() => {
                  const selected = new Date(`${selectedDay}T12:00:00`);
                  const preset = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 9, 0, 0, 0);
                  setStart(toLocalDbString(preset));
                  setEnd(toLocalDbString(addMinutes(preset, DEFAULT_SLOT_DURATION_MINUTES)));
                }}
              >
                Usar fecha en el formulario
              </Button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {selectedDaySlots.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{fmtRange(s.startAt, s.endAt)}</div>
                      {s.name && <div className="mt-1 text-base font-bold text-slate-950">{s.name}</div>}
                      {s.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{s.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded bg-violet-50 px-2 py-1 text-[#6d3df2]">{s.reservedCount}/{s.capacity} reservas</span>
                        <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">{s.waitlistCount} en espera</span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{teacherName((s.teacher as UserLite) || unassignedTeacher)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        className="h-10 w-24"
                        defaultValue={s.capacity}
                        onBlur={e => updateCapacity(s.id, parseInt(e.target.value || `${s.capacity}`))}
                      />
                      <Button
                        variant="secondary"
                        className="flex-shrink-0"
                        loading={loadingDetailsId === s.id}
                        onClick={() => loadReservationDetail(s.id)}
                      >
                        Ver reservas
                      </Button>
                      <Button variant="danger" className="flex-shrink-0" onClick={() => remove(s.id)}>
                        Borrar
                      </Button>
                    </div>
                  </div>

                  {reservationDetails[s.id] && (
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-md bg-green-50 p-3">
                        <div className="mb-2 font-semibold text-green-800">Reservados</div>
                        {reservationDetails[s.id].reserved.length ? (
                          <ul className="space-y-1">
                            {reservationDetails[s.id].reserved.map((person) => (
                              <li key={person.id || person.email}>
                                {person.name ? `${person.name} - ` : ""}{person.email}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-gray-500">Sin reservas.</div>
                        )}
                      </div>
                      <div className="rounded-md bg-amber-50 p-3">
                        <div className="mb-2 font-semibold text-amber-800">Lista de espera</div>
                        {reservationDetails[s.id].waitlist.length ? (
                          <ul className="space-y-1">
                            {reservationDetails[s.id].waitlist.map((person) => (
                              <li key={person.id || person.email}>
                                {person.name ? `${person.name} - ` : ""}{person.email}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-gray-500">Sin lista de espera.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!selectedDaySlots.length && (
                <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 xl:col-span-2">
                  No hay clases en el dia seleccionado.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
