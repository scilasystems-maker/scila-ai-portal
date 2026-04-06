"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import { Users, Plus, Search, MoreVertical, Trash2, Edit, Eye, Loader2, Database, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn, formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

interface Client {
  id: string;
  email: string;
  nombre: string | null;
  empresa: string | null;
  plan: string;
  estado: string;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente? Se borrarán todos sus datos y módulos.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/clients?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
    }
  };

  const filtered = clients.filter(c => {
    const matchSearch = !search || 
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.empresa?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !filterEstado || c.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoColor = (estado: string) => {
    switch (estado) {
      case "activo": return "bg-success/10 text-success";
      case "suspendido": return "bg-danger/10 text-danger";
      case "trial": return "bg-warning/10 text-warning";
      default: return "bg-[var(--muted)] text-[var(--muted-foreground)]";
    }
  };

  const planColor = (plan: string) => {
    switch (plan) {
      case "enterprise": return "bg-brand-purple/10 text-brand-purple";
      case "pro": return "bg-brand-cyan/10 text-brand-cyan";
      default: return "bg-[var(--muted)] text-[var(--muted-foreground)]";
    }
  };

  return (
    <>
      <Header title="Clientes" subtitle={`${clients.length} clientes registrados`}>
        <Link href="/admin/clients/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Cliente</span>
        </Link>
      </Header>

      <div className="p-4 lg:p-6">
        {/* Search & filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa o email..."
              className="input-field pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field w-auto"
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="trial">Trial</option>
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-brand-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {clients.length === 0 ? "Sin clientes todavía" : "Sin resultados"}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm">
              {clients.length === 0
                ? "Crea tu primer cliente para conectar su Supabase y configurar módulos."
                : "No se encontraron clientes con esos filtros."}
            </p>
            {clients.length === 0 && (
              <Link href="/admin/clients/new" className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crear primer cliente
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(client => (
              <div
                key={client.id}
                className="card hover:shadow-lg transition-shadow flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-purple">
                    {getInitials(client.nombre || client.empresa || client.email)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">
                      {client.empresa || client.nombre || client.email}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", estadoColor(client.estado))}>
                      {client.estado}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", planColor(client.plan))}>
                      {client.plan}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{client.email}</span>
                    {client.has_credentials && (
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        Conectado
                      </span>
                    )}
                    <span>Creado {formatRelativeTime(client.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                    className="btn-ghost p-2"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOpen === client.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors"
                          onClick={() => setMenuOpen(null)}
                        >
                          <Eye className="w-4 h-4" />
                          Ver detalle
                        </Link>
                        <button
                          onClick={() => deleteClient(client.id)}
                          disabled={deletingId === client.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors w-full"
                        >
                          {deletingId === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
