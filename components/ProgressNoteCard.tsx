"use client";

import { Card } from "./ui/Card";
import Badge from "./ui/Badge";

export type ProgressNote = {
  id: string;
  activityId: string;
  teacherId: string;
  studentId: string;
  createdAt: string; // ISO date
  title?: string | null;
  comment: string;
  visibleToStudent: boolean;
};

export default function ProgressNoteCard({ note }: { note: ProgressNote }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{note.title || "Sin título"}</div>
        <Badge>{new Date(note.createdAt).toLocaleString()}</Badge>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.comment}</p>
      <div className="text-xs text-gray-500">Actividad: {note.activityId}</div>
      {!note.visibleToStudent && (
        <div className="text-xs text-orange-600">No visible para alumno</div>
      )}
    </Card>
  );
}
