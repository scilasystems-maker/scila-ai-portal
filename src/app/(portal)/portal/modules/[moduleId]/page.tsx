"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { RecordModal } from "@/components/portal/RecordModal";
import { KanbanBoard } from "@/components/portal/KanbanBoard";
import { CalendarView } from "@/components/portal/CalendarView";
import {
  Search, Loader2, ChevronLeft, ChevronRight, Trash2,
  Plus, X, Eye, AlertCircle, RefreshCw, Table2, Kanban,
  CalendarDays, Edit, Download, ExternalLink, EyeOff,
  Instagram, Mail, Facebook, Linkedin, Phone, Globe,
  MessageCircle, Building2
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface ModuleData {
  data: any[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  modulo: {
    id: string;
    tipo: string;
    nombre_display: string;
    mapeo_campos: Record<string, string>;
    config_visual: { tipo_vista: string };
    permite_crear: boolean;
    permite_editar: boolean;
    permite_eliminar: boolean;
  };
}

type ViewMode = "tabla" | "kanban" | "calendario";

const DEFAULT_STATUSES: Record<string, string[]> = {
  leads: ["nuevo", "contactado", "cualificado", "ganado", "perdido"],
  citas: ["pendiente", "confirmada", "completada", "cancelada", "no-show"],
};

// ─── Webs helpers ─────────────────────────────────────────────────────────────

function WebsStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const cfg: Record<string, { label: string; cls: string }> = {
    activa:    { label: "Activa",    cls: "bg-success/10 text-success border-success/20" },
    cancelada: { label: "Cancelada", cls: "bg-danger/10 text-danger border-danger/20" },
    prueba:    { label: "Prueba",    cls: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
    expirada:  { label: "Expirada", cls: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" },
  };
  const c = cfg[s] ?? { label: status || "—", cls: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", c.cls)}>{c.label}</span>
  );
}

function PasswordCell({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-[var(--muted-foreground)]">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sm font-mono">{show ? value : "••••••••"}</span>
      <button
        onClick={e => { e.stopPropagation(); setShow(v => !v); }}
        className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        title={show ? "Ocultar" : "Mostrar"}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

function FaviconUrl({ url, label }: { url: string; label?: string }) {
  if (!url) return <span className="text-[var(--muted-foreground)]">—</span>;
  let domain = "";
  try { domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { domain = url; }
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  return (
    <a
      href={url.startsWith("http") ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="flex items-center gap-2 text-brand-cyan hover:underline group"
    >
      <img src={faviconUrl} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <span className="text-sm truncate max-w-[180px]">{label || domain}</span>
      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </a>
  );
}

function PriceCell({ value }: { value: any }) {
  const num = parseFloat(String(value));
  if (isNaN(num)) return <span className="text-[var(--muted-foreground)]">—</span>;
  return <span className="text-sm font-medium">{num.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</span>;
}

// ─── Empresas helpers ─────────────────────────────────────────────────────────

const MEDIO_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  instagram:  { icon: Instagram,     color: "text-pink-400",      label: "Instagram" },
  email:      { icon: Mail,          color: "text-brand-cyan",    label: "Email" },
  facebook:   { icon: Facebook,      color: "text-blue-500",      label: "Facebook" },
  linkedin:   { icon: Linkedin,      color: "text-blue-400",      label: "LinkedIn" },
  whatsapp:   { icon: MessageCircle, color: "text-success",       label: "WhatsApp" },
  telefono:   { icon: Phone,         color: "text-brand-purple",  label: "Teléfono" },
  "teléfono": { icon: Phone,         color: "text-brand-purple",  label: "Teléfono" },
  web:        { icon: Globe,         color: "text-blue-300",      label: "Web" },
};

function MedioContactoBadge({ medio }: { medio: string }) {
  if (!medio) return <span className="text-[var(--muted-foreground)]">—</span>;
  const key = medio.toLowerCase();
  const cfg = MEDIO_CONFIG[key];
  const Icon = cfg?.icon ?? Building2;
  const color = cfg?.color ?? "text-[var(--muted-foreground)]";
  return (
    <span className={cn("flex items-center gap-1.5 text-sm font-medium", color)}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {cfg?.label ?? medio}
    </span>
  );
}

function EmpresasStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  const cfg: Record<string, { label: string; cls: string }> = {
    "contactado":        { label: "Contactado",        cls: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
    "contestado":        { label: "Contestado",        cls: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20" },
    "interesado":        { label: "Interesado",        cls: "bg-brand-purple/10 text-brand-purple border-brand-purple/20" },
    "venta cerrada":     { label: "Venta cerrada",     cls: "bg-success/10 text-success border-success/20" },
    "rechazado":         { label: "Rechazado",         cls: "bg-danger/10 text-danger border-danger/20" },
    "cliente potencial": { label: "Cliente potencial", cls: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  };
  const c = cfg[s] ?? { label: status || "—", cls: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", c.cls)}>{c.label}</span>
  );
}

function FechaSeguimientoCell({ value }: { value: string }) {
  if (!value) return <span className="text-[var(--muted-foreground)]">—</span>;
  const fecha = new Date(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isPastOrToday = fecha <= today;
  return (
    <span className={cn("text-sm font-medium flex items-center gap-1", isPastOrToday ? "text-danger font-semibold" : "")}>
      {isPastOrToday && <span>⚠️</span>}
      {formatDate(value)}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as string;

  const [data, setData] = useState<ModuleData | null>(null);
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tabla");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [filterEstado, setFilterEstado] = useState("");
  const [filterMedio, setFilterMedio] = useState("");

  const fetchData = useCallback(async (fetchAll = false) => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({
        module_id: moduleId,
        page: fetchAll ? "1" : page.toString(),
        limit: fetchAll ? "500" : "25",
      });
      if (search && !fetchAll) p.set("search", search);

      const res = await fetch(`/api/portal/data?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (fetchAll) {
        setAllData(json.data || []);
      } else {
        setData(json);
      }

      if (!data && json.modulo) {
        if (json.modulo.tipo === "citas" && json.modulo.mapeo_campos?.fecha) {
          setViewMode("calendario");
        } else if (json.modulo.tipo === "leads" && json.modulo.mapeo_campos?.estado) {
          setViewMode("kanban");
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [moduleId, page, search]);

  useEffect(() => {
    fetchData();
    fetchData(true);
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    setDeleting(recordId);
    try {
      const res = await fetch(`/api/portal/data?module_id=${moduleId}&record_id=${recordId}`, { method: "DELETE" });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
      fetchData();
      fetchData(true);
      setSelectedRow(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleSave = async (record: Record<string, any>) => {
    if (editingRecord) {
      const res = await fetch("/api/portal/data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, record_id: editingRecord.id, updates: record }),
      });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
    } else {
      const res = await fetch("/api/portal/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, record: record }),
      });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
    }
    setEditingRecord(null);
    fetchData();
    fetchData(true);
  };

  const openCreate = () => { setEditingRecord(null); setModalOpen(true); };
  const openEdit = (row: any) => { setEditingRecord(row); setModalOpen(true); };

  const getDisplayColumns = () => {
    if (!data?.modulo.mapeo_campos) return [];
    return Object.entries(data.modulo.mapeo_campos)
      .filter(([_, realCol]) => realCol)
      .map(([displayName, realCol]) => ({
        key: realCol,
        label: displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/_/g, " "),
        displayName,
      }));
  };

  const getFormColumns = () => {
    if (!data?.modulo.mapeo_campos) return [];
    return Object.entries(data.modulo.mapeo_campos)
      .filter(([_, realCol]) => realCol)
      .filter(([key]) => !["created_at", "fecha_registro", "fecha_creacion", "id"].includes(key))
      .map(([displayName, realCol]) => {
        const label = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/_/g, " ");
        let type = "text";
        if (displayName.includes("fecha")) type = "date";
        if (displayName.includes("hora") || displayName.includes("time")) type = "time";
        if (displayName.includes("email")) type = "email";
        if (displayName.includes("telefono") || displayName.includes("phone")) type = "tel";
        if (displayName.includes("notas") || displayName.includes("mensaje")) type = "textarea";
        if (displayName === "password") type = "password";
        return { key: realCol, label, type };
      });
  };

  const formatCell = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try { return formatDate(value); } catch { return value; }
    }
    if (typeof value === "string" && value.length > 60) return value.slice(0, 60) + "...";
    return String(value);
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (["activo", "activa", "confirmada", "completada", "ganado", "pagado", "venta cerrada"].includes(s)) return "bg-success/10 text-success";
    if (["cancelada", "cancelado", "perdido", "vencido", "no-show", "rechazado", "expirada"].includes(s)) return "bg-danger/10 text-danger";
    if (["pendiente", "nuevo", "trial", "prueba", "contactado"].includes(s)) return "bg-warning/10 text-warning";
    if (["contactado", "cualificado", "contestado", "interesado", "cliente potencial"].includes(s)) return "bg-brand-cyan/10 text-brand-cyan";
    return "bg-[var(--muted)] text-[var(--muted-foreground)]";
  };

  const getMedioIcon = (medio: string) => {
    const m = medio?.toLowerCase() || "";
    if (m.includes("instagram")) return { emoji: "📸", color: "text-pink-500" };
    if (m.includes("email") || m.includes("correo")) return { emoji: "📧", color: "text-brand-cyan" };
    if (m.includes("facebook")) return { emoji: "📘", color: "text-blue-500" };
    if (m.includes("linkedin")) return { emoji: "💼", color: "text-blue-600" };
    if (m.includes("whatsapp")) return { emoji: "💬", color: "text-success" };
    if (m.includes("tel")) return { emoji: "📞", color: "text-brand-purple" };
    return { emoji: "📋", color: "text-[var(--muted-foreground)]" };
  };

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const renderCustomCell = (row: any, col: { key: string; label: string }, tipo: string) => {
    const value = row[col.key];
    const isStatus = col.label.toLowerCase().includes("estado");
    const campos = modulo?.mapeo_campos || {};

    // ── WEBS module custom rendering ──
    if (tipo === "webs") {
      // URL with favicon
      if (col.key === campos.url || col.key === "url") {
        const url = value || "";
        let domain = "";
        try { domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { domain = url; }
        return (
          <div className="flex items-center gap-2">
            {domain && <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-5 h-5 rounded" onError={(e: any) => e.target.style.display = "none"} />}
            <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener" className="text-brand-purple hover:underline text-sm truncate max-w-[200px]" onClick={e => e.stopPropagation()}>
              {domain || url || "—"}
            </a>
          </div>
        );
      }
      // Password hidden
      if (col.key === campos.password || col.key === "password") {
        const rowId = row.id || "";
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm font-mono">{showPasswords[rowId] ? (value || "—") : value ? "••••••" : "—"}</span>
            {value && (
              <button onClick={e => { e.stopPropagation(); setShowPasswords(p => ({ ...p, [rowId]: !p[rowId] })); }} className="text-[10px] text-brand-purple hover:underline ml-1">
                {showPasswords[rowId] ? "ocultar" : "ver"}
              </button>
            )}
          </div>
        );
      }
      // Precio
      if (col.key === campos.precio || col.key === "precio") {
        return <span className="text-sm font-semibold">{value ? `${value}€` : "—"}</span>;
      }
      // Estado
      if (isStatus) {
        return <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(value))}>{value || "—"}</span>;
      }
    }

    // ── EMPRESAS module custom rendering ──
    if (tipo === "empresas") {
      // Medio de contacto with icon
      if (col.key === campos.medio_contacto || col.key === "medio_contacto") {
        const { emoji } = getMedioIcon(value);
        return (
          <span className="flex items-center gap-1.5 text-sm">
            <span>{emoji}</span>
            <span>{value || "—"}</span>
          </span>
        );
      }
      // Estado with colors
      if (isStatus) {
        return <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(value))}>{value || "—"}</span>;
      }
      // Web empresa with favicon
      if (col.key === campos.web_empresa || col.key === "web_empresa") {
        const url = value || "";
        let domain = "";
        try { domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { domain = url; }
        if (!url) return <span className="text-sm">—</span>;
        return (
          <div className="flex items-center gap-2">
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" className="w-4 h-4 rounded" onError={(e: any) => e.target.style.display = "none"} />
            <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener" className="text-brand-purple hover:underline text-sm" onClick={e => e.stopPropagation()}>
              {domain || "—"}
            </a>
          </div>
        );
      }
      // Fecha seguimiento with alert
      if (col.key === campos.fecha_seguimiento || col.key === "fecha_seguimiento") {
        if (!value) return <span className="text-sm">—</span>;
        const today = new Date().toISOString().split("T")[0];
        const isPast = value < today;
        const isToday = value === today;
        return (
          <span className={cn("text-sm", isPast && "text-danger font-semibold", isToday && "text-warning font-semibold")}>
            {formatDate(value)} {isPast && "⚠️"} {isToday && "📌"}
          </span>
        );
      }
      // Mensaje enviado truncated
      if (col.key === campos.mensaje_enviado || col.key === "mensaje_enviado") {
        return <span className="text-sm text-[var(--muted-foreground)]" title={value}>{value ? (value.length > 40 ? value.slice(0, 40) + "..." : value) : "—"}</span>;
      }
    }

    // ── Default rendering ──
    if (isStatus) {
      return <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(value))}>{value || "—"}</span>;
    }
    return <span className="text-sm">{formatCell(value)}</span>;
  };

  const columns = getDisplayColumns();
  const modulo = data?.modulo;
  const tipo = modulo?.tipo;
  const mapeo = modulo?.mapeo_campos ?? {};

  const availableViews: ViewMode[] = ["tabla"];
  if (mapeo?.estado && tipo !== "webs" && tipo !== "empresas") availableViews.push("kanban");
  if (mapeo?.fecha || tipo === "citas") availableViews.push("calendario");

  const empresasData = (data?.data ?? []).filter(row => {
    if (filterEstado && (mapeo.estado ? row[mapeo.estado] : "")?.toLowerCase() !== filterEstado.toLowerCase()) return false;
    if (filterMedio && (mapeo.medio_contacto ? row[mapeo.medio_contacto] : "")?.toLowerCase() !== filterMedio.toLowerCase()) return false;
    return true;
  });

  const displayData = tipo === "empresas" ? empresasData : (data?.data ?? []);

  const actionButtons = (row: any) => (
    <div className="flex items-center justify-end gap-1">
      {modulo?.permite_editar && (
        <button onClick={e => { e.stopPropagation(); openEdit(row); }}
          className="p-1.5 rounded hover:bg-brand-cyan/10 text-[var(--muted-foreground)] hover:text-brand-cyan transition-colors" title="Editar">
          <Edit className="w-4 h-4" />
        </button>
      )}
      {modulo?.permite_eliminar && (
        <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
          disabled={deleting === row.id}
          className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger transition-colors" title="Eliminar">
          {deleting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  const paginationBar = () => data && data.total_pages > 1 ? (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-[var(--muted-foreground)]">
        {((page - 1) * data.limit) + 1}-{Math.min(page * data.limit, data.total)} de {data.total}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-medium">{page} / {data.total_pages}</span>
        <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages} className="btn-ghost p-2 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Header
        title={modulo?.nombre_display || "Cargando..."}
        subtitle={data ? `${data.total} registros` : ""}
      />

      <div className="p-4 lg:p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input type="text" placeholder="Buscar..." className="input-field pl-9 pr-16" value={searchInput}
              onChange={e => setSearchInput(e.target.value)} />
            {searchInput && (
              <button type="button"
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                <X className="w-4 h-4" />
              </button>
            )}
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1 text-xs">Buscar</button>
          </form>

          {/* Empresas filters */}
          {tipo === "empresas" && (
            <>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-field text-sm max-w-[160px]">
                <option value="">Todos los estados</option>
                {["Contactado", "Contestado", "Interesado", "Venta cerrada", "Rechazado", "Cliente potencial"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={filterMedio} onChange={e => setFilterMedio(e.target.value)} className="input-field text-sm max-w-[160px]">
                <option value="">Todos los medios</option>
                {["Instagram", "Email", "Facebook", "LinkedIn", "WhatsApp", "Teléfono", "Web"].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </>
          )}

          {availableViews.length > 1 && (
            <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
              {availableViews.map(v => {
                const Icon = v === "tabla" ? Table2 : v === "kanban" ? Kanban : CalendarDays;
                return (
                  <button key={v} onClick={() => setViewMode(v)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                      viewMode === v ? "bg-brand-purple/10 text-brand-purple" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                    )}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline capitalize">{v}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={() => { fetchData(); fetchData(true); }} className="btn-ghost p-2.5" title="Refrescar">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <a href={`/api/portal/export?module_id=${moduleId}`} download className="btn-ghost p-2.5" title="Exportar CSV">
            <Download className="w-4 h-4" />
          </a>

          {modulo?.permite_crear && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          </div>
        )}

        {/* ══ WEBS TABLE ══ */}
        {data && viewMode === "tabla" && tipo === "webs" && (
          <>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Nombre</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">URL</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Usuario</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Password</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Precio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Estado</th>
                      {mapeo.fecha_renovacion && <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Renovación</th>}
                      {(modulo?.permite_editar || modulo?.permite_eliminar) && <th className="w-24" />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No hay datos todavía</td></tr>
                    ) : data.data.map(row => (
                      <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}>
                        <td className="px-4 py-3 font-medium">{row[mapeo.nombre] || "—"}</td>
                        <td className="px-4 py-3"><FaviconUrl url={row[mapeo.url]} /></td>
                        <td className="px-4 py-3 font-mono text-sm">{row[mapeo.usuario] || "—"}</td>
                        <td className="px-4 py-3"><PasswordCell value={row[mapeo.password]} /></td>
                        <td className="px-4 py-3"><PriceCell value={row[mapeo.precio]} /></td>
                        <td className="px-4 py-3"><WebsStatusBadge status={row[mapeo.estado]} /></td>
                        {mapeo.fecha_renovacion && <td className="px-4 py-3 text-sm">{row[mapeo.fecha_renovacion] ? formatDate(row[mapeo.fecha_renovacion]) : "—"}</td>}
                        {(modulo?.permite_editar || modulo?.permite_eliminar) && <td className="px-4 py-3 text-right">{actionButtons(row)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {paginationBar()}
          </>
        )}

        {/* ══ EMPRESAS TABLE ══ */}
        {data && viewMode === "tabla" && tipo === "empresas" && (
          <>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Empresa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Medio</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Estado</th>
                      {mapeo.telefono && <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Teléfono</th>}
                      {mapeo.email && <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Email</th>}
                      {mapeo.web && <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Web</th>}
                      {mapeo.fecha_seguimiento && <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Seguimiento</th>}
                      {(modulo?.permite_editar || modulo?.permite_eliminar) && <th className="w-24" />}
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No hay resultados</td></tr>
                    ) : displayData.map(row => (
                      <tr key={row.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}>
                        <td className="px-4 py-3 font-medium">{row[mapeo.nombre] || "—"}</td>
                        <td className="px-4 py-3"><MedioContactoBadge medio={row[mapeo.medio_contacto]} /></td>
                        <td className="px-4 py-3"><EmpresasStatusBadge status={row[mapeo.estado]} /></td>
                        {mapeo.telefono && <td className="px-4 py-3 text-sm">{row[mapeo.telefono] || "—"}</td>}
                        {mapeo.email && <td className="px-4 py-3 text-sm">{row[mapeo.email] || "—"}</td>}
                        {mapeo.web && <td className="px-4 py-3"><FaviconUrl url={row[mapeo.web]} /></td>}
                        {mapeo.fecha_seguimiento && <td className="px-4 py-3"><FechaSeguimientoCell value={row[mapeo.fecha_seguimiento]} /></td>}
                        {(modulo?.permite_editar || modulo?.permite_eliminar) && <td className="px-4 py-3 text-right">{actionButtons(row)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {paginationBar()}
          </>
        )}

        {/* ══ GENERIC TABLE VIEW ══ */}
        {data && viewMode === "tabla" && tipo !== "webs" && tipo !== "empresas" && (
          <>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {columns.map(col => (
                        <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                      {(modulo?.permite_editar || modulo?.permite_eliminar) && (
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-28">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="text-center py-12 text-[var(--muted-foreground)]">
                          {search ? "Sin resultados" : "No hay datos todavía"}
                        </td>
                      </tr>
                    ) : data.data.map((row, i) => (
                      <tr key={row.id || i}
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}>
                        {columns.map(col => {
                          return (
                            <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                              {renderCustomCell(row, col, modulo?.tipo || "generico")}
                            </td>
                          );
                        })}
                        {(modulo?.permite_editar || modulo?.permite_eliminar) && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={e => { e.stopPropagation(); setSelectedRow(row); }}
                                className="p-1.5 rounded hover:bg-brand-purple/10 text-[var(--muted-foreground)] hover:text-brand-purple transition-colors" title="Ver">
                                <Eye className="w-4 h-4" />
                              </button>
                              {modulo?.permite_editar && (
                                <button onClick={e => { e.stopPropagation(); openEdit(row); }}
                                  className="p-1.5 rounded hover:bg-brand-cyan/10 text-[var(--muted-foreground)] hover:text-brand-cyan transition-colors" title="Editar">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {modulo?.permite_eliminar && (
                                <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
                                  disabled={deleting === row.id}
                                  className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger transition-colors" title="Eliminar">
                                  {deleting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {paginationBar()}
          </>
        )}

        {/* ══ KANBAN VIEW ══ */}
        {data && viewMode === "kanban" && modulo?.mapeo_campos?.estado && (
          <KanbanBoard
            data={allData}
            statusField={modulo.mapeo_campos.estado}
            nameField={modulo.mapeo_campos.nombre || modulo.mapeo_campos.nombre_paciente || Object.values(modulo.mapeo_campos)[0]}
            dateField={modulo.mapeo_campos.fecha || modulo.mapeo_campos.created_at}
            phoneField={modulo.mapeo_campos.telefono}
            emailField={modulo.mapeo_campos.email}
            columns={DEFAULT_STATUSES[modulo.tipo] || ["pendiente", "en proceso", "completado"]}
            onRowClick={setSelectedRow}
            onEdit={modulo.permite_editar ? openEdit : undefined}
            onDelete={modulo.permite_eliminar ? handleDelete : undefined}
            canEdit={modulo.permite_editar}
            canDelete={modulo.permite_eliminar}
          />
        )}

        {/* ══ CALENDAR VIEW ══ */}
        {data && viewMode === "calendario" && (modulo?.mapeo_campos?.fecha || modulo?.tipo === "citas") && (
          <div className="card">
            <CalendarView
              data={allData}
              dateField={modulo!.mapeo_campos.fecha || "fecha_cita"}
              timeField={modulo!.mapeo_campos.hora}
              nameField={modulo!.mapeo_campos.nombre || modulo!.mapeo_campos.nombre_paciente || "nombre"}
              statusField={modulo!.mapeo_campos.estado}
              onEventClick={setSelectedRow}
            />
          </div>
        )}

        {/* Detail Drawer */}
        {selectedRow && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedRow(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] z-50 overflow-y-auto animate-slide-in-left">
              <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold">Detalle</h3>
                <div className="flex items-center gap-2">
                  {modulo?.permite_editar && (
                    <button onClick={() => { openEdit(selectedRow); setSelectedRow(null); }} className="btn-ghost p-2 text-brand-cyan">
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setSelectedRow(null)} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {Object.entries(selectedRow).map(([key, value]) => {
                  const isPassword = key.toLowerCase().includes("password") || key.toLowerCase().includes("contrasena");
                  const isUrl = (key.toLowerCase().includes("url") || key.toLowerCase() === "web") && typeof value === "string";
                  return (
                    <div key={key}>
                      <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                        {key.replace(/_/g, " ")}
                      </label>
                      <div className="mt-1 text-sm bg-[var(--muted)] rounded-lg p-3 break-all">
                        {isPassword && value ? (
                          <PasswordCell value={String(value)} />
                        ) : isUrl && value ? (
                          <FaviconUrl url={String(value)} label={String(value)} />
                        ) : value === null || value === undefined ? (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        ) : typeof value === "object" ? (
                          <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                        ) : String(value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Create/Edit Modal */}
        <RecordModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingRecord(null); }}
          onSave={handleSave}
          columns={getFormColumns()}
          initialData={editingRecord}
          title={editingRecord ? `Editar ${modulo?.nombre_display || "registro"}` : `Nuevo ${modulo?.nombre_display || "registro"}`}
        />
      </div>
    </>
  );
}
