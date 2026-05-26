"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/shared/Header";
import { Loader2, RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ESTADOS_CITA = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"];
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-warning/10 text-warning", CONFIRMADA: "bg-success/10 text-success",
  CANCELADA: "bg-danger/10 text-danger", COMPLETADA: "bg-brand-cyan/10 text-brand-cyan",
};

interface Cita {
  id: string; fecha_hora: string; duracion_minutos: number; estado: string;
  direccion: string; municipio: string;
  informes_periciales?: { numero_informe: string; clientes?: { nombre: string } };
  clientes?: { nombre: string };
}

function toMadridTime(isoStr: string): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return isoStr; }
}

export default function CitasPericialPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("fecha_hora");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCitas(); }, []);

  const loadCitas = async () => {
    setLoading(true);
    try { const res = await fetch("/api/portal/agente-pericial/citas"); if (res.ok) setCitas(await res.json()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateEstado = async (id: string, estado: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/portal/agente-pericial/update-estado", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "citas", id, updates: { estado } }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setCitas(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
    } catch (e: any) { alert(e.message); } finally { setUpdatingId(null); }
  };

  const handleSort = (col: string) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };

  const getAsegurado = (c: Cita) => c.informes_periciales?.clientes?.nombre || c.clientes?.nombre || "—";
  const getNumInforme = (c: Cita) => c.informes_periciales?.numero_informe || "—";

  const filtered = citas.filter(c => {
    const s = search.toLowerCase();
    return !s || getNumInforme(c).toLowerCase().includes(s) || getAsegurado(c).toLowerCase().includes(s) || c.municipio?.toLowerCase().includes(s) || c.direccion?.toLowerCase().includes(s) || c.estado?.toLowerCase().includes(s);
  }).sort((a, b) => {
    let va = "", vb = "";
    if (sortCol === "asegurado") { va = getAsegurado(a); vb = getAsegurado(b); }
    else if (sortCol === "numero_informe") { va = getNumInforme(a); vb = getNumInforme(b); }
    else { va = (a as any)[sortCol] || ""; vb = (b as any)[sortCol] || ""; }
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => handleSort(col)} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[var(--foreground)] select-none">
      <span className="flex items-center gap-1">{label}<ArrowUpDown className={cn("w-3 h-3", sortCol === col ? "text-brand-purple" : "opacity-30")} /></span>
    </th>
  );

  if (loading) return (<><Header title="Citas Pericial" subtitle="" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div></>);

  return (
    <><Header title="Citas Pericial" subtitle={`${filtered.length} citas`} />
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" /><input className="input-field pl-9 w-full" placeholder="Buscar por informe, asegurado, municipio..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button onClick={loadCitas} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <SortHeader col="numero_informe" label="Nº Informe" />
              <SortHeader col="asegurado" label="Asegurado" />
              <SortHeader col="municipio" label="Municipio" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Dirección</th>
              <SortHeader col="fecha_hora" label="Fecha/Hora (Madrid)" />
              <SortHeader col="duracion_minutos" label="Duración" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Estado</th>
            </tr></thead>
            <tbody>{filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">No hay citas</td></tr>
            ) : filtered.map(cita => (
              <tr key={cita.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-purple whitespace-nowrap">{getNumInforme(cita)}</td>
                <td className="px-4 py-3">{getAsegurado(cita)}</td>
                <td className="px-4 py-3">{cita.municipio || "—"}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs max-w-[200px] truncate">{cita.direccion || "—"}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{toMadridTime(cita.fecha_hora)}</td>
                <td className="px-4 py-3 text-center">{cita.duracion_minutos ? `${cita.duracion_minutos} min` : "—"}</td>
                <td className="px-4 py-3">
                  <select value={cita.estado} onChange={e => updateEstado(cita.id, e.target.value)} disabled={updatingId === cita.id}
                    className={cn("text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer", ESTADO_COLORS[cita.estado] || "bg-[var(--muted)]", updatingId === cita.id && "opacity-50")}>
                    {ESTADOS_CITA.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div></>
  );
}
