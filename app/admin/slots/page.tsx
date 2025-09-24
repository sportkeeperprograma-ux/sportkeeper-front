"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";
import { fmtRange } from "../../../lib/format";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  capacity: number;
  reservedCount?: number;
  name: string;
  description: string;
};

const toIsoSeconds = (v:string)=> (v && v.length===16 ? v+":00" : v);

export default function AdminSlots(){
  const [slots,setSlots] = useState<Slot[]>([]);
  const [startAt,setStart] = useState("");
  const [endAt,setEnd] = useState("");
  const [capacity,setCap] = useState(30);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [msg,setMsg] = useState("");
  const [loading,setLoading] = useState(false);

  useEffect(()=>{ (async()=> setSlots(await apiGet("/api/slots")))(); },[]);

  const createSlot = async() => {
    try {
      setLoading(true);
      await apiPost("/api/admin/slots", {
        startAt: toIsoSeconds(startAt),
        endAt: toIsoSeconds(endAt),
        capacity,
        name,
        description
      });
      setMsg("Slot creado"); setStart(""); setEnd(""); setCap(30);
      setSlots(await apiGet("/api/slots"));
    } catch(e:any){ setMsg(e.message || "Error"); }
    finally{ setLoading(false); }
  };

  const updateCapacity = async(id:string, cap:number) => {
    try { await apiPut(`/api/admin/slots/${id}`, { capacity: cap }); setSlots(await apiGet("/api/slots")); }
    catch(e:any){ setMsg(e.message || "Error"); }
  };

  const remove = async(id:string) => {
    try { await apiDelete(`/api/admin/slots/${id}`); setSlots(await apiGet("/api/slots")); }
    catch(e:any){ setMsg(e.message || "Error"); }
  };

  return (
    <main className="space-y-4">
      <h2 className="text-xl font-semibold">Admin / Slots</h2>

      <Card>
        <CardHeader><CardTitle>Crear slot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Inicio</label>
              <Input type="datetime-local" value={startAt} onChange={e=>setStart(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Fin</label>
              <Input type="datetime-local" value={endAt} onChange={e=>setEnd(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1">Capacidad</label>
              <Input type="number" value={capacity} onChange={e=>setCap(parseInt(e.target.value||"0"))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs mb-1">Nombre</label>
              <Input value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs mb-1">Descripción</label>
              <Input value={description} onChange={e=>setDescription(e.target.value)} />
            </div>
            <div className="sm:col-span-3 flex items-end">
              <Button onClick={createSlot} loading={loading}>Crear</Button>
            </div>
          </div>
          {msg && <p className="mt-2 text-sm text-gray-600">{msg}</p>}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {slots.map(s=>(
          <Card key={s.id} className="flex items-center justify-between">
            <div>
              <CardTitle>{fmtRange(s.startAt, s.endAt)}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{s.capacity} plazas</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-24"
                defaultValue={s.capacity}
                onBlur={(e)=>updateCapacity(s.id, parseInt(e.target.value || `${s.capacity}`))}
              />
              <Button variant="danger" onClick={()=>remove(s.id)}>Borrar</Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
