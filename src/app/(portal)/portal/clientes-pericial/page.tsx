"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/shared/Header";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, Search, ArrowUpDown, Edit, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Informe { id: string; numero_informe: string; numero_siniestro: string; aseguradora: string; creado_en: string; estado: string; }
interface Cliente { id: string; nombre: string; telefono: string; municipio: string; direccion: string; codigo_postal: string; informes?: Informe[]; }

export default function ClientesPericialPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cliente>>({});
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadClientes(); }, []);

  const loadClientes = async () => {
    setLoading(true);
    try { const res = await fetch("/api/portal/agente-pericial/clientes"); if (res.ok) setClientes(await res.json()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleExpand = async (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    const cliente = clientes.find(c => c.id === id);
    if (cliente && !cliente.informes) {
      try {
        const res = await fetch(`/api/portal/agente-pericial/clientes?cliente_id=${id}`);
        if (res.ok) { const inf = await res.json(); setClientes(prev => prev.map(c => c.id === id ? { ...c, informes: inf } : c)); }
      } catch (e) { console.error(e); }
    }
  };

  const startEdit = (c: Cliente) => { setEditingId(c.id); setEditForm({ nombre: c.nombre, telefono: c.telefono, municipio: c.municipio, direccion: c.direccion || "", codigo_postal: c.codigo_postal || "" }); };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/portal/agente-pericial/update-estado", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "clientes", id: editingId, updates: editForm }) });
      if (!res.ok) throw new Error((await res.json()).error);
      setClientes(prev => prev.map(c => c.id === editingId ? { ...c, ...editForm } : c));
      setEditingId(null);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const handleSort = (col: string) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };

  const filtered = clientes.filter(c => {
    const s = search.toLowerCase();
    return !s || c.nombre?.toLowerCase().includes(s) || c.telefono?.includes(s) || c.municipio?.toLowerCase().includes(s) || c.codigo_postal?.includes(s);
  }).sort((a, b) => {
    const va = (a as any)[sortCol] || "";
    const vb = (b as any)[sortCol] || "";
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => handleSort(col)} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[var(--foreground)] select-none">
      <span className="flex items-center gap-1">{label}<ArrowUpDown className={cn("w-3 h-3", sortCol === col ? "text-brand-purple" : "opacity-30")} /></span>
    </th>
  );

  if (loading) return (<><Header title="Clientes Pericial" subtitle="" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div></>);

  return (
    <><Header title="Clientes Pericial" subtitle={`${filtered.length} clientes`} />
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" /><input className="input-field pl-9 w-full" placeholder="Buscar por nombre, teléfono, municipio..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <button onClick={loadClientes} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <th className="w-8"></th>
              <SortHeader col="nombre" label="Nombre" />
              <SortHeader col="telefono" label="Teléfono" />
              <SortHeader col="municipio" label="Municipio" />
              <SortHeader col="codigo_postal" label="C.P." />
              <th className="w-10"></th>
            </tr></thead>
            <tbody>{filtered.map(c => (<>
              <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                <td className="px-2"><button onClick={() => toggleExpand(c.id)} className="p-1">{expanded[c.id] ? <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />}</button></td>
                {editingId === c.id ? (<>
                  <td className="px-4 py-2"><input className="input-field text-sm py-1" value={editForm.nombre || ""} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="input-field text-sm py-1" value={editForm.telefono || ""} onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="input-field text-sm py-1" value={editForm.municipio || ""} onChange={e => setEditForm(p => ({ ...p, municipio: e.target.value }))} /></td>
                  <td className="px-4 py-2"><input className="input-field text-sm py-1" value={editForm.codigo_postal || ""} onChange={e => setEditForm(p => ({ ...p, codigo_postal: e.target.value }))} /></td>
                  <td className="px-2 flex gap-1 py-2"><button onClick={saveEdit} disabled={saving} className="p-1 text-success"><Save className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} className="p-1 text-danger"><X className="w-4 h-4" /></button></td>
                </>) : (<>
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{c.telefono}</td>
                  <td className="px-4 py-3">{c.municipio}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{c.codigo_postal}</td>
                  <td className="px-2"><button onClick={() => startEdit(c)} className="p-1 text-[var(--muted-foreground)] hover:text-brand-purple"><Edit className="w-4 h-4" /></button></td>
                </>)}
              </tr>
              {expanded[c.id] && (
                <tr key={`${c.id}-inf`}><td colSpan={6} className="bg-[var(--muted)]/20 px-8 py-3">
                  {!c.informes ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-brand-purple" /></div> :
                   c.informes.length === 0 ? <p className="text-xs text-[var(--muted-foreground)]">Sin informes</p> :
                   <table className="w-full text-xs">
                     <thead><tr className="text-[var(--muted-foreground)]"><th className="text-left py-1 px-2">Nº Informe</th><th className="text-left py-1 px-2">Nº Siniestro</th><th className="text-left py-1 px-2">Aseguradora</th><th className="text-left py-1 px-2">Fecha</th><th className="text-left py-1 px-2">Estado</th></tr></thead>
                     <tbody>{c.informes.map(inf => (
                       <tr key={inf.id} className="border-t border-[var(--border)]/50">
                         <td className="py-1.5 px-2 font-mono font-semibold text-brand-purple">{inf.numero_informe}</td>
                         <td className="py-1.5 px-2">{inf.numero_siniestro || "—"}</td>
                         <td className="py-1.5 px-2">{inf.aseguradora}</td>
                         <td className="py-1.5 px-2 text-[var(--muted-foreground)]">{new Date(inf.creado_en).toLocaleDateString("es-ES")}</td>
                         <td className="py-1.5 px-2"><span className="text-xs px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">{inf.estado}</span></td>
                       </tr>
                     ))}</tbody>
                   </table>}
                </td></tr>
              )}
            </>))}</tbody>
          </table>
        </div>
      </div>
    </div></>
  );
}
