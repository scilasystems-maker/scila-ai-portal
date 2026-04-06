"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  MessageSquare, Calendar, Users, Clock, DollarSign, Zap,
  TrendingUp, ArrowUpRight, Loader2, BarChart3
} from "lucide-react";
import Link from "next/link";

interface PortalConfig {
  user: any;
  client: any;
  modules: any[];
}

interface ModuleStats {
  module_id: string;
  nombre: string;
  tipo: string;
  total: number;
  href: string;
}

export default function PortalDashboard() {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [stats, setStats] = useState<ModuleStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Load config
      const configRes = await fetch("/api/portal/config");
      if (!configRes.ok) return;
      const configData = await configRes.json();
      setConfig(configData);

      // Load stats for each module
      if (configData.modules?.length > 0) {
        const statsPromises = configData.modules.map(async (mod: any) => {
          try {
            const res = await fetch(`/api/portal/data?module_id=${mod.id}&limit=1`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              module_id: mod.id,
              nombre: mod.nombre_display,
              tipo: mod.tipo,
              total: data.total || 0,
              href: mod.tipo === "conversaciones" ? "/portal/conversations" : `/portal/modules/${mod.id}`,
            };
          } catch {
            return null;
          }
        });

        const results = (await Promise.all(statsPromises)).filter(Boolean) as ModuleStats[];
        setStats(results);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate savings
  const conversationStats = stats.find(s => s.tipo === "conversaciones");
  const totalConversations = conversationStats?.total || 0;
  const minutesPerConv = config?.client?.minutos_por_conv || 5;
  const costPerHour = config?.client?.coste_hora || 15;
  const hoursAhorradas = (totalConversations * minutesPerConv) / 60;
  const costeAhorrado = hoursAhorradas * costPerHour;

  const getModuleIcon = (tipo: string) => {
    switch (tipo) {
      case "leads": return { icon: Users, color: "text-brand-purple", bg: "bg-brand-purple/10" };
      case "citas": return { icon: Calendar, color: "text-brand-cyan", bg: "bg-brand-cyan/10" };
      case "conversaciones": return { icon: MessageSquare, color: "text-success", bg: "bg-success/10" };
      default: return { icon: BarChart3, color: "text-warning", bg: "bg-warning/10" };
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Cargando..." />
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
        {/* Welcome */}
        <div className="card relative overflow-hidden">
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

        {/* Module KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => {
            const { icon: Icon, color, bg } = getModuleIcon(stat.tipo);
            return (
              <Link
                key={stat.module_id}
                href={stat.href}
                className="card group hover:shadow-lg transition-all hover:border-brand-purple/30"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-lg ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-2xl font-bold">{stat.total.toLocaleString()}</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{stat.nombre}</p>
              </Link>
            );
          })}

          {/* Hours saved */}
          {totalConversations > 0 && (
            <>
              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-success/10">
                    <Clock className="w-5 h-5 text-success" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{hoursAhorradas.toFixed(1)}h</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Horas Ahorradas</p>
              </div>

              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-warning/10">
                    <DollarSign className="w-5 h-5 text-warning" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{costeAhorrado.toFixed(0)}€</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Coste Ahorrado</p>
              </div>
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
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Calculado a {minutesPerConv} min/conversación y {costPerHour}€/hora. Puedes ajustar estos valores en tu perfil.
              </p>
            </div>
          </div>
        )}

        {/* Quick links to modules */}
        {stats.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Acceso rápido</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.map(stat => {
                const { icon: Icon, color, bg } = getModuleIcon(stat.tipo);
                return (
                  <Link
                    key={stat.module_id}
                    href={stat.href}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all group"
                  >
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stat.nombre}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{stat.total} registros</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--muted-foreground)] ml-auto" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state if no modules */}
        {stats.length === 0 && !loading && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-brand-purple" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sin módulos configurados</h3>
            <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
              El administrador aún no ha configurado los módulos de tu portal.
              Contacta con SCILA AI para activarlos.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
