"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/shared/Header";
import { Loader2, RefreshCw, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ESTADOS_INFORME = ["PENDIENTE_ENVIO", "MENSAJE_ENVIADO", "2DO_INTENTO", "3ER_INTENTO", "CITA_CONFIRMADA", "CITA_NO_CONFIRMADA", "IMPOSIBLE_CONTACTAR_WHATSAPP", "PENDIENTE_FRANCISCO", "RENEGOCIANDO"];
const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE_ENVIO: "bg-warning/10 text-warning", MENSAJE_ENVIADO: "bg-brand-cyan/10 text-brand-cyan",
  "2DO_INTENTO": "bg-warning/10 text-warning", "3ER_INTENTO": "bg-danger/10 text-danger",
  CITA_CONFIRMADA: "bg-success/10 text-success", CITA_NO_CONFIRMADA: "bg-warning/10 text-warning",
  IMPOSIBLE_CONTACTAR_WHATSAPP: "bg-danger/10 text-danger", PENDIENTE_FRANCISCO: "bg-danger/10 text-danger",
  RENEGOCIANDO: "bg-brand-purple/10 text-brand-purple",
};

interface Informe { id: string; numero_informe: string; aseguradora: string; municipio_siniestro: string; numero_siniestro: string; estado: string; creado_en: string; clientes?: { nombre: string }; }

export default function InformesPericialPage() {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("numero_informe");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadInformes(); }, []);

  const loadInformes = async () => {
    setLoading(true);
    try { const res = await fetch("/api/portal/agente-pericial/informes"); if (res.ok) setInformes(await res.json()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateEstado = async (id: string, estado: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/portal/agente-pericial/update-estado", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "informes_periciales", id, updates: { estado } }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setInformes(prev => prev.map(inf => inf.id === id ? { ...inf, estado } : inf));
    } catch (e: any) { alert(e.message); } finally { setUpdatingId(null); }
  };

  const handleSort = (col: string) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };

  const filtered = informes.filter(inf => {
    const s = search.toLowerCase();
    return !s || inf.numero_informe?.toLowerCase().includes(s) || inf.clientes?.nombre?.toLowerCase().includes(s) || inf.aseguradora?.toLowerCase().includes(s) || inf.municipio_siniestro?.toLowerCase().includes(s) || inf.numero_siniestro?.toLowerCase().includes(s) || inf.estado?.toLowerCase().includes(s);
  }).sort((a, b) => {
    let va = "", vb = "";
    if (sortCol === "asegurado") { va = a.clientes?.nombre || ""; vb = b.clientes?.nombre || ""; }
    else { va = (a as any)[sortCol] || ""; vb = (b as any)[sortCol] || ""; }
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => handleSort(col)} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[var(--foreground)] select-none">
      <span className="flex items-center gap-1">{label}<ArrowUpDown className={cn("w-3 h-3", sortCol === col ? "text-brand-purple" : "opacity-30")} /></span>
    </th>
  );

  if (loading) return (<><Header title="Informes Pericial" subtitle="" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div></>);

  return (
    <><Header title="Informes Pericial" subtitle={`${filtered.length} informes`} />
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" /><input className="input-field pl-9 w-full" placeholder="Buscar por informe, asegurado, aseguradora..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button onClick={loadInformes} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <SortHeader col="numero_informe" label="Nº Informe" />
              <SortHeader col="asegurado" label="Asegurado" />
              <SortHeader col="aseguradora" label="Aseguradora" />
              <SortHeader col="municipio_siniestro" label="Municipio" />
              <SortHeader col="numero_siniestro" label="Nº Siniestro" />
              <SortHeader col="creado_en" label="Fecha" />
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Estado</th>
            </tr></thead>
            <tbody>{filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">No hay informes</td></tr>
            ) : filtered.map(inf => (
              <tr key={inf.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-purple whitespace-nowrap">{inf.numero_informe}</td>
                <td className="px-4 py-3">{inf.clientes?.nombre || "—"}</td>
                <td className="px-4 py-3">{inf.aseguradora}</td>
                <td className="px-4 py-3">{inf.municipio_siniestro}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)]">{inf.numero_siniestro || "—"}</td>
                <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs whitespace-nowrap">{new Date(inf.creado_en).toLocaleDateString("es-ES")}</td>
                <td className="px-4 py-3">
                  <select value={inf.estado} onChange={e => updateEstado(inf.id, e.target.value)} disabled={updatingId === inf.id}
                    className={cn("text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer", ESTADO_COLORS[inf.estado] || "bg-[var(--muted)]", updatingId === inf.id && "opacity-50")}>
                    {ESTADOS_INFORME.map(e => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
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
