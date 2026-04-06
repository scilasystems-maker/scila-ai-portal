"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/shared/Header";
import {
  Search, Loader2, ChevronLeft, ChevronRight, Edit, Trash2,
  Plus, X, ArrowUpDown, Eye, AlertCircle, RefreshCw
} from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

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

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as string;

  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        module_id: moduleId,
        page: page.toString(),
        limit: "25",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/portal/data?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [moduleId, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) return;
    setDeleting(recordId);
    try {
      const res = await fetch(`/api/portal/data?module_id=${moduleId}&record_id=${recordId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Get display columns from mapeo_campos
  const getDisplayColumns = () => {
    if (!data?.modulo.mapeo_campos) return [];
    return Object.entries(data.modulo.mapeo_campos)
      .filter(([_, realCol]) => realCol) // Only mapped columns
      .map(([displayName, realCol]) => ({
        key: realCol,
        label: displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/_/g, " "),
      }));
  };

  // Format cell value based on content
  const formatCell = (value: any, key: string): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    
    // Detect dates
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      try {
        return formatDate(value);
      } catch {
        return value;
      }
    }
    
    // Truncate long strings
    if (typeof value === "string" && value.length > 80) {
      return value.slice(0, 80) + "...";
    }
    
    return String(value);
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (["activo", "confirmada", "completada", "ganado", "pagado"].includes(s)) return "bg-success/10 text-success";
    if (["cancelada", "perdido", "vencido", "no-show"].includes(s)) return "bg-danger/10 text-danger";
    if (["pendiente", "nuevo", "trial"].includes(s)) return "bg-warning/10 text-warning";
    if (["contactado", "cualificado", "en proceso"].includes(s)) return "bg-brand-cyan/10 text-brand-cyan";
    return "bg-[var(--muted)] text-[var(--muted-foreground)]";
  };

  const columns = getDisplayColumns();

  return (
    <>
      <Header
        title={data?.modulo.nombre_display || "Cargando..."}
        subtitle={data ? `${data.total} registros` : ""}
      />

      <div className="p-4 lg:p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Buscar..."
              className="input-field pl-9 pr-20"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1.5 text-xs">
              Buscar
            </button>
          </form>

          <button onClick={fetchData} className="btn-ghost p-2.5" title="Refrescar">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          {data?.modulo.permite_crear && (
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          </div>
        )}

        {/* Data Table */}
        {data && (
          <>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {columns.map(col => (
                        <th
                          key={col.key}
                          className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                      {(data.modulo.permite_editar || data.modulo.permite_eliminar) && (
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-24">
                          Acciones
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="text-center py-12 text-[var(--muted-foreground)]">
                          {search ? "Sin resultados para esta búsqueda" : "No hay datos todavía"}
                        </td>
                      </tr>
                    ) : (
                      data.data.map((row, i) => (
                        <tr
                          key={row.id || i}
                          className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedRow(selectedRow?.id === row.id ? null : row)}
                        >
                          {columns.map(col => {
                            const value = row[col.key];
                            const isStatus = col.label.toLowerCase().includes("estado") || col.label.toLowerCase().includes("status");
                            return (
                              <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                                {isStatus ? (
                                  <span className={cn("text-xs px-2 py-1 rounded-full font-medium", getStatusColor(value))}>
                                    {value || "—"}
                                  </span>
                                ) : (
                                  <span className="text-sm">{formatCell(value, col.key)}</span>
                                )}
                              </td>
                            );
                          })}
                          {(data.modulo.permite_editar || data.modulo.permite_eliminar) && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedRow(row); }}
                                  className="p-1.5 rounded hover:bg-brand-purple/10 text-[var(--muted-foreground)] hover:text-brand-purple transition-colors"
                                  title="Ver detalle"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {data.modulo.permite_eliminar && (
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
                                    disabled={deleting === row.id}
                                    className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger transition-colors"
                                    title="Eliminar"
                                  >
                                    {deleting === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Mostrando {((page - 1) * data.limit) + 1}-{Math.min(page * data.limit, data.total)} de {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">
                    {page} / {data.total_pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                    disabled={page === data.total_pages}
                    className="btn-ghost p-2 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detail Drawer */}
        {selectedRow && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedRow(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[var(--card)] border-l border-[var(--border)] z-50 overflow-y-auto animate-slide-in-left">
              <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold">Detalle del registro</h3>
                <button onClick={() => setSelectedRow(null)} className="btn-ghost p-2">
                  <X className="w-5 h-5" />
                </button>
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
      </div>
    </>
  );
}
