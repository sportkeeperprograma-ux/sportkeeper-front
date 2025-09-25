"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";
import ProgressNoteCard, { ProgressNote } from "../../../components/ProgressNoteCard";

export default function MyNotesPage() {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet("/api/student/me/notes");
        if (!mounted) return;
        setNotes(res as ProgressNote[]);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Error cargando notas");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Mis notas</h1>

      {loading && <p>Cargando…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {!loading && !err && (
        <div className="grid gap-3">
          {notes.map((n) => <ProgressNoteCard key={n.id} note={n} />)}
          {notes.length === 0 && (
            <div className="text-sm text-gray-600">Aún no tienes notas.</div>
          )}
        </div>
      )}
    </div>
  );
}
