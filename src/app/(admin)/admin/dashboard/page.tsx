"use client";

import { Header } from "@/components/shared/Header";
import {
  Users, MessageSquare, Calendar, TrendingUp, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";

const kpiData = [
  {
    label: "Clientes Activos",
    value: "0",
    change: null,
    icon: Users,
    color: "text-brand-purple",
    bgColor: "bg-brand-purple/10",
  },
  {
    label: "Total Conversaciones",
    value: "0",
    change: null,
    icon: MessageSquare,
    color: "text-brand-cyan",
    bgColor: "bg-brand-cyan/10",
  },
  {
    label: "Citas Este Mes",
    value: "0",
    change: null,
    icon: Calendar,
    color: "text-brand-blue",
    bgColor: "bg-brand-blue/10",
  },
  {
    label: "Leads Totales",
    value: "0",
    change: null,
    icon: TrendingUp,
    color: "text-success",
    bgColor: "bg-success/10",
  },
];

export default function AdminDashboard() {
  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Vista general de todos los clientes"
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Welcome banner */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h2 className="text-xl font-bold mb-1">
              Bienvenido, <span className="gradient-text">Admin</span>
            </h2>
            <p className="text-[var(--muted-foreground)] text-sm">
              Aquí tienes un resumen de la actividad de todos tus clientes.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card group hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  {kpi.change !== null && (
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${
                      (kpi.change as number) >= 0 ? "text-success" : "text-danger"
                    }`}>
                      {(kpi.change as number) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(kpi.change as number)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        {/* Placeholder sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-brand-purple" />
              <h3 className="font-semibold">Actividad Reciente</h3>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Aquí aparecerá la actividad de tus clientes
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Crea tu primer cliente para empezar
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card">
            <h3 className="font-semibold mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <a
                href="/admin/clients/new"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all group"
              >
                <div className="p-2 rounded-lg bg-brand-purple/10 group-hover:bg-brand-purple/20 transition-colors">
                  <Users className="w-5 h-5 text-brand-purple" />
                </div>
                <div>
                  <p className="font-medium text-sm">Crear nuevo cliente</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Conecta un nuevo Supabase y configura módulos
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] ml-auto" />
              </a>

              <a
                href="/admin/clients"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-cyan/50 hover:bg-brand-cyan/5 transition-all group"
              >
                <div className="p-2 rounded-lg bg-brand-cyan/10 group-hover:bg-brand-cyan/20 transition-colors">
                  <MessageSquare className="w-5 h-5 text-brand-cyan" />
                </div>
                <div>
                  <p className="font-medium text-sm">Ver clientes</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Gestiona y monitoriza todos tus clientes
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] ml-auto" />
              </a>

              <a
                href="/admin/billing"
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-warning/50 hover:bg-warning/5 transition-all group"
              >
                <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-sm">Facturación</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Revisa facturas y estado de pagos
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] ml-auto" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
