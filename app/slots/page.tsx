"use client";
import { use, useEffect, useState } from "react";
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


export default function SlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
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
      await apiPost("/api/reservations", { timeSlotId: id, email:  user?.email });
      setMsg("¡Reserva creada!");
      await load(); // refresca aforo
    } catch (e: any) {
      setMsg(e.message || "No se pudo reservar");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Clases disponibles</h2>
      {msg && <p className="text-sm text-gray-600">{msg}</p>}

      <div className="space-y-2">
        {slots.map((s) => {
          const full = (s.reservedCount ?? 0) >= s.capacity;
            function fmt(startAt: string, endAt: string): import("react").ReactNode {
            return fmtRange(startAt, endAt);
            }

          return (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <CardTitle>{s.name } {fmt(s.startAt, s.endAt)}</CardTitle>
                <CardContent className="mt-1">
                  {s.description}<br/>
                  <Badge color={full ? "red" : "green"}>
                    {s.reservedCount}/{s.capacity} {full ? "Completo" : "Plazas"}
                  </Badge>
                </CardContent>
              </div>

              <Button
                onClick={() => reservar(s.id)}
                disabled={full}
                loading={loadingId === s.id}
              >
                {full ? "Completo" : "Apuntarme"}
              </Button>
            </Card>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p className="text-sm text-gray-500">No hay clases disponibles.</p>
      )}
    </main>
  );
}
