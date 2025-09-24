import { API_URL } from "./config";

async function safeMsg(r: Response){
  try { const j = await r.json() as any; return j.message || r.statusText; }
  catch { return r.statusText; }
}

export async function apiGet(path: string){
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const r = await fetch(`${API_URL}${path}`, {
    headers: token ? { "Authorization":"Bearer " + token } : undefined
  });
  if(!r.ok) throw new Error(await safeMsg(r));
  return r.json();
}

export async function apiPost(path: string, body: any){
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const r = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      ...(token ? { "Authorization":"Bearer " + token } : {})
    },
    body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error(await safeMsg(r));
  return r.json();
}

export async function apiPut(path: string, body: any){
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const r = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type":"application/json",
      ...(token ? { "Authorization":"Bearer " + token } : {})
    },
    body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error(await safeMsg(r));
  return r.json();
}

export async function apiDelete(path: string){
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const r = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: token ? { "Authorization":"Bearer " + token } : undefined
  });
  if(!r.ok) throw new Error(await safeMsg(r));
}
