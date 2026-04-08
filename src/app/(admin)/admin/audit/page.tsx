"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  ShieldCheck, Loader2, Search, ChevronLeft, ChevronRight,
  LogIn, LogOut, Plus, Trash2, Edit, Eye, Download, Filter
} from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  usuario_id: string | null;
  cliente_id: string | null;
  accion: string;
  recurso: string | null;
  detalles: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  portal_usuarios: { nombre: string; email: string } | null;
}

const ACTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  login: { icon: LogIn, color: "text-success", label: "Inicio de sesión" },
  logout: { icon: LogOut, color: "text-[var(--muted-foreground)]", label: "Cierre de sesión" },
  create: { icon: Plus, color: "text-brand-purple", label: "Crear" },
  update: { icon: Edit, color: "text-brand-cyan", label: "Editar" },
  delete: { icon: Trash2, color: "text-danger", label: "Eliminar" },
  view: { icon: Eye, color: "text-brand-blue", label: "Ver" },
  export: { icon: Download, color: "text-warning", label: "Exportar" },
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAccion, setFilterAccion] = useState("");

  useEffect(() => { loadLogs(); }, [page, filterAccion]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "30" });
      if (filterAccion) params.set("accion", filterAccion);

      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getActionInfo = (accion: string) => {
    return ACTION_CONFIG[accion] || { icon: Eye, color: "text-[var(--muted-foreground)]", label: accion };
  };

  return (
    <>
      <Header title="Auditoría" subtitle={`${total} registros de actividad`} />

      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
            <select className="input-field w-auto" value={filterAccion} onChange={e => { setFilterAccion(e.target.value); setPage(1); }}>
              <option value="">Todas las acciones</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Crear</option>
              <option value="update">Editar</option>
              <option value="delete">Eliminar</option>
              <option value="export">Exportar</option>
            </select>
          </div>
        </div>

        {/* Logs */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-12">
            <ShieldCheck className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Sin registros de auditoría</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Las acciones de los usuarios se registrarán automáticamente aquí
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const info = getActionInfo(log.accion);
              const Icon = info.icon;
              return (
                <div key={log.id} className="card flex items-center gap-4 p-3">
                  <div className={cn("p-2 rounded-lg bg-[var(--muted)]")}>
                    <Icon className={cn("w-4 h-4", info.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{info.label}</span>
                      {log.recurso && <span className="text-xs text-[var(--muted-foreground)]">· {log.recurso}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span>{log.portal_usuarios?.nombre || log.portal_usuarios?.email || "Sistema"}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                      <span>{formatDate(log.created_at)} {formatTime(log.created_at)}</span>
                    </div>
                  </div>
                  {log.detalles && Object.keys(log.detalles).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Detalles</summary>
                      <pre className="mt-1 p-2 bg-[var(--muted)] rounded text-[10px] max-w-xs overflow-auto">
                        {JSON.stringify(log.detalles, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">{total} registros</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost p-2 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
