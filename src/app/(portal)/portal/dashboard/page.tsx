"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import { DailyChart, StatusDonut, RolesBar, ActivityHeatmap, KPICard } from "@/components/charts/Charts";
import {
  MessageSquare, Calendar, Users, Clock, DollarSign, Zap,
  TrendingUp, ArrowUpRight, Loader2, BarChart3, Timer, Bot
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MetricsData {
  period: number;
  coste_hora: number;
  minutos_por_conv: number;
  modules: Record<string, ModuleMetrics>;
}

interface ModuleMetrics {
  id: string;
  tipo: string;
  nombre: string;
  total: number;
  current_period: number;
  prev_period: number;
  change: number | null;
  daily: { date: string; label: string; count: number }[];
  status_distribution: { name: string; value: number }[];
  hourly_heatmap: { hour: number; day: number; count: number }[];
  roles_distribution: { name: string; value: number }[];
  avg_response_time: number;
}

const PERIODS = [
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
  { value: 365, label: "1 año" },
];

export default function PortalDashboard() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load config
      const configRes = await fetch("/api/portal/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      // Load metrics
      const metricsRes = await fetch(`/api/portal/metrics?period=${period}`);
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (tipo: string) => {
    switch (tipo) {
      case "leads": return { icon: <Users className="w-5 h-5 text-brand-purple" />, color: "text-brand-purple", bg: "bg-brand-purple/10" };
      case "citas": return { icon: <Calendar className="w-5 h-5 text-brand-cyan" />, color: "text-brand-cyan", bg: "bg-brand-cyan/10" };
      case "conversaciones": return { icon: <MessageSquare className="w-5 h-5 text-success" />, color: "text-success", bg: "bg-success/10" };
      default: return { icon: <BarChart3 className="w-5 h-5 text-warning" />, color: "text-warning", bg: "bg-warning/10" };
    }
  };

  // Calculate totals
  const allModules = metrics ? Object.values(metrics.modules) : [];
  const convModule = allModules.find(m => m.tipo === "conversaciones");
  const totalConversations = convModule?.total || 0;
  const minutesPerConv = metrics?.minutos_por_conv || 5;
  const costPerHour = metrics?.coste_hora || 15;
  const hoursAhorradas = (totalConversations * minutesPerConv) / 60;
  const costeAhorrado = hoursAhorradas * costPerHour;
  const avgResponse = convModule?.avg_response_time || 0;

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Cargando métricas..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" subtitle="Resumen de tu actividad" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Welcome + Period selector */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="card relative overflow-hidden flex-1 min-w-[280px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-purple/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  Bienvenido, <span className="gradient-text">{config?.user?.nombre || config?.client?.empresa || "Cliente"}</span>
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Tu agente IA está respondiendo automáticamente 24/7
                </p>
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-2 text-xs font-medium transition-colors",
                  period === p.value
                    ? "bg-brand-purple/10 text-brand-purple"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {allModules.map(mod => {
            const { icon, bg } = getModuleIcon(mod.tipo);
            return (
              <KPICard
                key={mod.id}
                label={mod.nombre}
                value={mod.total}
                change={mod.change}
                icon={icon}
                color=""
                bgColor={bg}
              />
            );
          })}

          {totalConversations > 0 && (
            <>
              <KPICard
                label="Horas Ahorradas"
                value={hoursAhorradas.toFixed(1)}
                suffix="h"
                change={null}
                icon={<Clock className="w-5 h-5 text-success" />}
                color="text-success"
                bgColor="bg-success/10"
              />
              <KPICard
                label="Coste Ahorrado"
                value={costeAhorrado.toFixed(0)}
                suffix="€"
                change={null}
                icon={<DollarSign className="w-5 h-5 text-warning" />}
                color="text-warning"
                bgColor="bg-warning/10"
              />
              {avgResponse > 0 && (
                <KPICard
                  label="Respuesta Media"
                  value={avgResponse}
                  suffix="s"
                  change={null}
                  icon={<Timer className="w-5 h-5 text-brand-cyan" />}
                  color="text-brand-cyan"
                  bgColor="bg-brand-cyan/10"
                />
              )}
            </>
          )}
        </div>

        {/* ROI Card */}
        {totalConversations > 0 && (
          <div className="card relative overflow-hidden border-brand-purple/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-brand-purple" />
                <h3 className="font-semibold">Retorno de inversión (ROI)</h3>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Tu agente IA ha gestionado <strong className="text-[var(--foreground)]">{totalConversations.toLocaleString()}</strong> conversaciones,
                ahorrándote <strong className="text-success">{hoursAhorradas.toFixed(1)} horas</strong> de trabajo
                equivalentes a <strong className="text-warning">{costeAhorrado.toFixed(0)}€</strong>.
                {avgResponse > 0 && (
                  <> Tiempo medio de respuesta: <strong className="text-brand-cyan">{avgResponse}s</strong>.</>
                )}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Calculado a {minutesPerConv} min/conversación y {costPerHour}€/hora.
              </p>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily chart for each module */}
          {allModules.map(mod => (
            <div key={`daily-${mod.id}`} className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">{mod.nombre} por día</h3>
                <span className="text-xs text-[var(--muted-foreground)]">Últimos {period} días</span>
              </div>
              <DailyChart
                data={mod.daily || []}
                color={mod.tipo === "conversaciones" ? "#22C55E" : mod.tipo === "citas" ? "#06B6D4" : "#8B5CF6"}
                label={mod.nombre}
              />
            </div>
          ))}

          {/* Status distribution for modules that have it */}
          {allModules.filter(m => m.status_distribution?.length > 0).map(mod => (
            <div key={`status-${mod.id}`} className="card">
              <h3 className="font-semibold text-sm mb-4">{mod.nombre} por estado</h3>
              <StatusDonut data={mod.status_distribution} />
            </div>
          ))}

          {/* Roles distribution (agent vs client) */}
          {allModules.filter(m => m.roles_distribution?.length > 0).map(mod => (
            <div key={`roles-${mod.id}`} className="card">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-brand-cyan" />
                <h3 className="font-semibold text-sm">Mensajes: Agente vs Cliente</h3>
              </div>
              <RolesBar data={mod.roles_distribution} />
            </div>
          ))}

          {/* Activity Heatmap */}
          {allModules.filter(m => m.hourly_heatmap?.length > 0).map(mod => (
            <div key={`heatmap-${mod.id}`} className="card lg:col-span-2">
              <h3 className="font-semibold text-sm mb-4">Horario de actividad</h3>
              <ActivityHeatmap data={mod.hourly_heatmap} />
            </div>
          ))}
        </div>

        {/* Quick links */}
        {allModules.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Acceso rápido</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allModules.map(mod => {
                const { icon, bg } = getModuleIcon(mod.tipo);
                const href = mod.tipo === "conversaciones" ? "/portal/conversations" : `/portal/modules/${mod.id}`;
                return (
                  <Link key={mod.id} href={href}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all group">
                    <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
                    <div>
                      <p className="font-medium text-sm">{mod.nombre}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{mod.total} registros</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] ml-auto" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allModules.length === 0 && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-brand-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sin módulos configurados</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Contacta con el administrador para activar los módulos de tu portal.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
