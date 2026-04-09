"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  Users, MessageSquare, Calendar, TrendingUp, Activity,
  ArrowUpRight, CreditCard, Loader2, Database, CheckCircle,
  Clock, XCircle, Plus
} from "lucide-react";
import Link from "next/link";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";

interface AdminStats {
  totalClients: number;
  activeClients: number;
  totalFacturado: number;
  pendiente: number;
  clients: any[];
  recentBilling: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [clientsRes, billingRes] = await Promise.all([
        fetch("/api/admin/clients"),
        fetch("/api/admin/billing"),
      ]);

      const clients = await clientsRes.json();
      const billing = await billingRes.json();

      const clientList = Array.isArray(clients) ? clients : [];

      setStats({
        totalClients: clientList.length,
        activeClients: clientList.filter((c: any) => c.estado === "activo").length,
        totalFacturado: billing.resumen?.pagado || 0,
        pendiente: billing.resumen?.pendiente || 0,
        clients: clientList,
        recentBilling: (billing.facturas || []).slice(0, 5),
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Vista general" />
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
      </>
    );
  }

  const s = stats!;

  return (
    <>
      <Header title="Dashboard" subtitle="Vista general de todos los clientes" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Welcome */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h2 className="text-xl font-bold mb-1">
              Bienvenido, <span className="gradient-text">Admin</span>
            </h2>
            <p className="text-[var(--muted-foreground)] text-sm">
              Gestiona tus clientes y monitoriza todos los agentes de IA desde aquí.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-brand-purple/10"><Users className="w-5 h-5 text-brand-purple" /></div>
            </div>
            <p className="text-2xl font-bold">{s.totalClients}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Clientes totales</p>
          </div>
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-success/10"><CheckCircle className="w-5 h-5 text-success" /></div>
            </div>
            <p className="text-2xl font-bold text-success">{s.activeClients}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Clientes activos</p>
          </div>
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-warning/10"><CreditCard className="w-5 h-5 text-warning" /></div>
            </div>
            <p className="text-2xl font-bold">{s.totalFacturado.toFixed(0)}€</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Total cobrado</p>
          </div>
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-danger/10"><Clock className="w-5 h-5 text-danger" /></div>
            </div>
            <p className="text-2xl font-bold text-danger">{s.pendiente.toFixed(0)}€</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Pendiente de cobro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clients list */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-purple" />
                Clientes recientes
              </h3>
              <Link href="/admin/clients" className="text-xs text-brand-purple hover:text-brand-purple-light">Ver todos →</Link>
            </div>
            {s.clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--muted-foreground)] mb-3">Sin clientes todavía</p>
                <Link href="/admin/clients/new" className="btn-primary text-xs"><Plus className="w-3 h-3 mr-1 inline" />Crear cliente</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {s.clients.slice(0, 5).map((client: any) => (
                  <Link key={client.id} href={`/admin/clients/${client.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)]/50 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-purple">{getInitials(client.empresa || client.nombre)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{client.empresa || client.nombre || client.email}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          client.estado === "activo" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        )}>{client.estado}</span>
                        <span>{client.has_credentials ? "Conectado" : "Sin conexión"}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent billing */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-warning" />
                Últimas facturas
              </h3>
              <Link href="/admin/billing" className="text-xs text-brand-purple hover:text-brand-purple-light">Ver todas →</Link>
            </div>
            {s.recentBilling.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--muted-foreground)] mb-3">Sin facturas todavía</p>
                <Link href="/admin/billing" className="btn-primary text-xs"><Plus className="w-3 h-3 mr-1 inline" />Nueva factura</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {s.recentBilling.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--muted)]/50">
                    <div>
                      <p className="text-sm font-medium">{f.concepto}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{f.portal_clientes?.empresa || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{f.importe}€</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        f.estado === "pagado" ? "bg-success/10 text-success" :
                        f.estado === "vencido" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      )}>{f.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h3 className="font-semibold mb-4">Acciones rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/admin/clients/new" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all group">
              <div className="p-2 rounded-lg bg-brand-purple/10"><Users className="w-5 h-5 text-brand-purple" /></div>
              <div><p className="font-medium text-sm">Nuevo cliente</p><p className="text-xs text-[var(--muted-foreground)]">Conectar Supabase y configurar</p></div>
            </Link>
            <Link href="/admin/billing" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-warning/50 hover:bg-warning/5 transition-all group">
              <div className="p-2 rounded-lg bg-warning/10"><CreditCard className="w-5 h-5 text-warning" /></div>
              <div><p className="font-medium text-sm">Facturación</p><p className="text-xs text-[var(--muted-foreground)]">Registrar cobros y facturas</p></div>
            </Link>
            <Link href="/admin/audit" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-cyan/50 hover:bg-brand-cyan/5 transition-all group">
              <div className="p-2 rounded-lg bg-brand-cyan/10"><Activity className="w-5 h-5 text-brand-cyan" /></div>
              <div><p className="font-medium text-sm">Auditoría</p><p className="text-xs text-[var(--muted-foreground)]">Ver actividad del sistema</p></div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
