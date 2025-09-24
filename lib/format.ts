export function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso); const e = new Date(endIso);
  return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})} → ${e.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}`;
}
