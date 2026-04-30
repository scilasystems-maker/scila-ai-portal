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
  CalendarDays, Edit, Download, Calendar
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

  const fetchData = useCallback(async (fetchAll = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        module_id: moduleId,
        page: fetchAll ? "1" : page.toString(),
        limit: fetchAll ? "500" : "25",
      });
      if (search && !fetchAll) params.set("search", search);

      const res = await fetch(`/api/portal/data?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (fetchAll) {
        setAllData(json.data || []);
      } else {
        setData(json);
      }

      // Auto-detect best view
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
    fetchData(true); // Also fetch all for kanban/calendar
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
      // Update
      const res = await fetch("/api/portal/data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_id: moduleId, record_id: editingRecord.id, updates: record }),
      });
      if (!res.ok) { const json = await res.json(); throw new Error(json.error); }
    } else {
      // Create
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

  // Get columns for display
  const getDisplayColumns = () => {
    if (!data?.modulo.mapeo_campos) return [];
    return Object.entries(data.modulo.mapeo_campos)
      .filter(([_, realCol]) => realCol)
      .map(([displayName, realCol]) => ({
        key: realCol,
        label: displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/_/g, " "),
      }));
  };

  // Get form columns for the modal
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
  const availableViews: ViewMode[] = ["tabla"];
  if (modulo?.mapeo_campos?.estado) availableViews.push("kanban");
  if (modulo?.mapeo_campos?.fecha || modulo?.tipo === "citas") availableViews.push("calendario");

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

          {/* View toggles */}
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          </div>
        )}

        {/* ══ CITAS CARD VIEW ══ */}
        {data && viewMode === "tabla" && modulo?.tipo === "citas" && (
          <CitasCardView
            data={data.data}
            campos={modulo.mapeo_campos}
            onEdit={openEdit}
            onDelete={handleDelete}
            deleting={deleting}
            permiteEditar={modulo.permite_editar}
            permiteEliminar={modulo.permite_eliminar}
          />
        )}

        {/* ══ TABLE VIEW ══ */}
        {data && viewMode === "tabla" && modulo?.tipo !== "citas" && (
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

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  {((page - 1) * data.limit) + 1}-{Math.min(page * data.limit, data.total)} de {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-2 disabled:opacity-30">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">{page} / {data.total_pages}</span>
                  <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages} className="btn-ghost p-2 disabled:opacity-30">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
                {Object.entries(selectedRow).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      {key.replace(/_/g, " ")}
                    </label>
                    <div className="mt-1 text-sm bg-[var(--muted)] rounded-lg p-3 break-all">
                      {value === null || value === undefined
                        ? <span className="text-[var(--muted-foreground)]">—</span>
                        : typeof value === "object"
                          ? <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                          : String(value)}
                    </div>
                  </div>
                ))}
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

// ══ CITAS CARD VIEW COMPONENT ══
function CitasCardView({ data, campos, onEdit, onDelete, deleting, permiteEditar, permiteEliminar }: {
  data: any[]; campos: Record<string, string>; onEdit: (row: any) => void; onDelete: (id: string) => void;
  deleting: string | null; permiteEditar: boolean; permiteEliminar: boolean;
}) {
  const [citasFilter, setCitasFilter] = useState("todas");

  // Normaliza fechas DD/MM/YYYY → YYYY-MM-DD para comparaciones y Date parsing
  const normalizeDateStr = (val: string): string => {
    if (!val) return "";
    // Ya es YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    // DD/MM/YYYY
    const parts = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
    return val;
  };

  const today = new Date().toISOString().split("T")[0];

  const getCitaDateRaw = (row: any) => row[campos.fecha] || row.fecha_cita || row.fecha || "";
  const getCitaDate = (row: any) => normalizeDateStr(getCitaDateRaw(row));
  const getCitaHora = (row: any) => row[campos.hora] || row.hora_cita || row.hora || "";
  const getCitaNombre = (row: any) => row[campos.nombre_paciente] || row[campos.nombre] || row.paciente_nombre || row.nombre || "";
  const getCitaTipo = (row: any) => row[campos.tipo] || row.tipo_cita || row.tipo || "";
  const getCitaEstado = (row: any) => row[campos.estado] || row.estado || "";
  const getCitaTelefono = (row: any) => row[campos.telefono] || row.paciente_telefono || row.telefono || "";
  const getCitaNotas = (row: any) => row[campos.notas] || row.notas || "";

  const getStatusColor = (s: string) => {
    const sl = s?.toLowerCase();
    if (["completada", "confirmada", "realizada"].includes(sl)) return "bg-success/10 text-success border-success/20";
    if (["cancelada", "no-show"].includes(sl)) return "bg-danger/10 text-danger border-danger/20";
    if (["pendiente"].includes(sl)) return "bg-warning/10 text-warning border-warning/20";
    return "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20";
  };

  const getTimeLabel = (fecha: string) => {
    if (!fecha) return "";
    if (fecha === today) return "Hoy";
    const diff = Math.ceil((new Date(fecha).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 1) return "Mañana";
    if (diff === -1) return "Ayer";
    if (diff > 1 && diff <= 7) return `En ${diff} días`;
    if (diff < -1) return `Hace ${Math.abs(diff)} días`;
    return "";
  };

  // Sort by date and time
  const sorted = [...data].sort((a, b) => {
    const dateA = getCitaDate(a) + " " + getCitaHora(a);
    const dateB = getCitaDate(b) + " " + getCitaHora(b);
    return dateB.localeCompare(dateA);
  });

  // Filter
  const filtered = sorted.filter(row => {
    const fecha = getCitaDate(row);
    if (citasFilter === "hoy") return fecha === today;
    if (citasFilter === "proximas") return fecha > today;
    if (citasFilter === "pasadas") return fecha < today;
    return true;
  });

  const CITAS_FILTERS = [
    { id: "todas", label: "Todas", count: data.length },
    { id: "hoy", label: "Hoy", count: data.filter(r => getCitaDate(r) === today).length },
    { id: "proximas", label: "Próximas", count: data.filter(r => getCitaDate(r) > today).length },
    { id: "pasadas", label: "Pasadas", count: data.filter(r => getCitaDate(r) < today).length },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex border border-[var(--border)] rounded-lg overflow-hidden w-fit">
        {CITAS_FILTERS.map(f => (
          <button key={f.id} onClick={() => setCitasFilter(f.id)}
            className={cn("px-4 py-2 text-xs font-medium transition-colors",
              citasFilter === f.id ? "bg-brand-purple/10 text-brand-purple" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            )}>
            {f.label} <span className="ml-1 text-[10px]">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">No hay citas {citasFilter !== "todas" ? `${citasFilter}` : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row, i) => {
            const fecha = getCitaDate(row);
            const hora = getCitaHora(row);
            const nombre = getCitaNombre(row);
            const tipo = getCitaTipo(row);
            const estado = getCitaEstado(row);
            const telefono = getCitaTelefono(row);
            const notas = getCitaNotas(row);
            const isPast = fecha < today;
            const isToday = fecha === today;
            const timeLabel = getTimeLabel(fecha);

            return (
              <div key={row.id || i} className={cn(
                "card flex items-center gap-4 transition-all",
                isPast && "opacity-50",
                isToday && "border-brand-purple/30 bg-brand-purple/5"
              )}>
                {/* Time block */}
                <div className={cn("flex-shrink-0 w-16 text-center p-2 rounded-lg", isToday ? "bg-brand-purple/10" : "bg-[var(--muted)]")}>
                  <p className={cn("text-lg font-bold", isToday && "text-brand-purple")}>{hora || "—"}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{nombre || "Sin nombre"}</span>
                    {timeLabel && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        isToday ? "bg-brand-purple/10 text-brand-purple" : isPast ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : "bg-brand-cyan/10 text-brand-cyan"
                      )}>{timeLabel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    {tipo && <span>📋 {tipo}</span>}
                    {telefono && <span>📞 {telefono}</span>}
                    {notas && <span className="truncate max-w-[200px]">💬 {notas}</span>}
                  </div>
                </div>

                {/* Estado */}
                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium border flex-shrink-0", getStatusColor(estado))}>
                  {estado || "—"}
                </span>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {permiteEditar && (
                    <button onClick={() => onEdit(row)} className="p-1.5 rounded hover:bg-brand-cyan/10 text-[var(--muted-foreground)] hover:text-brand-cyan">
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {permiteEliminar && (
                    <button onClick={() => onDelete(row.id)} disabled={deleting === row.id}
                      className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger">
                      {deleting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
