"use client";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api";
import Button from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { fmtRange } from "../../lib/format";
import { useAuth } from "../../components/AuthContext";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  reservedCount?: number;
  name: string;
  description: string;
};

// ---------- helpers de fechas (local, lunes a domingo) ----------
const pad = (n: number) => String(n).padStart(2, "0");
const formatYmdLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Si viene con Z -> UTC a local; si viene sin Z (local) usamos los 10 primeros
const keyFromTimestamp = (ts: string) => {
  if (ts.endsWith("Z")) return formatYmdLocal(new Date(ts));
  return ts.replace(" ", "T").slice(0, 10);
};

const getMonthMatrix = (anchor: Date) => {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mondayIndex = (first.getDay() + 6) % 7; // L=0..D=6
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);

  const weeks: Date[][] = [];
  const d = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
};

const isPast = (iso: string) => new Date(iso) < new Date();

// ---------------------------------------------------------------

export default function SlotsCalendarPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { user } = useAuth();

  const load = async () => {
    try {
      const data = await apiGet("/api/slots");
      setSlots(data);
    } catch (e: any) {
      setMsg(e.message || "Error cargando slots");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reservar = async (id: string) => {
    try {
      setLoadingId(id);
      await apiPost("/api/reservations", { timeSlotId: id, email: user?.email });
      setMsg("¡Reserva creada!");
      await load();
    } catch (e: any) {
      setMsg(e.message || "No se pudo reservar");
    } finally {
      setLoadingId(null);
    }
  };

  const monthName = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weeks = useMemo(() => getMonthMatrix(monthAnchor), [monthAnchor]);

  // Agrupar slots por día (clave YYYY-MM-DD local)
  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = keyFromTimestamp(s.startAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [slots]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6">
      <main className="space-y-4">
        <h2 className="text-xl font-semibold">Clases disponibles</h2>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}

        <Card>
          <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg tracking-tight">Calendario</CardTitle>

              <div className="flex items-center gap-2">
                <Button onClick={() => setMonthAnchor(new Date())}>Hoy</Button>
                <Button
                    className="h-8 w-8"
                    aria-label="Mes anterior"
                    onClick={() =>
                      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))
                    }
                  >
                    ◀
                  </Button>
    
                  <div className="w-40 text-center font-medium capitalize text-sm sm:text-base select-none">
                    {monthName}
                  </div>
    
                  <Button
                    className="h-8 w-8"
                    aria-label="Mes siguiente"
                    onClick={() =>
                      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))
                    }
                  >
                    ▶
                  </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            {/* Cabecera de días */}
            
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-7 text-sm font-medium text-gray-500 mb-3">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="px-2">{d}</div>
              ))}
            </div>

            {/* Rejilla del calendario */}
            <div className="grid grid-cols-7 gap-3">
              {weeks.flat().map((day, idx) => {
                const isCurrMonth = day.getMonth() === monthAnchor.getMonth();
                const key = formatYmdLocal(day);
                const daySlots = (slotsByDay.get(key) || []).filter(
                  s => new Date(s.startAt).getMonth() === monthAnchor.getMonth()
                );

                return (
                  <div
                    key={idx}
                    className={`rounded-lg xl:rounded-xl border p-2 xl:p-3 flex flex-col gap-2
                      ${isCurrMonth ? "bg-white" : "bg-gray-50/80"} min-h-40 xl:min-h-56`}
                  >
                    {/* Cabecera del día */}
                    <div className="text-xs sm:text-sm font-semibold flex justify-between items-center">
                      <span>{day.getDate()}</span>
                    </div>

                    {/* Slots del día */}
                    <div className="flex flex-col gap-2">
                      {daySlots.map((s) => {
                        const full = (s.reservedCount ?? 0) >= s.capacity;
                        const past = isPast(s.startAt);
                        const disabled = full || past;

                        return (
                          <div key={s.id} className="rounded-lg border p-2">
                            <div className="text-sm font-medium leading-tight">
                              {fmtRange(s.startAt, s.endAt)}
                            </div>
                            {s.name && <div className="text-xs text-gray-600 truncate">{s.name}</div>}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge color={full ? "red" : "green"}>
                                {(s.reservedCount ?? 0)}/{s.capacity} {full ? "Completo" : "Plazas"}
                              </Badge>
                              <Button
                                onClick={() => reservar(s.id)}
                                disabled={disabled}
                                loading={loadingId === s.id}
                              >
                                {full ? "Completo" : past ? "Finalizado" : "Apuntarme"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {!daySlots.length && (
                        <div className="text-xs text-gray-400">Sin slots</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
