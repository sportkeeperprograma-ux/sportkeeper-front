// utils/datetime.ts
export const parseLocalFromDb = (s: string) => {
  // Acepta "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DDTHH:mm:ss"
  const t = s.replace(" ", "T");
  const [date, time] = t.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss] = (time || "00:00:00").split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, ss ?? 0); // local
};

// tu fmtRange
export function fmtRange(startDb: string, endDb: string) {
  const s = parseLocalFromDb(startDb);
  const e = parseLocalFromDb(endDb);
  const d = s.toLocaleDateString();
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${d} ${s.toLocaleTimeString([], opts)} → ${e.toLocaleTimeString([], opts)}`;
}

// utils/datetime.ts
export const toLocalDbString = (d: Date) => {
  // "YYYY-MM-DDTHH:mm:ss" sin Z (local)
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};
