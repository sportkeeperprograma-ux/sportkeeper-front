"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "../../../../lib/api";
import Button from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";

type AttendeesResponse = {
  slotId: string;
  studentIds: string[];
};

export default function AttendeesPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const router = useRouter();

  const [data, setData] = useState<AttendeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiGet(`/api/teacher/slots/${slotId}/attendees`);
      setData(res as AttendeesResponse);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando asistentes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (slotId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Asistentes del slot</h1>
        <div className="flex gap-2">
          <Button onClick={() => router.back()}>Volver</Button>
          <Button onClick={load}>Refrescar</Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="text-sm text-gray-600">Slot ID: {slotId}</div>

        {loading && <p>Cargando…</p>}
        {err && <p className="text-red-600">{err}</p>}

        {!loading && !err && (
          <>
            {data?.studentIds?.length ? (
              <ul className="list-disc pl-6">
                {data!.studentIds.map((id) => (
                  <li key={id} className="text-sm">
                    {id}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-600">Sin inscripciones.</div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
